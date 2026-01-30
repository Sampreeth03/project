// controllers/adminController.js

const mongoose = require("mongoose");
// NOTE: Assuming models path. Please confirm or update path to your models!
const { User, UserMetrics, Project, Doubt, JobApplication, ProjectMember, PlatformAdministrator } = require("../database"); 
const { getCacheValue, setCacheValue, isRedisReady } = require('../services/redisCacheService');

// Helper function to calculate percentage change
function computeSignedPercent(curr, prev) {
    if (!prev) return curr ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
}

const ANALYTICS_CACHE_TTL = Number(process.env.ADMIN_ANALYTICS_CACHE_TTL || 90);
const DETAIL_CACHE_TTL = Number(process.env.ADMIN_DETAIL_CACHE_TTL || 90);

const parseRangeDays = (range) => {
    const match = String(range || '30d').trim().match(/^(\d+)d$/i);
    if (!match) return 30;
    const parsed = Number(match[1]);
    if (!Number.isFinite(parsed) || parsed <= 0) return 30;
    return Math.min(Math.floor(parsed), 365);
};

const startOfUtcDay = (value) => {
    const date = new Date(value);
    date.setUTCHours(0, 0, 0, 0);
    return date;
};

const endOfUtcDay = (value) => {
    const date = new Date(value);
    date.setUTCHours(23, 59, 59, 999);
    return date;
};

const addUtcDays = (value, days) => {
    const date = new Date(value);
    date.setUTCDate(date.getUTCDate() + days);
    return date;
};

const toUtcDateKey = (value) => new Date(value).toISOString().slice(0, 10);

const buildDateKeys = (startDate, endDate) => {
    const keys = [];
    let cursor = startOfUtcDay(startDate);
    const finalDate = startOfUtcDay(endDate);

    while (cursor <= finalDate) {
        keys.push(toUtcDateKey(cursor));
        cursor = addUtcDays(cursor, 1);
    }

    return keys;
};

const buildWindow = (range) => {
    const days = parseRangeDays(range);
    const now = new Date();
    const currentStart = startOfUtcDay(addUtcDays(now, -(days - 1)));
    return {
        range: `${days}d`,
        days,
        currentStart,
        endDate: endOfUtcDay(now),
        currentKeys: buildDateKeys(currentStart, now)
    };
};

const readJsonCache = async (key) => {
    if (!isRedisReady()) return null;
    const cached = await getCacheValue(key);
    if (!cached) return null;
    try {
        return JSON.parse(cached);
    } catch (error) {
        return null;
    }
};

const writeJsonCache = async (key, value, ttlSeconds) => {
    if (!isRedisReady()) return;
    await setCacheValue(key, JSON.stringify(value), ttlSeconds);
};

const toObjectId = (value) => {
    if (!mongoose.Types.ObjectId.isValid(value)) return null;
    return new mongoose.Types.ObjectId(value);
};

const toStatusLabel = (status) => {
    const normalized = String(status || '').trim().toLowerCase();
    if (normalized === 'approved') return 'selected';
    if (normalized === 'rejected') return 'rejected';
    return 'pending';
};

const buildTimeline = (rows, keys, valueKey = 'count') => {
    const map = new Map(keys.map((date) => [date, 0]));
    for (const row of rows || []) {
        const key = row?._id?.day || row?.day;
        if (map.has(key)) {
            map.set(key, Number(row[valueKey] || row.count || 0));
        }
    }
    return keys.map((date) => ({ date, count: map.get(date) || 0 }));
};

const buildRoleTimeline = (rows, keys, role) => {
    const map = new Map(keys.map((date) => [date, 0]));
    for (const row of rows || []) {
        const key = row?._id?.day;
        if (row?._id?.role === role && map.has(key)) {
            map.set(key, Number(row.count || 0));
        }
    }
    return keys.map((date) => ({ date, count: map.get(date) || 0 }));
};

