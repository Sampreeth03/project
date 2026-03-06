// controllers/jobController.js

const mongoose = require("mongoose");
const { User, UserMetrics, JobApplication, Notification } = require("../database"); 
const { getNavLinks } = require("../services/helperService");
const { navData, userNav } = require("../config/constants");

// =========================================================================
// 1. Job Listings View (GET /apply) - React & EJS Support
// =========================================================================
exports.getJobApplyPage = async (req, res) => {
    const userId = req.user.id;
    try {
        // Fetch all active listings (user_id is null/missing) excluding rejected applications
        const jobs = await JobApplication.find({
            $and: [
                { $or: [ { user_id: null }, { user_id: { $exists: false } } ] }, 
                { $or: [ { active: true }, { active: 1 } ] },
                { status: { $ne: 'Rejected' } }
            ]
        }).select('_id job_title company_name salary_range description skills custom_questions').lean();

        // --- FIX: Map _id to id for Frontend Access ---
        const formattedJobs = jobs.map(job => ({
            ...job,
            id: job._id.toString(), // Ensure the 'id' property exists for the frontend
            custom_questions: job.custom_questions || []
        }));
        console.log('[getJobApplyPage] Jobs with custom_questions:',
            formattedJobs.map(j => ({ title: j.job_title, q_count: j.custom_questions.length, questions: j.custom_questions }))
        );
        // ----------------------------------------------------

        // Check which jobs the current user has already applied for
        const userApplications = await JobApplication.find({ user_id: userId }).select('job_title company_name').lean();
        const appliedKeySet = new Set((userApplications || []).map(a => `${a.job_title}||${a.company_name}`));

        const jobsWithStatus = formattedJobs.map(job => ({ 
            ...job, 
            hasApplied: appliedKeySet.has(`${job.job_title}||${job.company_name}`) 
        }));

        // Check if request expects JSON (React) or HTML (EJS)
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.json({ jobs: jobsWithStatus });
        }

        res.render('applyjobs', {
            user: req.user,
            homeUrl: userNav.homeUrl,
            navLinks: userNav.navLinks,
            jobs: jobsWithStatus
        });
    } catch (err) {
        console.error('Error fetching jobs for /apply:', err.message);
        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(500).json({ error: 'Failed to load jobs' });
        }
        res.redirect('/home?error=Failed to load jobs');
    }
};

// =========================================================================
// 2. Submit Job Application (POST /apply-job) 
// =========================================================================
exports.applyForJob = async (req, res) => {
    const { jobId, customAnswers } = req.body;
    const userId = req.user.id;
    const resumePath = req.file?.path;
    
    // Parse custom answers if provided
    const parsedAnswers = customAnswers ? JSON.parse(customAnswers) : {}; 

    // Validation ensures jobId is present (now guaranteed by the hidden input if rendered)
    if (!jobId) {
        return res.status(400).json({ success: false, error: 'Job ID is missing from the application request.' });
    }
    
    if (!mongoose.Types.ObjectId.isValid(jobId)) {
        return res.status(400).json({ success: false, error: 'Invalid Job ID format.' });
    }

    if (!resumePath) {
        console.error('Multer file path missing. Check HTML input name="resume".');
        return res.status(400).json({ success: false, error: 'Resume is required. Check file field name or file upload error.' });
    }

    try {
        const job = await JobApplication.findById(jobId);
        if (!job || job.user_id) return res.status(404).json({ success: false, error: 'Job not found or already applied' });

        const existingApplication = await JobApplication.findOne({ user_id: userId, job_title: job.job_title, company_name: job.company_name });
        if (existingApplication) return res.status(400).json({ success: false, error: 'You have already applied for this job' });

        await JobApplication.create({
            posted_by: job.posted_by, job_title: job.job_title, company_name: job.company_name, salary_range: job.salary_range,
            description: job.description, skills: job.skills, custom_questions: job.custom_questions || [], 
            custom_answers: parsedAnswers, user_id: userId, resume_path: resumePath, active: true, date_applied: new Date()
        });

        await Notification.create({ user_id: job.posted_by, message: `New application for "${job.job_title}" from ${req.user.name}.`, type: 'job_application', is_read: false });
        await UserMetrics.findOneAndUpdate({ user_id: userId }, { $inc: { job_applications: 1 } }, { upsert: true });

        res.json({ success: true, message: 'Application submitted successfully.' });
    } catch (err) {
        console.error('Error applying for job:', err.message);
        res.status(500).json({ success: false, error: 'Database error' });
    }
};

// ... (Rest of jobController.js code follows: getStudentApplications, getJobNotifications, markNotificationRead, deleteNotification) ...

