// controllers/recruiterController.js

const mongoose = require("mongoose");
const path = require("path");
const fs = require('fs');
// Import ALL models (necessary for functional integrity)
const { User, UserMetrics, Doubt, Reply, JobApplication, Project, ProjectMember, JoinRequest, Task, Notification } = require("../database"); 
const { getTimeAgo } = require("../services/helperService");
const { deleteByPrefix } = require("../services/redisCacheService");
const { logInvalidation } = require("../services/cacheLoggingService");
const { syncJobUpsert, syncJobDelete } = require('../services/solrSyncService');

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
    res.json({ user: req.user, ...getRecruiterNav() });
};

// =========================================================================
// 2. Recruiter Job Creation/Management Page (GET /rec-job)
// =========================================================================
exports.getRecruiterJobs = async (req, res) => {
    const recruiterId = req.user.id;
    const navData = getRecruiterNav(); 

    try {
        const [totalJobs, totalParticipants, activeJobs, postedJobs] = await Promise.all([
            JobApplication.countDocuments({ posted_by: recruiterId, user_id: null }),
            JobApplication.countDocuments({ posted_by: recruiterId, user_id: { $ne: null } }),
            JobApplication.countDocuments({ posted_by: recruiterId, active: 1, user_id: null }),
            JobApplication.find({ posted_by: recruiterId, user_id: null })
                .select('_id job_title company_name salary_range description skills custom_questions active')
                .lean()
        ]);

        res.json({
            user: req.user,
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
    const recruiterId = req.user.id;
    const recruiterNav = getRecruiterNav();

    try {
        const [
            jobCount,
            participantCount,
            totalApplications,
            pendingApplications,
            rejectedApplications,
            approvedApplications
        ] = await Promise.all([
            JobApplication.countDocuments({ posted_by: recruiterId, user_id: null }),
            JobApplication.countDocuments({ posted_by: recruiterId, user_id: { $ne: null } }),
            JobApplication.countDocuments({ posted_by: recruiterId, user_id: { $ne: null } }),
            JobApplication.countDocuments({ posted_by: recruiterId, user_id: { $ne: null }, status: { $in: ['Waiting', 'Pending'] } }),
            JobApplication.countDocuments({ posted_by: recruiterId, user_id: { $ne: null }, status: 'Rejected' }),
            JobApplication.countDocuments({ posted_by: recruiterId, user_id: { $ne: null }, status: 'Approved' })
        ]);
        
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
            user: req.user,
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
// 3b. Recruiter Dashboard Trends (GET /recruiter-dashboard-trends)
// =========================================================================
exports.getRecruiterDashboardTrends = async (req, res) => {
    const recruiterId = req.user.id;
    const recruiterObjId = new mongoose.Types.ObjectId(recruiterId);

    try {
        const now = new Date();
        const twelveWeeksAgo = new Date(now);
        twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

        // Build 12 weekly buckets
        const weeks = [];
        for (let i = 11; i >= 0; i--) {
            const end = new Date(now);
            end.setHours(23, 59, 59, 999);
            end.setDate(end.getDate() - i * 7);
            const start = new Date(end);
            start.setDate(start.getDate() - 6);
            start.setHours(0, 0, 0, 0);
            weeks.push({ label: `${start.getMonth() + 1}/${start.getDate()}`, start, end: new Date(end.getTime() + 1) });
        }
        const inWeek = (date, w) => date >= w.start && date < w.end;

        // All applications for this recruiter
        const [allApps, allJobs] = await Promise.all([
            JobApplication.find({ posted_by: recruiterId, user_id: { $ne: null } }).lean(),
            JobApplication.find({ posted_by: recruiterId, user_id: null }).lean()
        ]);
        const recentApps = allApps.filter(a => a.createdAt >= twelveWeeksAgo);

        // All job postings (template docs with user_id = null)
        const recentJobs = allJobs.filter(j => j.createdAt >= twelveWeeksAgo);

        // 1. Application Inflow Trend (line chart)
        const applicationInflow = weeks.map(w => ({
            label: w.label,
            count: recentApps.filter(a => inWeek(a.createdAt, w)).length
        }));

        // 2. Hiring Pipeline (stacked bar: pending/approved/rejected per week)
        const hiringPipeline = weeks.map(w => {
            const wa = recentApps.filter(a => inWeek(a.createdAt, w));
            return {
                label: w.label,
                pending: wa.filter(a => a.status === 'Pending' || a.status === 'Waiting').length,
                approved: wa.filter(a => a.status === 'Approved').length,
                rejected: wa.filter(a => a.status === 'Rejected').length
            };
        });

        // 3. Job Posting Activity (line chart)
        const jobPostingActivity = weeks.map(w => ({
            label: w.label,
            count: recentJobs.filter(j => inWeek(j.createdAt, w)).length
        }));

        // 4. Hiring Success Rate Trend (cumulative % per week)
        let cumApproved = allApps.filter(a => a.createdAt < twelveWeeksAgo && a.status === 'Approved').length;
        let cumTotal = allApps.filter(a => a.createdAt < twelveWeeksAgo).length;
        const successRateTrend = weeks.map(w => {
            const wa = recentApps.filter(a => inWeek(a.createdAt, w));
            cumTotal += wa.length;
            cumApproved += wa.filter(a => a.status === 'Approved').length;
            return {
                label: w.label,
                rate: cumTotal > 0 ? Math.round((cumApproved / cumTotal) * 100) : 0
            };
        });

        // 5. Top Jobs Comparison (horizontal bar data)
        const jobMap = {};
        allApps.forEach(a => {
            const t = a.job_title || 'Unknown';
            if (!jobMap[t]) jobMap[t] = { title: t, total: 0, approved: 0, pending: 0, rejected: 0 };
            jobMap[t].total++;
            if (a.status === 'Approved') jobMap[t].approved++;
            else if (a.status === 'Rejected') jobMap[t].rejected++;
            else jobMap[t].pending++;
        });
        const topJobs = Object.values(jobMap).sort((a, b) => b.total - a.total).slice(0, 8);

        // 6. Activity Heatmap (91 days)
        const d91 = new Date(now);
        d91.setDate(d91.getDate() - 91);
        d91.setHours(0, 0, 0, 0);

        const dayMap = {};
        for (let i = 0; i < 91; i++) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            dayMap[d.toISOString().slice(0, 10)] = 0;
        }
        const addDay = (dt) => {
            if (!dt) return;
            const k = new Date(dt).toISOString().slice(0, 10);
            if (k in dayMap) dayMap[k]++;
        };

        // Count: apps received, jobs posted, notifications created
        allApps.forEach(a => addDay(a.createdAt));
        allJobs.forEach(j => addDay(j.createdAt));
        const recruiterNotifs = await Notification.find({ user_id: recruiterObjId, createdAt: { $gte: d91 } }).select('createdAt').lean();
        recruiterNotifs.forEach(n => addDay(n.createdAt));

        const maxAct = Math.max(...Object.values(dayMap), 1);
        const activityHeatmap = Object.entries(dayMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, count]) => ({
                date,
                count,
                level: count === 0 ? 0 : Math.min(Math.ceil((count / maxAct) * 4), 4)
            }));

        res.json({ applicationInflow, hiringPipeline, jobPostingActivity, successRateTrend, topJobs, activityHeatmap });
    } catch (err) {
        console.error('Error fetching recruiter dashboard trends:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

// =========================================================================
// 4. Recruiter Applications Page (GET /rec-app)
// =========================================================================
exports.getRecruiterApplications = async (req, res) => {
    const recruiterId = req.user.id;
    
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
            user: req.user,
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
    const recruiterId = req.user.id;
    try {
        const notifications = await Notification.find({ user_id: recruiterId }).sort({ createdAt: -1 }).lean();
        const recruiterNav = getRecruiterNav(); 
        res.json({ user: req.user, ...recruiterNav, notifications });
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
    const recruiterId = req.user.id;

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
    const recruiterId = req.user.id;
    
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
            application.recruitedAt = null;
            await application.save();
            await Notification.create({ user_id: application.user_id, message: `Your application for "${application.job_title}" was rejected.`, type: 'job_rejected', is_read: false });
            // Invalidate recruiter caches
            deleteByPrefix(`recruiter:${recruiterId}:*`).catch(err => {
                console.error('[RecruiterController] Cache invalidation error:', err.message);
            });
            logInvalidation('JOB_APPLICATION_REJECTED', [`recruiter:${recruiterId}:*`], application.user_id, recruiterId);
            res.json({ success: true });
        } else {
            application.status = status;
            application.recruitedAt = new Date();
            await application.save();
            
            const recruiter = await User.findById(recruiterId).select('email name').lean();
            await Notification.create({
                user_id: application.user_id,
                message: `You have been shortlisted for "${application.job_title}". Recruiter email: ${recruiter?.email || 'N/A'}.`,
                type: 'job_shortlisted',
                is_read: false
            });
            // Invalidate recruiter caches
            deleteByPrefix(`recruiter:${recruiterId}:*`).catch(err => {
                console.error('[RecruiterController] Cache invalidation error:', err.message);
            });
            logInvalidation('JOB_APPLICATION_APPROVED', [`recruiter:${recruiterId}:*`], application.user_id, recruiterId);
            res.json({ success: true });
        }
    } catch (err) {
        console.error('Error updating application status:', err.message);
        res.status(500).json({ success: false, error: 'Database error' });
    }
};

// =========================================================================
// 8. Create Recruiter Job (POST /create-recruiter-job)
//      - Block job creation until platform admin verifies recruiter document
// =========================================================================
exports.createRecruiterJob = async (req, res) => {
    const { jobTitle, companyName, description, salaryRange, skills, customQuestions } = req.body;
    const recruiterId = req.user.id;

    try {
        // Ensure recruiter has been verified by a platform administrator
        const recruiter = await User.findById(recruiterId).select('role recruiterVerified recruiterVerificationMessage');

        if (!recruiter || recruiter.role !== 'recruiter') {
            return res.status(403).json({ success: false, error: 'Only recruiters can create jobs.' });
        }

        if (!recruiter.recruiterVerified) {
            const message = recruiter.recruiterVerificationMessage ||
                'Your document is being verified by the platform team. You will be able to create jobs once verification is complete.';
            return res.status(403).json({ success: false, error: message });
        }

        console.log('[createRecruiterJob] customQuestions received:', JSON.stringify(customQuestions));

        const jobDoc = await JobApplication.create({
            posted_by: recruiterId,
            job_posting_id: null,
            job_title: jobTitle,
            company_name: companyName,
            salary_range: salaryRange,
            description,
            skills,
            custom_questions: customQuestions || [],
            active: 1
        });

        await syncJobUpsert(jobDoc);

        console.log('[createRecruiterJob] Stored custom_questions:', JSON.stringify(jobDoc.custom_questions));

        const createdAt = new Date();
        await Notification.create({
            user_id: recruiterId,
            message: `You created a job "${jobTitle}" on ${createdAt.toLocaleDateString()}.`,
            type: 'job_created',
            is_read: false
        });
        res.json({ success: true, jobId: jobDoc._id.toString() });
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
    const recruiterId = req.user.id;

    try {
        if (!mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({ success: false, error: "Invalid job ID" });
        }

        // Only allow deleting actual job postings (template docs), not applicant rows.
        const job = await JobApplication.findOne({ _id: jobId, posted_by: recruiterId, user_id: null }).lean();
        if (!job) {
            return res.status(404).json({ success: false, error: "Job posting not found or not authorized to delete" });
        }

        // Cascade delete: remove the posting and all applications derived from this posting snapshot.
        const relatedApplicationFilter = {
            posted_by: recruiterId,
            user_id: { $ne: null },
            job_title: job.job_title,
            company_name: job.company_name,
            salary_range: job.salary_range,
            description: job.description,
            skills: job.skills,
            custom_questions: job.custom_questions || []
        };

        const result = await JobApplication.deleteMany({
            $or: [
                { _id: job._id },
                relatedApplicationFilter
            ]
        });

        await syncJobDelete(job._id);
        
        const deletedAt = new Date();
        const title = job?.job_title || 'your job';
        await Notification.create({
            user_id: recruiterId,
            message: `You deleted the job "${title}" on ${deletedAt.toLocaleDateString()}.`,
            type: 'job_deleted',
            is_read: false
        });

        const deletedApplications = Math.max(0, (result.deletedCount || 0) - 1);
        res.json({
            success: true,
            message: `Job deleted with ${deletedApplications} related application(s).`,
            deletedJobId: job._id.toString(),
            deletedApplications
        });
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
    const recruiterId = req.user.id;
    const { active } = req.body;
    try {
        const job = await JobApplication.findOne({ _id: jobId, posted_by: recruiterId }).lean();
        const result = await JobApplication.updateOne({ _id: jobId, posted_by: recruiterId }, { active });
        if (result.modifiedCount === 0) {
            return res.status(404).json({ success: false, error: "Job not found or not authorized to update" });
        }

        const updatedJob = await JobApplication.findById(jobId)
            .select('job_title company_name description skills salary_range active createdAt posted_by user_id')
            .lean();

        if (updatedJob) {
            await syncJobUpsert(updatedJob);
        }

        const title = job?.job_title || 'your job';
        const isActivating = active === 1 || active === true;
        await Notification.create({
            user_id: recruiterId,
            message: isActivating
                ? `You activated the job "${title}" on ${new Date().toLocaleDateString()}.`
                : `You deactivated the job "${title}" on ${new Date().toLocaleDateString()}.`,
            type: isActivating ? 'job_activated' : 'job_deactivated',
            is_read: false
        });
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
    const recruiterId = req.user.id;
    const userId = req.params.userId;

    try {
        // Verify the recruiter has access to this user (they applied to one of their jobs)
        const application = await JobApplication.exists({ 
            posted_by: recruiterId, 
            user_id: userId 
        });
        
        if (!application) {
            return res.status(403).json({ success: false, error: 'You do not have access to this user profile' });
        }

        // Fetch user data
        const { UserMetrics, Task, ProjectMember } = require("../database");
        const [user, metricsDoc, completedTasks, projectMembers] = await Promise.all([
            User.findById(userId).select('-password').lean(),
            UserMetrics.findOne({ user_id: userId }).lean(),
            Task.find({ assigned_to: userId, status: 'Completed' }).populate('project_id', 'title').lean(),
            ProjectMember.find({ user_id: userId })
                .populate('project_id', 'title description user_id status')
                .lean()
        ]);

        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found' });
        }

        const metrics = metricsDoc || {
            total_collaborations: 0,
            active_projects: 0,
            completed_tasks: 0,
            leadership_roles: 0,
            inquiriesInitiated: 0,
            job_applications: 0,
            projects_as_member: 0,
            solutions_provided: 0
        };

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