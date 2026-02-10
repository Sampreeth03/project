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
    res.json({ user: req.session.user, ...getRecruiterNav() });
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

        res.json({
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
        res.status(500).json({ error: 'Failed to fetch jobs' }); 
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
        
        // Total Applications Received (all applications regardless of status)
        const totalApplications = await JobApplication.countDocuments({ 
            posted_by: recruiterId, 
            user_id: { $ne: null } 
        });
        
        // Pending Applications (status = 'Waiting' or 'Pending')
        const pendingApplications = await JobApplication.countDocuments({ 
            posted_by: recruiterId, 
            user_id: { $ne: null },
            status: { $in: ['Waiting', 'Pending'] }
        });
        
        // Rejected Applications (status = 'Rejected')
        const rejectedApplications = await JobApplication.countDocuments({ 
            posted_by: recruiterId, 
            user_id: { $ne: null },
            status: 'Rejected'
        });
        
        // Approved Applications (status = 'Approved')
        const approvedApplications = await JobApplication.countDocuments({ 
            posted_by: recruiterId, 
            user_id: { $ne: null },
            status: 'Approved'
        });
        
        // Debug logging
        console.log('Dashboard Metrics for Recruiter:', recruiterId);
        console.log('Total Jobs:', jobCount);
        console.log('Total Applications:', totalApplications);
        console.log('Pending:', pendingApplications);
        console.log('Approved:', approvedApplications);
        console.log('Rejected:', rejectedApplications);
        
        // Calculate Hiring Success Rate (%)
        const hiringSuccessRate = totalApplications > 0 
            ? Math.round((approvedApplications / totalApplications) * 100) 
            : 0;
        
        // Top Most Applied Job
        const jobApplicationsAggregation = await JobApplication.aggregate([
            { 
                $match: { 
                    posted_by: new mongoose.Types.ObjectId(recruiterId), 
                    user_id: { $ne: null } 
                } 
            },
            { 
                $group: { 
                    _id: '$job_title', 
                    count: { $sum: 1 } 
                } 
            },
            { $sort: { count: -1 } },
            { $limit: 1 }
        ]);
        
        const topMostAppliedJob = jobApplicationsAggregation.length > 0 
            ? {
                jobTitle: jobApplicationsAggregation[0]._id,
                applicationCount: jobApplicationsAggregation[0].count
            }
            : {
                jobTitle: 'No applications yet',
                applicationCount: 0
            };

        const dashboardData = {
            user: req.session.user,
            ...recruiterNav,
            totalJobs: jobCount || 0,
            totalParticipants: participantCount || 0,
            approvedApplications: approvedApplications || 0,
            pendingApplications: pendingApplications || 0,
            rejectedApplications: rejectedApplications || 0,
            hiringSuccessRate: hiringSuccessRate,
            topMostAppliedJob: topMostAppliedJob
        };
        
        console.log('Sending Dashboard Data:', JSON.stringify(dashboardData, null, 2));
        res.json(dashboardData);
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
        console.log('Fetching applications for recruiter:', recruiterId);
        
        const applications = await JobApplication.find({
            posted_by: recruiterId,
            user_id: { $ne: null }
        }).populate('user_id', 'name').lean();

        console.log(`Found ${applications.length} applications`);

        const formattedApplications = applications.filter(app => app.user_id).map(app => {
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
                applicantId: app.user_id._id.toString(),
                resumeId: app._id.toString(),
                jobTitle: app.job_title
            };
        });

        console.log(`Formatted ${formattedApplications.length} applications`);

        const recruiterNav = getRecruiterNav();

        res.json({
            user: req.session.user,
            homeUrl: recruiterNav.homeUrl,
            navLinks: recruiterNav.navLinks,
            applications: formattedApplications
        });
    } catch (err) {
        console.error('Error in /rec-app route:', err.message);
        console.error('Full error:', err);
        res.status(500).json({ error: 'Failed to load applications' });
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
        res.json({ user: req.session.user, ...recruiterNav, notifications });
    } catch (err) {
        console.error('Error in /rec-not route:', err.message);
        res.status(500).json({ error: 'Failed to load notifications' });
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
    
    // Handle different status formats
    let status = req.body.status;
    if (req.body.statusLc) {
        status = req.body.statusLc === 'approved' ? 'Approved' : (req.body.statusLc === 'rejected' ? 'Rejected' : req.body.statusLc);
    }
    // Capitalize status if it's lowercase
    if (status && typeof status === 'string') {
        status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
    }
    
    if (!['Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid status' });
    }

    try {
        const application = await JobApplication.findOne({ _id: applicationId, posted_by: recruiterId, user_id: { $ne: null } });
        if (!application) return res.status(404).json({ success: false, error: 'Application not found' });

        if (status === 'Rejected') {
            // Update status to 'Rejected' instead of deleting
            application.status = 'Rejected';
            await application.save();
            await Notification.create({ user_id: application.user_id, message: `Your application for "${application.job_title}" was rejected.`, type: 'job_rejected', is_read: false });
            res.json({ success: true });
        } else {
            application.status = status;
            await application.save();
            
            const recruiter = await User.findById(recruiterId).select('email name').lean();
            await Notification.create({
                user_id: application.user_id,
                message: `You have been shortlisted for "${application.job_title}". Recruiter email: ${recruiter?.email || 'N/A'}.`,
                type: 'job_shortlisted',
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

// =========================================================================
// 11. Get User Profile for Recruiter (GET /user-profile-for-recruiter/:userId)
// =========================================================================
exports.getUserProfileForRecruiter = async (req, res) => {
    const recruiterId = req.session.user.id;
    const userId = req.params.userId;

    try {
        // Verify the recruiter has access to this user (they applied to one of their jobs)
        const application = await JobApplication.findOne({ 
            posted_by: recruiterId, 
            user_id: userId 
        });
        
        if (!application) {
            return res.status(403).json({ success: false, error: 'You do not have access to this user profile' });
        }

        // Fetch user data
        const user = await User.findById(userId).select('-password').lean();
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        // Fetch user metrics
        const { UserMetrics, Task, Project, ProjectMember } = require("../database");
        const metrics = await UserMetrics.findOne({ user_id: userId }).lean() || {
            total_collaborations: 0,
            active_projects: 0,
            completed_tasks: 0,
            leadership_roles: 0,
            inquiriesInitiated: 0,
            job_applications: 0,
            projects_as_member: 0,
            solutions_provided: 0
        };

        // Fetch completed tasks grouped by project
        const completedTasks = await Task.find({ 
            assigned_to: userId, 
            status: 'Completed' 
        }).populate('project_id', 'title').lean();

        const tasksByProject = {};
        completedTasks.forEach(task => {
            const projectId = task.project_id?._id?.toString();
            const projectTitle = task.project_id?.title || 'Unknown Project';
            
            if (!tasksByProject[projectId]) {
                tasksByProject[projectId] = {
                    projectId: projectId,
                    projectTitle: projectTitle,
                    tasks: []
                };
            }
            
            tasksByProject[projectId].tasks.push({
                _id: task._id.toString(),
                title: task.title,
                description: task.description,
                status: task.status,
                github_link: task.github_link
            });
        });

        // Get projects where user is a member (both active and completed)
        const projectMembers = await ProjectMember.find({ user_id: userId })
            .populate('project_id', 'title description user_id status')
            .lean();
        
        const projects = projectMembers
            .filter(pm => pm.project_id) // Filter out null project_id
            .map(pm => ({
                _id: pm.project_id._id,
                title: pm.project_id.title,
                description: pm.project_id.description,
                status: pm.project_id.status,
                role: pm.project_id.user_id.toString() === userId ? 'leader' : 'member'
            }));

        res.json({
            success: true,
            user: {
                _id: user._id,
                name: user.name,
                email: user.email,
                about: user.about || '',
                skills: user.skills || [],
                interests: user.interests || [],
                profileImageUrl: user.profileImageUrl,
                resumeUrl: user.resumeUrl,
                questionsAnswered: user.questionsAnswered || 0,
                thumbsUp: user.thumbsUp || 0,
                thumbsDown: user.thumbsDown || 0
            },
            metrics: metrics,
            completedTasks: Object.values(tasksByProject),
            projects: projects
        });
    } catch (err) {
        console.error('Error fetching user profile for recruiter:', err.message);
        res.status(500).json({ success: false, error: 'Failed to fetch user profile' });
    }
};