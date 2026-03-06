// controllers/adminController.js

const mongoose = require("mongoose");
// NOTE: Assuming models path. Please confirm or update path to your models!
const { User, UserMetrics, Project, Doubt, JobApplication, ProjectMember, PlatformAdministrator } = require("../database"); 

// Helper function to calculate percentage change
function computeSignedPercent(curr, prev) {
    if (!prev) return curr ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
}

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
            totalUsers, totalRecruiters, totalProjects, totalDoubts
        ] = await Promise.all([
            User.countDocuments({ role: 'user', createdAt: { $gte: periodStart, $lt: now } }),
            User.countDocuments({ role: 'user', createdAt: { $gte: prevStart, $lt: prevEnd } }),
            User.countDocuments({ role: 'recruiter', createdAt: { $gte: periodStart, $lt: now } }),
            User.countDocuments({ role: 'recruiter', createdAt: { $gte: prevStart, $lt: prevEnd } }),
            Project.countDocuments({ createdAt: { $gte: periodStart, $lt: now } }),
            Project.countDocuments({ createdAt: { $gte: prevStart, $lt: prevEnd } }),
            Doubt.countDocuments({ createdAt: { $gte: periodStart, $lt: now } }),
            Doubt.countDocuments({ createdAt: { $gte: prevStart, $lt: prevEnd } }),
            User.countDocuments({ role: 'user' }),
            User.countDocuments({ role: 'recruiter' }),
            Project.countDocuments({}),
            Doubt.countDocuments({})
        ]);

        const dashboardData = {
            adminName: req.user?.name || 'Admin',
            adminRole: "Super Admin",
            period: `${periodDays} days`,
            dashboardCards: [
                { title: "Students", icon: "user-graduate", stat: totalUsers, colorClass: "primary", change: computeSignedPercent(usersCurr, usersPrev) },
                { title: "Recruiters", icon: "building", stat: totalRecruiters, colorClass: "success", change: computeSignedPercent(recCurr, recPrev) },
                { title: "Projects", icon: "lightbulb", stat: totalProjects, colorClass: "warning", change: computeSignedPercent(projCurr, projPrev) },
                { title: "Doubts Asked", icon: "question-circle", stat: totalDoubts, colorClass: "danger", change: computeSignedPercent(doubtCurr, doubtPrev) },
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
            .select('name email')
            .lean();

        const studentsData = await Promise.all(students.map(async (student) => {
            const metrics = await UserMetrics.findOne({ user_id: student._id })
                .select('completed_tasks')
                .lean();
            const hostedProjects = await Project.countDocuments({ user_id: student._id });

            return {
                id: student._id.toString(),
                name: student.name,
                email: student.email,
                hostedProjects: hostedProjects || 0,
                tasksCompleted: metrics ? metrics.completed_tasks || 0 : 0
            };
        }));

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
    
        const doubtsData = await Promise.all(users.map(async (user) => {
            const metrics = await UserMetrics.findOne({ user_id: user._id })
                .select('inquiriesInitiated solutions_provided')
                .lean();
            const totalDoubts = await Doubt.countDocuments({ user_id: user._id });
            return {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                doubtsAsked: totalDoubts || 0,
                doubtsCleared: metrics ? metrics.solutions_provided || 0 : 0
            };
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
    
        const doubtsData = await Promise.all(users.map(async (user) => {
            const metrics = await UserMetrics.findOne({ user_id: user._id })
                .select('inquiriesInitiated solutions_provided')
                .lean();
            const totalDoubts = await Doubt.countDocuments({ user_id: user._id });
            return {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                doubtsAsked: totalDoubts || 0,
                doubtsCleared: metrics ? metrics.solutions_provided || 0 : 0
            };
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

        const recruitersData = await Promise.all(
            recruiters.map(async (recruiter) => {
                // Job postings: records created by recruiter with no applicant yet
                const postedJobs = await JobApplication.find({
                    posted_by: recruiter._id,
                    user_id: null
                }).select('job_title company_name createdAt').lean();

                // Hired students: applications with Approved status
                const hiredApplicants = await JobApplication.find({
                    posted_by: recruiter._id,
                    user_id: { $ne: null },
                    status: 'Approved'
                }).populate('user_id', 'name email').select('job_title company_name createdAt user_id').lean();

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
                    recruitmentCount: hiredApplicants.length,
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
            })
        );

        res.json({ recruiters: recruitersData });
    } catch (err) {
        console.error("Error fetching recruiters data:", err.message);
        res.status(500).json({ error: "Server Error" });
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

        const projectData = await Promise.all(projects.map(async (project) => {
            // Fetch lead (project creator)
            const lead = await User.findById(project.user_id).select('name email').lean();

            // Fetch participants — members EXCLUDING the creator
            const memberDocs = await ProjectMember.find({
                project_id: project._id,
                user_id: { $ne: project.user_id }
            }).lean();
            const participantIds = memberDocs.map(m => m.user_id);
            const participants = participantIds.length > 0
                ? await User.find({ _id: { $in: participantIds } }).select('name email').lean()
                : [];

            const memberCount = participants.length + 1; // +1 for lead
            let derivedStatus = project.status || 'active';

            if (typeof derivedStatus === 'string' && derivedStatus.toLowerCase() === 'completed') {
                derivedStatus = 'completed';
            } else {
                if (project.deadline && new Date(project.deadline).getTime() < now.getTime()) {
                    derivedStatus = 'expired';
                } else {
                    derivedStatus = 'active';
                }
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
                participants: participants.map(p => ({ id: p._id.toString(), name: p.name, email: p.email }))
            };
        }));

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