exports.getStudentApplications = async (req, res) => {
    try {
        // Check if session and user exist
        if (!req.user?.id) {
            console.error("User not found in getStudentApplications");
            return res.status(401).json({ error: 'Unauthorized: Please log in again' });
        }

        const userId = req.user.id;
        
        // Only show Waiting and Approved applications, rejected ones are removed
        const applications = await JobApplication.find({ 
            user_id: userId, 
            status: { $in: ['Waiting', 'Approved'] } 
        })
            .select('job_title company_name salary_range description skills date_applied status posted_by')
            .populate('posted_by', 'email name')
            .sort({ date_applied: -1 })
            .lean();

        const formattedApplications = applications.map(app => ({ 
            ...app,
            _id: app._id.toString(),
            recruiter_email: app.posted_by?.email || null,
            recruiter_name: app.posted_by?.name || 'Unknown',
            date_applied: app.date_applied || new Date()
        }));

        // Return JSON response (React API)
        return res.json({ applications: formattedApplications });
    } catch (err) {
        console.error("Error fetching applications:", err);
        console.error("Stack trace:", err.stack);
        return res.status(500).json({ error: 'Failed to fetch applications. Please try again.' });
    }
};

exports.getJobNotifications = async (req, res) => {
    try {
        // Check if session and user exist
        if (!req.user?.id) {
            console.error("User not found in getJobNotifications");
            return res.status(401).json({ error: 'Unauthorized: Please log in again' });
        }

        const userId = req.user.id;
        
        // Fetch all job applications by this user including rejected ones
        const applications = await JobApplication.find({ user_id: userId })
            .select('job_title company_name salary_range description skills status date_applied posted_by')
            .populate('posted_by', 'email name')
            .sort({ date_applied: -1 })
            .lean();

        // Also fetch rejection notifications
        const rejectionNotifications = await Notification.find({
            user_id: userId,
            type: 'job_rejected'
        }).sort({ createdAt: -1 }).lean();

        const jobsNotifications = applications.map(app => ({
            id: app._id.toString(),
            title: app.job_title,
            content: app.status === 'Approved' 
                ? `Congratulations! You have been shortlisted for ${app.job_title}.`
                : app.status === 'Rejected'
                ? `Your application for ${app.job_title} was not selected.`
                : `You applied for the job ${app.job_title}. Below is its job description.`,
            description: app.description,
            pay: app.salary_range,
            date: app.date_applied || app.createdAt,
            company: app.company_name,
            type: app.status === 'Approved' ? 'approved' : app.status === 'Rejected' ? 'rejected' : 'applied',
            status: app.status.toLowerCase(),
            recruiter_email: app.posted_by?.email || null,
            recruiter_name: app.posted_by?.name || null
        }));

        // Add rejection notifications for deleted applications
        const rejectionNotifs = rejectionNotifications.map(notif => {
            const titleMatch = notif.message.match(/\"([^\"]+)\"/);
            const jobTitle = titleMatch ? titleMatch[1] : 'Unknown Position';
            return {
                id: notif._id.toString(),
                title: jobTitle,
                content: `Your application for ${jobTitle} was not selected.`,
                description: 'The recruiter has decided not to move forward with your application.',
                pay: 'N/A',
                date: notif.createdAt,
                company: 'N/A',
                type: 'rejected',
                status: 'rejected',
                recruiter_email: null,
                recruiter_name: null
            };
        });

        // Merge and sort by date
        const allNotifications = [...jobsNotifications, ...rejectionNotifs].sort((a, b) => 
            new Date(b.date) - new Date(a.date)
        );

        // Return JSON response for React
        return res.json({ jobsNotifications: allNotifications });
    } catch (err) {
        console.error("Error in getJobNotifications:", err);
        console.error("Stack trace:", err.stack);
        return res.status(500).json({ error: 'Failed to fetch notifications. Please try again.' });
    }
};

exports.markNotificationRead = async (req, res) => {
    const { notificationId } = req.body;
    try {
        const result = await Notification.updateOne({ _id: notificationId }, { is_read: true });
        if (result.modifiedCount === 0) return res.json({ success: false, message: 'Notification not found' });
        res.json({ success: true });
    } catch (err) {
        console.error('Error marking notification as read:', err.message);
        res.json({ success: false, message: 'Server Error' });
    }
};

exports.deleteNotification = async (req, res) => {
    const { notificationId } = req.body;
    try {
        const result = await Notification.deleteOne({ _id: notificationId });
        if (result.deletedCount === 0) return res.json({ success: false, message: 'Notification not found' });
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting notification:', err.message);
        res.json({ success: false, message: 'Server Error' });
    }
};

exports.revokeApplication = async (req, res) => {
    try {
        if (!req.user?.id) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const { applicationId } = req.body;
        const userId = req.user.id;

        if (!applicationId || !mongoose.Types.ObjectId.isValid(applicationId)) {
            return res.status(400).json({ success: false, error: 'Invalid application ID' });
        }

        const application = await JobApplication.findOne({ _id: applicationId, user_id: userId });
        if (!application) {
            return res.status(404).json({ success: false, error: 'Application not found' });
        }
        if (application.status === 'Approved') {
            return res.status(400).json({ success: false, error: 'Cannot revoke a shortlisted application' });
        }

        await JobApplication.deleteOne({ _id: applicationId, user_id: userId });
        await UserMetrics.findOneAndUpdate({ user_id: userId }, { $inc: { job_applications: -1 } });

        return res.json({ success: true, message: 'Application revoked successfully' });
    } catch (err) {
        console.error('Error revoking application:', err);
        return res.status(500).json({ success: false, error: 'Failed to revoke application' });
    }
};