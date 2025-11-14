// controllers/userController.js (UPDATED FOR API)

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { User, UserMetrics, Project } = require("../database"); 
const { getNavLinks, getTimeAgo } = require("../services/helperService"); 
const { upload } = require("../middleware/uploadMiddleware"); 

// =========================================================================
// Middleware Helper (Left as placeholder, as API checks are in userRoutes.js)
// =========================================================================
const isAuthenticated = (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    next();
};

// =========================================================================
// 1. User Home Page (GET /home) - CONVERTED TO JSON API
//    Public endpoint: returns user if session exists, else null
// =========================================================================
exports.getHome = (req, res) => {
    const hasSession = !!(req.session && req.session.user);
    const user = hasSession
        ? {
            id: req.session.user.id,
            name: req.session.user.name,
            role: req.session.user.role,
            email: req.session.user.email
          }
        : null;

    res.json({
        success: true,
        message: "User home data requested.",
        user
    });
};

// =========================================================================
// 2. Dashboard Page (GET /dashboard) - CONVERTED TO JSON API
// =========================================================================
exports.getDashboard = (req, res) => {
    // Authentication handled by middleware. React handles rendering.
    res.json({ 
        success: true, 
        message: "User dashboard shell loaded."
    });
};

// =========================================================================
// 3. Dashboard Metrics API (GET /api/dashboard-metrics) - NO CHANGE NEEDED
// =========================================================================
exports.getDashboardMetrics = async (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Unauthorized' });
    const userId = req.session.user.id;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        let metrics = await UserMetrics.findOne({ user_id: new mongoose.Types.ObjectId(userId) });
        if (!metrics) {
            metrics = await UserMetrics.create({ user_id: new mongoose.Types.ObjectId(userId) });
        }

        const completedProjects = await Project.find({ user_id: userId, status: 'completed' });

        res.json({
            username: user.name,
            metrics,
            completedProjects
        });

    } catch (err) {
        console.error('Error fetching dashboard metrics:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

// =========================================================================
// 4. User Topics API (GET /home/topics) - NO CHANGE NEEDED
// =========================================================================
exports.getHomeTopics = (req, res) => {
    const topicsList = [
        { name: "Web Development", description: "Learn front-end & back-end development to create responsive and dynamic websites.", joinLink: "/web-dev" },
        { name: "Cyber Security", description: "Understand ethical hacking, encryption, and security protocols to protect data.", joinLink: "/cyb" },
        { name: "Robotics", description: "Design, build, and program robots with AI to automate tasks.", joinLink: "/robo" },
        { name: "Data Science", description: "Analyze big data using Python, R, and SQL for decision-making.", joinLink: "/ds" },
        { name: "Deep Learning", description: "Understand deep learning and its advanced topics.", joinLink: "/dl" },
        { name: "Blockchain", description: "Understand decentralized networks, smart contracts, and cryptocurrencies.", joinLink: "/blockchain" }
    ];
    res.json(topicsList);
};

// =========================================================================
// 5. User Profile Page (GET /profile and GET /profile/:id) - CONVERTED TO JSON API
// =========================================================================
exports.getProfile = async (req, res) => {
    // This endpoint now serves only as the shell trigger. Data is fetched separately.
    const targetId = req.params.id || req.session.user.id;

    if (!mongoose.Types.ObjectId.isValid(targetId)) {
        return res.status(400).json({ success: false, error: 'Invalid user id' });
    }
    
    // React fetches data using /api/profile-data/:id, this endpoint serves the shell.
    res.json({ success: true, message: "User profile shell loaded." });
};

// =========================================================================
// 6. Update Profile (POST /profile) - NO CHANGE NEEDED
// =========================================================================
exports.postProfile = async (req, res) => {
    const userId = (req.session && req.session.user && req.session.user.id) || null;
    if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });

    try {
        // Build update object
        const update = {};
        if (typeof req.body.name === 'string') update.name = req.body.name.trim();
        if (typeof req.body.email === 'string') update.email = req.body.email.trim();
        if (typeof req.body.about === 'string') update.about = req.body.about.trim();
        if (typeof req.body.skills === 'string') update.skills = req.body.skills.split(',').map(s => s.trim()).filter(Boolean);
        if (typeof req.body.interests === 'string') update.interests = req.body.interests.split(',').map(s => s.trim()).filter(Boolean);
        
        // Handle files from upload.fields middleware
        if (req.files && req.files.picture && req.files.picture[0]) {
            const f = req.files.picture[0];
            update.profileImageUrl = `/uploads/${f.filename}`.replace(/\\/g, '/');
        }
        if (req.files && req.files.resume && req.files.resume[0]) {
            const f = req.files.resume[0];
            update.resumeUrl = `/uploads/${f.filename}`.replace(/\\/g, '/');
        }

        const user = await User.findByIdAndUpdate(userId, { $set: update }, { new: true });
        if (!user) return res.status(404).json({ success: false, error: 'User not found' });

        // Update session user info
        if (req.session && req.session.user && String(req.session.user.id) === String(user._id)) {
            req.session.user.name = user.name;
            req.session.user.email = user.email;
        }

        const respUser = { 
            _id: user._id, name: user.name, email: user.email, about: user.about,
            skills: Array.isArray(user.skills) ? user.skills : [], 
            interests: Array.isArray(user.interests) ? user.interests : [],
            profileImageUrl: user.profileImageUrl || null, resumeUrl: user.resumeUrl || null
        };
        return res.json({ success: true, user: respUser });
    } catch (err) {
        console.error('Error in /profile POST:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
};

// =========================================================================
// 7. Lightweight Profile Data API (GET /profile-data/:id) - NO CHANGE NEEDED
// =========================================================================
exports.getProfileData = async (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid user id' });
    
    try {
        const u = await User.findById(id).lean();
        if (!u) return res.status(404).json({ success: false, message: 'User not found' });

        // Fetch completed tasks for this user
        const { Task, Project } = require("../database");
        const completedTasks = await Task.find({ 
            assigned_to: id, 
            status: 'Completed' 
        }).populate('project_id', 'title').lean();

        console.log(`[Profile] Fetching tasks for user ${id}`);
        console.log(`[Profile] Found ${completedTasks.length} completed tasks`);
        if (completedTasks.length > 0) {
            console.log('[Profile] Sample task:', completedTasks[0]);
        }

        // Group tasks by project
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
                taskId: task._id,
                title: task.title,
                description: task.description,
                completedAt: task.updatedAt,
                githubLink: task.github_link,
                feedback: task.feedback
            });
        });

        // Fetch projects where the user is the leader (creator) and the project is completed
        const leaderProjects = await Project.find({ 
            user_id: id, 
            status: 'completed' 
        }).select('_id title description completedAt updatedAt').lean();

        console.log(`[Profile] Found ${leaderProjects.length} completed projects as leader`);

        const completedAsLeader = leaderProjects.map(project => ({
            projectId: project._id,
            projectTitle: project.title,
            description: project.description,
            completedAt: project.completedAt || project.updatedAt
        }));

        const user = {
            id: u._id, name: u.name || 'Unknown', email: u.email || '', 
            avatarUrl: u.profileImageUrl || u.profileImage || null, bio: u.about || u.bio || '',
            skills: Array.isArray(u.skills) ? u.skills : (u.skills ? String(u.skills).split(',').map(s => s.trim()).filter(Boolean) : []),
            interests: Array.isArray(u.interests) ? u.interests : (u.interests ? String(u.interests).split(',').map(s => s.trim()).filter(Boolean) : []),
            resumeUrl: u.resumeUrl || null, joinedAt: u.createdAt || u.created_at || null,
            joinedAgo: u.createdAt ? getTimeAgo(u.createdAt) : 'N/A', // Use helper function
            completedProjects: Object.values(tasksByProject),
            totalCompletedTasks: completedTasks.length,
            completedAsLeader: completedAsLeader
        };

        return res.json({ success: true, user });
    } catch (err) {
        console.error('Error in /profile-data/:id', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// =========================================================================
// 8. Simple Content Routes (FAQ, Messages) - CONVERTED TO JSON API
// =========================================================================
exports.getMessages = (req, res) => {
    // React will now fetch data and render the messages shell.
    res.json({ success: true, message: "Messages shell loaded." });
};

exports.getFAQ = (req, res) => {
    // React will now fetch data and render the FAQ shell.
    res.json({ success: true, message: "FAQ shell loaded." });
};