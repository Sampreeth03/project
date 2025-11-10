// controllers/jobController.js

const mongoose = require("mongoose");
const { User, UserMetrics, JobApplication, Notification } = require("../database"); 
const { getNavLinks } = require("../services/helperService");
const { navData, userNav } = require("../config/constants");

// =========================================================================
// 1. Job Listings View (GET /apply) - FIX APPLIED HERE
// =========================================================================
exports.getJobApplyPage = async (req, res) => {
    const userId = req.session.user.id;
    try {
        // Fetch all active listings (user_id is null/missing)
        const jobs = await JobApplication.find({
            $and: [{ $or: [ { user_id: null }, { user_id: { $exists: false } } ] }, { $or: [ { active: true }, { active: 1 } ] }]
        }).select('_id job_title company_name salary_range description skills').lean();

        // --- FIX: Map _id to id for EJS Template Access ---
        const formattedJobs = jobs.map(job => ({
            ...job,
            id: job._id.toString() // Ensure the 'id' property exists for the frontend
        }));
        // ----------------------------------------------------

        // Check which jobs the current user has already applied for
        const userApplications = await JobApplication.find({ user_id: userId }).select('job_title company_name').lean();
        const appliedKeySet = new Set((userApplications || []).map(a => `${a.job_title}||${a.company_name}`));

        res.render('applyjobs', {
            user: req.session.user,
            homeUrl: userNav.homeUrl,
            navLinks: userNav.navLinks,
            // Pass the formatted list with the correct 'id' property
            jobs: formattedJobs.map(job => ({ ...job, hasApplied: appliedKeySet.has(`${job.job_title}||${job.company_name}`) }))
        });
    } catch (err) {
        console.error('Error fetching jobs for /apply:', err.message);
        res.redirect('/home?error=Failed to load jobs');
    }
};

// =========================================================================
// 2. Submit Job Application (POST /apply-job) 
// =========================================================================
exports.applyForJob = async (req, res) => {
    const { jobId } = req.body;
    const userId = req.session.user.id;
    const resumePath = req.file?.path; 

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
            description: job.description, skills: job.skills, user_id: userId, resume_path: resumePath, active: true, date_applied: new Date()
        });

        await Notification.create({ user_id: job.posted_by, message: `New application for "${job.job_title}" from ${req.session.user.name}.`, type: 'job_application', is_read: false });
        await UserMetrics.findOneAndUpdate({ user_id: userId }, { $inc: { job_applications: 1 } }, { upsert: true });

        res.json({ success: true, message: 'Application submitted successfully.' });
    } catch (err) {
        console.error('Error applying for job:', err.message);
        res.status(500).json({ success: false, error: 'Database error' });
    }
};

// ... (Rest of jobController.js code follows: getStudentApplications, getJobNotifications, markNotificationRead, deleteNotification) ...

exports.getStudentApplications = async (req, res) => {
    const userId = req.session.user.id;
    try {
        const applications = await JobApplication.find({ user_id: userId, status: { $in: ['Waiting', 'Approved'] } })
            .select('job_title company_name salary_range description skills date_applied status posted_by')
            .populate('posted_by', 'email name').lean();

        res.render("job-applications", {
            user: req.session.user, homeUrl: navData.homeUrl, navLinks: navData.navLinks,
            applications: applications.map(app => ({ 
                ...app, recruiter_email: app.posted_by?.email || null, 
                date_applied: app.date_applied || new Date()
            }))
        });
    } catch (err) {
        console.error("Error fetching applications:", err.message);
        res.status(500).send("Internal Server Error");
    }
};

exports.getJobNotifications = (req, res) => {
    res.render('job_notiffinal', {
        user: req.session.user,
        navLinks: getNavLinks(req.session.user),
        homeUrl: navData.homeUrl
    });
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