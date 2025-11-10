// controllers/userController.js

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
// NOTE: Assuming models path. Please confirm or update path to your models!
const { User, UserMetrics, Project } = require("../database"); 
const { getNavLinks, getTimeAgo } = require("../services/helperService"); 
const { upload } = require("../middleware/uploadMiddleware"); // Used in postProfile

// =========================================================================
// Middleware Helper (Temporary check, will be centralized later)
// =========================================================================
const isAuthenticated = (req, res, next) => {
    if (!req.session.user) return res.redirect('/login');
    next();
};

// =========================================================================
// 1. User Home Page (GET /home)
// =========================================================================
exports.getHome = (req, res) => {
    if (!req.session.user || req.session.user.role !== "user") {
        return res.redirect("/login");
    }
    // Access navData via direct require (since it's not a route handler argument)
    const { navData } = require('../config/constants');
    res.render("user-home", { 
        user: req.session.user, 
        homeUrl: navData.homeUrl, 
        navLinks: navData.navLinks 
    });
};

// =========================================================================
// 2. Dashboard Page (GET /dashboard)
// =========================================================================
exports.getDashboard = (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const { navData } = require('../config/constants');
    res.render('dashboard', {
        homeUrl: navData.homeUrl,
        navLinks: navData.navLinks
    });
};

// =========================================================================
// 3. Dashboard Metrics API (GET /api/dashboard-metrics)
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
// 4. User Topics API (GET /home/topics)
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
// 5. User Profile Page (GET /profile and GET /profile/:id)
// =========================================================================
exports.getProfile = async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    // Allows viewing personal profile or public profile of another user
    const targetId = req.params.id || req.session.user.id;

    if (!mongoose.Types.ObjectId.isValid(targetId)) {
        return res.status(400).send('Invalid user id');
    }
    
    try {
        const user = await User.findById(targetId).lean();
        if (!user) return res.status(404).send('User not found');
        
        const { navData } = require('../config/constants');

        res.render('profile', {
            user,
            homeUrl: navData.homeUrl,
            navLinks: getNavLinks(req.session.user),
            query: req.query || {}
        });
    } catch (err) {
        console.error('Error loading profile:', err.message);
        res.redirect('/home?error=Failed to load profile');
    }
};

// =========================================================================
// 6. Update Profile (POST /profile)
// =========================================================================
exports.postProfile = async (req, res) => {
    // Multer upload logic is run before this controller function
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
// 7. Lightweight Profile Data API (GET /profile-data/:id)
// =========================================================================
exports.getProfileData = async (req, res) => {
    if (!req.session.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid user id' });
    
    try {
        const u = await User.findById(id).lean();
        if (!u) return res.status(404).json({ success: false, message: 'User not found' });

        const user = {
            id: u._id, name: u.name || 'Unknown', email: u.email || '', 
            avatarUrl: u.profileImageUrl || u.profileImage || null, bio: u.about || u.bio || '',
            skills: Array.isArray(u.skills) ? u.skills : (u.skills ? String(u.skills).split(',').map(s => s.trim()).filter(Boolean) : []),
            interests: Array.isArray(u.interests) ? u.interests : (u.interests ? String(u.interests).split(',').map(s => s.trim()).filter(Boolean) : []),
            resumeUrl: u.resumeUrl || null, joinedAt: u.createdAt || u.created_at || null,
            joinedAgo: u.createdAt ? getTimeAgo(u.createdAt) : 'N/A' // Use helper function
        };

        return res.json({ success: true, user });
    } catch (err) {
        console.error('Error in /profile-data/:id', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

// =========================================================================
// 8. Simple Content Routes (FAQ, Messages)
// =========================================================================
const { navData } = require('../config/constants');
exports.getMessages = (req, res) => {
    // These views should typically require authentication, but original code did not.
    res.render("group", { user: req.session.user || null, homeUrl: navData.homeUrl, navLinks: navData.navLinks });
};

exports.getFAQ = (req, res) => {
    res.render("faqpage", { user: req.session.user || null, homeUrl: navData.homeUrl, navLinks: navData.navLinks });
};