const buildPostingSignature = (doc) => {
    const postingId = String(doc?._id || '').trim();
    if (postingId) return postingId;
    return [
        String(doc?.posted_by || '').trim(),
        String(doc?.job_title || '').trim(),
        String(doc?.company_name || '').trim(),
        String(doc?.salary_range || '').trim(),
        String(doc?.description || '').trim(),
        String(doc?.skills || '').trim(),
        JSON.stringify(Array.isArray(doc?.custom_questions) ? doc.custom_questions : [])
    ].join('||');
};

const buildApplicationSignature = (doc) => {
    const postingId = String(doc?.job_posting_id || '').trim();
    if (postingId) return postingId;
    return [
        String(doc?.posted_by || '').trim(),
        String(doc?.job_title || '').trim(),
        String(doc?.company_name || '').trim(),
        String(doc?.salary_range || '').trim(),
        String(doc?.description || '').trim(),
        String(doc?.skills || '').trim(),
        JSON.stringify(Array.isArray(doc?.custom_questions) ? doc.custom_questions : [])
    ].join('||');
};

const getAnalyticsBundle = async (range) => {
    const window = buildWindow(range);
    const cacheKey = `admin:analytics:${window.range}`;
    const cached = await readJsonCache(cacheKey);
    if (cached) {
        return cached;
    }

    const [userRows, projectRows, jobRows, hireRows] = await Promise.all([
        User.aggregate([
            { $match: { role: { $in: ['user', 'recruiter'] }, createdAt: { $gte: window.currentStart, $lte: window.endDate } } },
            {
                $group: {
                    _id: {
                        day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } },
                        role: '$role'
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.day': 1 } }
        ]),
        Project.aggregate([
            { $match: { createdAt: { $gte: window.currentStart, $lte: window.endDate } } },
            {
                $group: {
                    _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.day': 1 } }
        ]),
        JobApplication.aggregate([
            { $match: { user_id: null, createdAt: { $gte: window.currentStart, $lte: window.endDate } } },
            {
                $group: {
                    _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'UTC' } } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.day': 1 } }
        ]),
        JobApplication.aggregate([
            { $match: { status: 'Approved', recruitedAt: { $gte: window.currentStart, $lte: window.endDate } } },
            {
                $group: {
                    _id: { day: { $dateToString: { format: '%Y-%m-%d', date: '$recruitedAt', timezone: 'UTC' } } },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.day': 1 } }
        ])
    ]);

    const students = buildRoleTimeline(userRows, window.currentKeys, 'user');
    const recruiters = buildRoleTimeline(userRows, window.currentKeys, 'recruiter');
    const projects = buildTimeline(projectRows, window.currentKeys);
    const jobs = buildTimeline(jobRows, window.currentKeys);
    const hires = buildTimeline(hireRows, window.currentKeys);

    const payload = { students, recruiters, projects, jobs, hires };
    await writeJsonCache(cacheKey, payload, ANALYTICS_CACHE_TTL);
    return payload;
};

const getRecruiterJobsData = async (recruiterId) => {
    const recruiterObjectId = toObjectId(recruiterId);
    if (!recruiterObjectId) {
        const err = new Error('Invalid recruiter ID');
        err.statusCode = 400;
        throw err;
    }

    const recruiter = await User.findOne({ _id: recruiterObjectId, role: 'recruiter' })
        .select('name email companyName createdAt recruiterVerified recruiterVerificationMessage')
        .lean();

    if (!recruiter) {
        const err = new Error('Recruiter not found');
        err.statusCode = 404;
        throw err;
    }

    const [jobs, applications] = await Promise.all([
        JobApplication.find({ posted_by: recruiterObjectId, user_id: null })
            .select('_id posted_by job_title company_name createdAt active custom_questions description salary_range skills')
            .sort({ createdAt: -1 })
            .lean(),
        JobApplication.find({ posted_by: recruiterObjectId, user_id: { $ne: null } })
            .select('_id posted_by job_posting_id job_title company_name createdAt date_applied status recruitedAt custom_questions description salary_range skills user_id')
            .populate('user_id', 'name email profileImageUrl')
            .lean()
    ]);

    const jobsData = await Promise.all(jobs.map(async (job) => {
        const jobApplications = applications.filter((application) => {
            if (String(application.job_posting_id || '') === String(job._id)) return true;
            return (
                String(application.job_title || '') === String(job.job_title || '') &&
                String(application.company_name || '') === String(job.company_name || '') &&
                String(application.description || '') === String(job.description || '') &&
                String(application.salary_range || '') === String(job.salary_range || '') &&
                String(application.skills || '') === String(job.skills || '') &&
                JSON.stringify(Array.isArray(application.custom_questions) ? application.custom_questions : []) ===
                    JSON.stringify(Array.isArray(job.custom_questions) ? job.custom_questions : [])
            );
        });

        return {
            id: job._id.toString(),
            job_title: job.job_title,
            company_name: job.company_name,
            createdAt: job.createdAt || null,
            applicantsCount: jobApplications.length,
            selectedCount: jobApplications.filter((application) => toStatusLabel(application.status) === 'selected').length,
            status: job.active === true || job.active === 1 ? 'active' : 'inactive'
        };
    }));

    return {
        recruiter: {
            id: recruiter._id.toString(),
            name: recruiter.name || recruiter.email?.split('@')[0] || 'Recruiter',
            email: recruiter.email,
            company: recruiter.companyName || '',
            createdAt: recruiter.createdAt || null
        },
        jobs: jobsData
    };
};

const getJobApplicantsData = async (jobId) => {
    const jobObjectId = toObjectId(jobId);
    if (!jobObjectId) {
        const err = new Error('Invalid job ID');
        err.statusCode = 400;
        throw err;
    }

    const posting = await JobApplication.findOne({ _id: jobObjectId, user_id: null })
        .select('_id posted_by job_title company_name createdAt active custom_questions description salary_range skills')
        .lean();

    if (!posting) {
        const err = new Error('Job posting not found');
        err.statusCode = 404;
        throw err;
    }

    const applicants = await JobApplication.find({
        posted_by: posting.posted_by,
        user_id: { $ne: null },
        $or: [
            { job_posting_id: posting._id },
            {
                job_title: posting.job_title,
                company_name: posting.company_name,
                description: posting.description,
                salary_range: posting.salary_range,
                skills: posting.skills,
                custom_questions: posting.custom_questions || []
            }
        ]
    })
        .select('user_id date_applied status recruitedAt createdAt')
        .populate('user_id', 'name email profileImageUrl')
        .sort({ date_applied: -1, createdAt: -1 })
        .lean();

    return {
        job: {
            id: posting._id.toString(),
            job_title: posting.job_title,
            company_name: posting.company_name,
            createdAt: posting.createdAt || null,
            status: posting.active === true || posting.active === 1 ? 'active' : 'inactive'
        },
        applicants: applicants.map((application) => ({
            id: application._id.toString(),
            user: application.user_id ? {
                id: application.user_id._id.toString(),
                name: application.user_id.name,
                email: application.user_id.email,
                profileImageUrl: application.user_id.profileImageUrl || null
            } : null,
            appliedAt: application.date_applied || application.createdAt || null,
            status: toStatusLabel(application.status),
            recruitedAt: application.recruitedAt || null
        }))
    };
};

// =========================================================================
// 1. Admin Dashboard Page (GET /admin)
// =========================================================================
exports.getAdminDashboard = (req, res) => {
    // Renders the shell, data is fetched via AJAX/API (/admin/dashboard-data)
    res.render('admin', {
        activePage: 'dashboard',
        dashboardData: {
            adminName: req.user.name,
            adminRole: 'Super Admin',
            period: '30 days',
            dashboardCards: []
        }
    });
};

// =========================================================================
// 2. Dashboard Data API (GET /admin/dashboard-data)
// =========================================================================
exports.getDashboardData = async (req, res) => {
    try {
        const now = new Date();
        const periodDays = 30;
        const periodMs = periodDays * 24 * 60 * 60 * 1000;
        const periodStart = new Date(now.getTime() - periodMs);
        const prevStart = new Date(now.getTime() - 2 * periodMs);
        const prevEnd = periodStart;

        const [
            usersCurr, usersPrev,
            recCurr, recPrev,
            projCurr, projPrev,
            doubtCurr, doubtPrev,
            platformAdminsCurr, platformAdminsPrev,
            totalUsers, totalRecruiters, totalProjects, totalDoubts, totalPlatformAdmins
        ] = await Promise.all([
            User.countDocuments({ role: 'user', createdAt: { $gte: periodStart, $lt: now } }),
            User.countDocuments({ role: 'user', createdAt: { $gte: prevStart, $lt: prevEnd } }),
            User.countDocuments({ role: 'recruiter', createdAt: { $gte: periodStart, $lt: now } }),
            User.countDocuments({ role: 'recruiter', createdAt: { $gte: prevStart, $lt: prevEnd } }),
            Project.countDocuments({ createdAt: { $gte: periodStart, $lt: now } }),
            Project.countDocuments({ createdAt: { $gte: prevStart, $lt: prevEnd } }),
            Doubt.countDocuments({ createdAt: { $gte: periodStart, $lt: now } }),
            Doubt.countDocuments({ createdAt: { $gte: prevStart, $lt: prevEnd } }),
            PlatformAdministrator.countDocuments({ createdAt: { $gte: periodStart, $lt: now } }),
            PlatformAdministrator.countDocuments({ createdAt: { $gte: prevStart, $lt: prevEnd } }),
            User.countDocuments({ role: 'user' }),
            User.countDocuments({ role: 'recruiter' }),
            Project.countDocuments({}),
            Doubt.countDocuments({}),
            PlatformAdministrator.countDocuments({})
        ]);

        const dashboardData = {
            adminName: req.user?.name || 'Admin',
            adminRole: "Super Admin",
            period: `${periodDays} days`,
            dashboardCards: [
                {
                    title: "Students",
                    icon: "user-graduate",
                    stat: totalUsers,
                    colorClass: "primary",
                    change: computeSignedPercent(usersCurr, usersPrev),
                    route: '/admin/students'
                },
                {
                    title: "Recruiters",
                    icon: "building",
                    stat: totalRecruiters,
                    colorClass: "success",
                    change: computeSignedPercent(recCurr, recPrev),
                    route: '/admin/recruiters'
                },
                {
                    title: "Projects",
                    icon: "lightbulb",
                    stat: totalProjects,
                    colorClass: "warning",
                    change: computeSignedPercent(projCurr, projPrev),
                    route: '/admin/projects'
                },
                {
                    title: "Doubts Asked",
                    icon: "question-circle",
                    stat: totalDoubts,
                    colorClass: "danger",
                    change: computeSignedPercent(doubtCurr, doubtPrev),
                    route: '/admin/doubts'
                },
                {
                    title: "Platform Administrators",
                    icon: "user-shield",
                    stat: totalPlatformAdmins,
                    colorClass: "primary",
                    change: computeSignedPercent(platformAdminsCurr, platformAdminsPrev),
                    route: '/admin/administrators'
                },
            ]
        };

        res.json({ dashboardData });
    } catch (err) {
        console.error("Error fetching dashboard data:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
};

// =========================================================================
// 3. Students Management Page (GET /stud)
// =========================================================================
exports.getStudentsPage = (req, res) => {
    res.render('admin-stud', {
        activePage: 'dashboard',
        adminName: req.user.name
    });
};

// =========================================================================
// 4. Students Data API (GET /api/students)
// =========================================================================
exports.getStudentsData = async (req, res) => {
    try {
        const students = await User.find({ role: 'user' })
            .select('name email createdAt')
            .lean();

        const studentIds = students.map((student) => student._id);
        const [metricsDocs, hostedCounts] = await Promise.all([
            UserMetrics.find({ user_id: { $in: studentIds } })
                .select('user_id completed_tasks')
                .lean(),
            Project.aggregate([
                { $match: { user_id: { $in: studentIds } } },
                { $group: { _id: '$user_id', count: { $sum: 1 } } }
            ])
        ]);

        const tasksByUserId = new Map(
            metricsDocs.map((doc) => [doc.user_id.toString(), doc.completed_tasks || 0])
        );
        const hostedByUserId = new Map(
            hostedCounts.map((doc) => [doc._id.toString(), doc.count || 0])
        );

        const studentsData = students.map((student) => ({
            id: student._id.toString(),
            name: student.name,
            email: student.email,
            projectCount: hostedByUserId.get(student._id.toString()) || 0,
            completedTasks: tasksByUserId.get(student._id.toString()) || 0,
            hostedProjects: hostedByUserId.get(student._id.toString()) || 0,
            tasksCompleted: tasksByUserId.get(student._id.toString()) || 0,
            joinedAt: student.createdAt || null
        }))
            .sort((left, right) => {
                if ((right.projectCount || 0) !== (left.projectCount || 0)) {
                    return (right.projectCount || 0) - (left.projectCount || 0);
                }
                if ((right.completedTasks || 0) !== (left.completedTasks || 0)) {
                    return (right.completedTasks || 0) - (left.completedTasks || 0);
                }
                return String(left.name || '').localeCompare(String(right.name || ''));
            });

        res.json(studentsData);
    } catch (err) {
        console.error("Error fetching students data:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
};

// =========================================================================
// 5. Doubts Management Page (GET /admin-doubts)
// =========================================================================
exports.getDoubtsPage = async (req, res) => {
    try {
        const users = await User.find({ role: 'user' })
            .select('name email')
            .lean();

        const userIds = users.map((user) => user._id);
        const [metricsDocs, doubtsCounts] = await Promise.all([
            UserMetrics.find({ user_id: { $in: userIds } })
                .select('user_id solutions_provided')
                .lean(),
            Doubt.aggregate([
                { $match: { user_id: { $in: userIds } } },
                { $group: { _id: '$user_id', count: { $sum: 1 } } }
            ])
        ]);

        const clearedByUserId = new Map(
            metricsDocs.map((doc) => [doc.user_id.toString(), doc.solutions_provided || 0])
        );
        const askedByUserId = new Map(
            doubtsCounts.map((doc) => [doc._id.toString(), doc.count || 0])
        );

        const doubtsData = users.map((user) => ({
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            doubtsAsked: askedByUserId.get(user._id.toString()) || 0,
            doubtsCleared: clearedByUserId.get(user._id.toString()) || 0
        }));
    
        res.render('admin-doubts', {
            activePage: 'doubts',
            adminName: req.user.name,
            doubtsData
        });
    } catch (err) {
        console.error("Error fetching doubts data:", err.message);
        res.status(500).send("Server Error");
    }
};

// =========================================================================
// 5b. Doubts Data API (GET /admin-doubts/data)
// =========================================================================
exports.getDoubtsData = async (req, res) => {
    try {
        const users = await User.find({ role: 'user' })
            .select('name email')
            .lean();

        const userIds = users.map((user) => user._id);
        const [metricsDocs, doubtsCounts] = await Promise.all([
            UserMetrics.find({ user_id: { $in: userIds } })
                .select('user_id solutions_provided')
                .lean(),
            Doubt.aggregate([
                { $match: { user_id: { $in: userIds } } },
                { $group: { _id: '$user_id', count: { $sum: 1 } } }
            ])
        ]);

        const clearedByUserId = new Map(
            metricsDocs.map((doc) => [doc.user_id.toString(), doc.solutions_provided || 0])
        );
        const askedByUserId = new Map(
            doubtsCounts.map((doc) => [doc._id.toString(), doc.count || 0])
        );

        const doubtsData = users.map((user) => ({
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            doubtsAsked: askedByUserId.get(user._id.toString()) || 0,
            doubtsCleared: clearedByUserId.get(user._id.toString()) || 0
        }));
    
        res.json(doubtsData);
    } catch (err) {
        console.error("Error fetching doubts data:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
};

// =========================================================================
// 6. Recruiters Management Page (GET /admin-rec)
// =========================================================================
exports.getRecruitersPage = (req, res) => {
    res.render('admin-rec', {
        activePage: 'dashboard',
        adminName: req.user.name
    });
};

// =========================================================================
// 7. Recruiters Data API (GET /admin-rec/data)
// =========================================================================
exports.getRecruitersData = async (req, res) => {
    try {
        const recruiters = await User.find({ role: 'recruiter' })
            .select('name email createdAt companyName')
            .lean();

        const recruiterIds = recruiters.map((recruiter) => recruiter._id);
        const recruiterJobs = await JobApplication.find({ posted_by: { $in: recruiterIds } })
            .select('posted_by user_id status job_title company_name createdAt')
            .populate('user_id', 'name email')
            .lean();

        const jobsByRecruiterId = new Map();
        for (const job of recruiterJobs) {
            const key = job.posted_by?.toString();
            if (!key) continue;
            if (!jobsByRecruiterId.has(key)) jobsByRecruiterId.set(key, []);
            jobsByRecruiterId.get(key).push(job);
        }

        const recruitersData = recruiters.map((recruiter) => {
            const recruiterKey = recruiter._id.toString();
            const recruiterJobDocs = jobsByRecruiterId.get(recruiterKey) || [];
            const postedJobs = recruiterJobDocs.filter((job) => !job.user_id);
            const applicantDocs = recruiterJobDocs.filter((job) => job.user_id);
            const hiredApplicants = applicantDocs.filter((job) => job.status === 'Approved');

            const fallbackName = recruiter.email ? recruiter.email.split('@')[0] : 'Unnamed Recruiter';
            return {
                id: recruiter._id.toString(),
                name: recruiter.name || fallbackName,
                email: recruiter.email || 'N/A',
                company: recruiter.companyName || fallbackName,
                role: 'Recruiter',
                joinedDate: recruiter.createdAt
                    ? new Date(recruiter.createdAt).toISOString().split('T')[0]
                    : 'N/A',
                totalApplicants: applicantDocs.length,
                recruitsCount: hiredApplicants.length,
                recruitmentCount: hiredApplicants.length,
                jobsCount: postedJobs.length,
                hiresCount: hiredApplicants.length,
                hiredJobs: [
                    ...postedJobs.map(j => ({
                        type: 'posting',
                        title: j.job_title,
                        company: j.company_name,
                        date: j.createdAt ? new Date(j.createdAt).toISOString().split('T')[0] : 'N/A',
                        personName: null
                    })),
                    ...hiredApplicants.map(j => ({
                        type: 'hired',
                        title: j.job_title,
                        company: j.company_name,
                        date: j.createdAt ? new Date(j.createdAt).toISOString().split('T')[0] : 'N/A',
                        personName: j.user_id?.name || null
                    }))
                ]
            };
        });

        res.json({ recruiters: recruitersData });
    } catch (err) {
        console.error("Error fetching recruiters data:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
};

// =========================================================================
// 7b. Analytics API (GET /api/admin/analytics?range=30d)
// =========================================================================
exports.getAnalyticsData = async (req, res) => {
    try {
        const range = req.query.range || '30d';
        const cacheKey = `admin:analytics:bundle:${String(range).trim().toLowerCase()}`;
        const cached = await readJsonCache(cacheKey);

        if (cached) {
            return res.json(cached);
        }

        const analytics = await getAnalyticsBundle(range);
        await writeJsonCache(cacheKey, analytics, ANALYTICS_CACHE_TTL);
        res.json(analytics);
    } catch (err) {
        console.error('Error fetching analytics data:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Server Error' });
    }
};

// =========================================================================
// 7c. Recruiter Jobs Drill-Down (GET /api/admin/recruiters/:id/jobs)
// =========================================================================
exports.getRecruiterJobs = async (req, res) => {
    try {
        const recruiterId = req.params.id || req.params.recruiterId;
        const cacheKey = `admin:recruiters:${recruiterId}:jobs`;
        const cached = await readJsonCache(cacheKey);

        if (cached) {
            return res.json(cached);
        }

        const data = await getRecruiterJobsData(recruiterId);
        await writeJsonCache(cacheKey, data, DETAIL_CACHE_TTL);
        res.json(data);
    } catch (err) {
        console.error('Error fetching recruiter jobs:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Server Error' });
    }
};

// =========================================================================
// 7d. Job Applicants Drill-Down (GET /api/admin/jobs/:jobId/applicants)
// =========================================================================
exports.getJobApplicants = async (req, res) => {
    try {
        const jobId = req.params.jobId;
        const cacheKey = `admin:jobs:${jobId}:applicants`;
        const cached = await readJsonCache(cacheKey);

        if (cached) {
            return res.json(cached);
        }

        const data = await getJobApplicantsData(jobId);
        await writeJsonCache(cacheKey, data, DETAIL_CACHE_TTL);
        res.json(data);
    } catch (err) {
        console.error('Error fetching job applicants:', err.message);
        res.status(err.statusCode || 500).json({ error: err.message || 'Server Error' });
    }
};

// =========================================================================
// 8. Projects Management Page (GET /admin-proj)
// =========================================================================
exports.getProjectsPage = (req, res) => {
    const dashboardData = {
        currentPage: "projects",
        adminName: req.user.name,
        adminRole: "Super Admin"
    };
    res.render("admin-proj", { activePage: "projects", dashboardData });
};

// =========================================================================
// 9. Projects Data API (GET /api/projects)
// =========================================================================
exports.getProjectsData = async (req, res) => {
    try {
        const projects = await Project.find().lean();
        const now = new Date();

        const projectIds = projects.map((project) => project._id);
        const leadIds = Array.from(new Set(projects.map((project) => project.user_id?.toString()).filter(Boolean)));

        const [leadUsers, memberDocs] = await Promise.all([
            User.find({ _id: { $in: leadIds } }).select('name email').lean(),
            ProjectMember.find({ project_id: { $in: projectIds } }).select('project_id user_id').lean()
        ]);

        const memberUserIds = Array.from(new Set(memberDocs.map((member) => member.user_id?.toString()).filter(Boolean)));
        const missingMemberUserIds = memberUserIds.filter((id) => !leadIds.includes(id));
        const memberUsers = missingMemberUserIds.length > 0
            ? await User.find({ _id: { $in: missingMemberUserIds } }).select('name email').lean()
            : [];

        const usersById = new Map();
        for (const user of [...leadUsers, ...memberUsers]) {
            usersById.set(user._id.toString(), user);
        }

        const memberIdsByProject = new Map();
        for (const member of memberDocs) {
            const key = member.project_id?.toString();
            const userId = member.user_id?.toString();
            if (!key || !userId) continue;
            if (!memberIdsByProject.has(key)) memberIdsByProject.set(key, []);
            memberIdsByProject.get(key).push(userId);
        }

        const projectData = projects.map((project) => {
            const lead = usersById.get(project.user_id?.toString());
            const projectMemberIds = memberIdsByProject.get(project._id.toString()) || [];
            const participantIds = projectMemberIds.filter((id) => id !== project.user_id?.toString());
            const participants = participantIds
                .map((id) => usersById.get(id))
                .filter(Boolean);

            const memberCount = participants.length + 1;
            let derivedStatus = project.status || 'active';

            if (typeof derivedStatus === 'string' && derivedStatus.toLowerCase() === 'completed') {
                derivedStatus = 'completed';
            } else if (project.deadline && new Date(project.deadline).getTime() < now.getTime()) {
                derivedStatus = 'expired';
            } else {
                derivedStatus = 'active';
            }

            return {
                id: project._id.toString(),
                title: project.title,
                category: project.topic || project.category || 'General',
                status: derivedStatus,
                description: project.description,
                deadline: project.deadline,
                members: memberCount,
                lead: lead ? { id: lead._id.toString(), name: lead.name, email: lead.email } : null,
                participants: participants.map((participant) => ({
                    id: participant._id.toString(),
                    name: participant.name,
                    email: participant.email
                }))
            };
        });

        res.json(projectData);
    } catch (err) {
        console.error("Error fetching projects:", err);
        res.status(500).json({ error: "Server Error" });
    }
};

// =========================================================================
// 10. Simple Admin Pages (GET /admin-prof, /admin-mess)
// =========================================================================
exports.getAdminProfilePage = (req, res) => {
    res.render('admin-prof', { activePage: 'dashboard' });
};

exports.getAdminMessagesPage = (req, res) => {
    res.render('admin-mess', { activePage: 'dashboard' });
};

// =========================================================================
// 11. Profile Data API (GET /admin-prof/data)
// =========================================================================
exports.getProfileData = async (req, res) => {
    try {
        // If no session, return default admin data
        if (!req.user?.id) {
            return res.json({
                fullName: 'Admin User',
                email: 'admin@relabteams.com',
                phone: '',
                role: 'Super Admin',
                joined: 'N/A',
                lastLogin: 'Today'
            });
        }
        
        const admin = await User.findById(req.user.id)
            .select('name email phone createdAt')
            .lean();
        
        if (!admin) {
            return res.status(404).json({ error: "Admin not found" });
        }
        
        res.json({
            fullName: admin.name || 'Admin User',
            email: admin.email || '',
            phone: admin.phone || '',
            role: 'Super Admin',
            joined: admin.createdAt ? new Date(admin.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A',
            lastLogin: 'Today'
        });
    } catch (err) {
        console.error("Error fetching profile data:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
};

// =========================================================================
// 12. Messages Data API (GET /admin-mess/data)
// =========================================================================
exports.getMessagesData = async (req, res) => {
    try {
        // Mock data for messages - in real implementation, fetch from database
        const messagesData = {
            conversations: [],
            stats: {
                totalConversations: 0,
                flaggedConversations: 0,
                messagesToday: 0,
                responseRate: 0
            }
        };
        
        res.json(messagesData);
    } catch (err) {
        console.error("Error fetching messages data:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
};

// =========================================================================
// 13. Platform Administrators Management APIs
// =========================================================================

// GET /platform-admins - list all platform administrators
exports.getPlatformAdministrators = async (req, res) => {
    try {
        const admins = await PlatformAdministrator.find()
            .select("email adminId createdAt")
            .sort({ createdAt: -1 })
            .lean();

        res.json({ administrators: admins });
    } catch (err) {
        console.error("Error fetching platform administrators:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
};

// POST /platform-admins - create a new platform administrator
exports.createPlatformAdministrator = async (req, res) => {
    try {
        const { email, passkey, adminId } = req.body || {};

        if (!email || !passkey || !adminId) {
            return res.status(400).json({ error: "Email, passkey and adminId are required" });
        }

        const existing = await PlatformAdministrator.findOne({
            $or: [{ email }, { adminId }]
        }).lean();

        if (existing) {
            return res.status(409).json({ error: "Administrator with this email or adminId already exists" });
        }

        const created = await PlatformAdministrator.create({ email, passkey, adminId });

        res.status(201).json({
            administrator: {
                _id: created._id,
                email: created.email,
                adminId: created.adminId,
                createdAt: created.createdAt
            }
        });
    } catch (err) {
        console.error("Error creating platform administrator:", err.message);
        res.status(500).json({ error: "Server Error" });
    }
};