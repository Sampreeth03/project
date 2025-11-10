// controllers/recruiterController.js

const mongoose = require("mongoose");
const path = require("path");
const fs = require('fs');
// Import ALL models (necessary for functional integrity)
const { User, UserMetrics, Doubt, Reply, JobApplication, Project, ProjectMember, JoinRequest, Task, Notification } = require("../database"); 
const { getTimeAgo } = require("../services/helperService");

// =========================================================================
// Helper: Recruiter Navigation Data
// =========================================================================
const getRecruiterNav = () => ({
    homeUrl: "/recruiter-home",
    navLinks: [
        { name: "Home", href: "/recruiter-home" },
        {
            name: "Applications",
            href: "/rec-app",
            submenu: [
                { name: "Applications", href: "/rec-app" },
                { name: "Notifications", href: "/rec-not" }
            ]
        },
        {
            name: "Profile",
            href: "/recruiter-dashboard",
            submenu: [
                { name: "Dashboard", href: "/recruiter-dashboard" }
            ]
        },
    ]
});

// =========================================================================
// 1. Recruiter Home Page (GET /recruiter-home)
// =========================================================================
exports.getRecruiterHome = (req, res) => {
    res.render("recruiter-home", { user: req.session.user, ...getRecruiterNav() });
};

// =========================================================================
// 2. Recruiter Job Creation/Management Page (GET /rec-job)
// =========================================================================
exports.getRecruiterJobs = async (req, res) => {
    const recruiterId = req.session.user.id;
    const navData = getRecruiterNav(); 

    try {
        const totalJobs = await JobApplication.countDocuments({ posted_by: recruiterId, user_id: null });
        const totalParticipants = await JobApplication.countDocuments({ posted_by: recruiterId, user_id: { $ne: null } });
        const activeJobs = await JobApplication.countDocuments({ posted_by: recruiterId, active: 1, user_id: null });
        const postedJobs = await JobApplication.find({ posted_by: recruiterId, user_id: null }).lean();

        res.render("rec-jobs", {
            user: req.session.user,
            homeUrl: navData.homeUrl,
            navLinks: navData.navLinks,
            totalJobs: totalJobs || 0,
            totalParticipants: totalParticipants || 0,
            activeJobs: activeJobs || 0,
            postedJobs: postedJobs || []
        });
    } catch (err) {
        console.error('Error in /rec-job route:', err.message);
        res.redirect("/login"); 
    }
};

// =========================================================================
// 3. Recruiter Dashboard Page (GET /recruiter-dashboard)
// =========================================================================
exports.getRecruiterDashboard = async (req, res) => {
    const recruiterId = req.session.user.id;
    const recruiterNav = getRecruiterNav();

    try {
        const jobCount = await JobApplication.countDocuments({ posted_by: recruiterId, user_id: null });
        const participantCount = await JobApplication.countDocuments({ posted_by: recruiterId, user_id: { $ne: null } });

        res.render("recruiter-dashboard", {
            user: req.session.user,
            ...recruiterNav,
            totalJobs: jobCount || 0,
            totalParticipants: participantCount || 0
        });
    } catch (err) {
        console.error("Error in recruiter dashboard:", err.message);
        res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
};

// =========================================================================
// 4. Recruiter Applications Page (GET /rec-app)
// =========================================================================
exports.getRecruiterApplications = async (req, res) => {
    const recruiterId = req.session.user.id;
    
    try {
        const applications = await JobApplication.find({
            posted_by: recruiterId,
            user_id: { $ne: null }
        }).populate('user_id', 'name').lean();

        const formattedApplications = applications.map(app => {
            const timeAgo = getTimeAgo(app.createdAt);
            const statusLower = app.status.toLowerCase() === 'waiting' ? 'pending' : app.status.toLowerCase();
            return {
                id: app._id.toString(),
                type: 'applications',
                title: 'New Job Application',
                content: `${app.user_id.name} has applied for your "${app.job_title}" position. Skills: ${app.skills}`,
                time: timeAgo,
                unread: app.status === 'Waiting',
                badge: 'Application',
                status: statusLower,
                applicantName: app.user_id.name,
                resumeId: app._id.toString(),
                jobTitle: app.job_title
            };
        });

        const recruiterNav = getRecruiterNav();

        res.render('rec-app', {
            user: req.session.user,
            homeUrl: recruiterNav.homeUrl,
            navLinks: recruiterNav.navLinks,
            applications: formattedApplications
        });
    } catch (err) {
        console.error('Error in /rec-app route:', err.message);
        res.redirect('/recruiter-home?error=Failed to load applications');
    }
};

// =========================================================================
// 5. Recruiter Notifications Page (GET /rec-not)
// =========================================================================
exports.getRecruiterNotifications = async (req, res) => {
    const recruiterId = req.session.user.id;
    try {
        const notifications = await Notification.find({ user_id: recruiterId }).sort({ createdAt: -1 }).lean();
        const recruiterNav = getRecruiterNav(); 
        res.render('rec-not', { user: req.session.user, ...recruiterNav, notifications });
    } catch (err) {
        console.error('Error in /rec-not route:', err.message);
        res.redirect('/recruiter-home?error=Failed to load notifications');
    }
};

// =========================================================================
// 6. View Resume (GET /view-resume/:id) - FIX APPLIED HERE
// =========================================================================
exports.viewResume = async (req, res) => {
    const applicationId = req.params.id;
    const recruiterId = req.session.user.id;

    try {
        const application = await JobApplication.findOne({ _id: applicationId, posted_by: recruiterId, user_id: { $ne: null } });
        if (!application || (!application.resume_path && !application.resumeUrl)) {
            return res.status(404).send('Application or Resume not found');
        }
        
        const rawPath = application.resume_path || application.resumeUrl;
        
        // --- FIX: Use the rawPath directly, assuming Multer saved the complete absolute path. ---
        const actualFilePath = rawPath; 

        if (!fs.existsSync(actualFilePath)) {
            console.error(`Attempted Path (Final Check - Direct DB Path): ${actualFilePath} - File not found.`);
            return res.status(404).send('Resume file not found on server');
        }

        const fileExtension = path.extname(actualFilePath).slice(1).toLowerCase();
        const mimeTypes = { pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
        const contentType = mimeTypes[fileExtension] || 'application/octet-stream';

        res.set('Content-Type', contentType);
        res.set('Content-Disposition', `inline; filename="resume-${applicationId}.${fileExtension}"`);
        fs.createReadStream(actualFilePath).pipe(res); 
    } catch (err) {
        console.error('Error serving resume:', err.message);
        res.status(500).send('Error serving resume');
    }
};

// =========================================================================
// 7. Update Application Status (PATCH/POST /update-application-status)
// =========================================================================
exports.updateApplicationStatus = async (req, res) => {
    const applicationId = req.params.id || req.body.applicationId;
    const recruiterId = req.session.user.id;
    const status = req.params.id ? req.body.status : (req.body.statusLc === 'approved' ? 'Approved' : (req.body.statusLc === 'rejected' ? 'Rejected' : req.body.status));
    
    if (!['Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    try {
        const application = await JobApplication.findOne({ _id: applicationId, posted_by: recruiterId, user_id: { $ne: null } });
        if (!application) return res.status(404).json({ success: false, error: 'Application not found' });

        if (status === 'Rejected') {
            await JobApplication.deleteOne({ _id: applicationId });
            await Notification.create({ user_id: application.user_id, message: `Your application for "${application.job_title}" was rejected.`, type: 'job_rejected', is_read: false });
            res.json({ success: true });
        } else {
            application.status = status;
            await application.save();
            
            const recruiter = await User.findById(recruiterId).select('email name').lean();
            await Notification.create({
                user_id: application.user_id,
                message: `You got hired for "${application.job_title}". Recruiter email: ${recruiter?.email || 'N/A'}.`,
                type: 'job_hired',
                is_read: false
            });
            res.json({ success: true });
        }
    } catch (err) {
        console.error('Error updating application status:', err.message);
        res.status(500).json({ success: false, error: 'Database error' });
    }
};

// =========================================================================
// 8. Create Recruiter Job (POST /create-recruiter-job)
// =========================================================================
exports.createRecruiterJob = async (req, res) => {
    const { jobTitle, description, salaryRange, skills } = req.body;
    const recruiterId = req.session.user.id;
    const companyName = req.session.user.name;

    try {
        const jobDoc = await JobApplication.create({
            posted_by: recruiterId, job_title: jobTitle, company_name: companyName, salary_range: salaryRange, description, skills, active: 1
        });
        
        const createdAt = new Date();
        await Notification.create({
            user_id: recruiterId,
            message: `You created a job "${jobTitle}" on ${createdAt.toLocaleDateString()}.`,
            type: 'job_created',
            is_read: false
        });
        res.json({ success: true });
    } catch (err) {
        console.error("Error creating job:", err.message);
        res.status(500).json({ success: false, error: "Database error" });
    }
};

// =========================================================================
// 9. Delete Recruiter Job (DELETE /delete-recruiter-job/:id)
// =========================================================================
exports.deleteRecruiterJob = async (req, res) => {
    const jobId = req.params.id;
    const recruiterId = req.session.user.id;

    try {
        const job = await JobApplication.findOne({ _id: jobId, posted_by: recruiterId }).lean();
        const result = await JobApplication.deleteOne({ _id: jobId, posted_by: recruiterId });
        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, error: "Job not found or not authorized to delete" });
        }
        
        const deletedAt = new Date();
        const title = job?.job_title || 'your job';
        await Notification.create({
            user_id: recruiterId,
            message: `You deleted the job "${title}" on ${deletedAt.toLocaleDateString()}.`,
            type: 'job_deleted',
            is_read: false
        });
        res.json({ success: true });
    } catch (err) {
        console.error("Error deleting job:", err.message);
        res.status(500).json({ success: false, error: "Database error" });
    }
};

// =========================================================================
// 10. Toggle Job Active Status (PATCH /toggle-job-active/:id)
// =========================================================================
exports.toggleJobActive = async (req, res) => {
    const jobId = req.params.id;
    const recruiterId = req.session.user.id;
    const { active } = req.body;
    try {
        const result = await JobApplication.updateOne({ _id: jobId, posted_by: recruiterId }, { active });
        if (result.modifiedCount === 0) {
            return res.status(404).json({ success: false, error: "Job not found or not authorized to update" });
        }
        res.json({ success: true });
    } catch (err) {
        console.error("Error toggling job active status:", err.message);
        res.status(500).json({ success: false, error: "Database error" });
    }
};