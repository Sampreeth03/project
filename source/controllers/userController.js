// controllers/userController.js (UPDATED FOR API)

const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const { User, UserMetrics, Project, ProjectMember, JobApplication, Task, Doubt, Reply, Message, DirectMessage } = require("../database");
const { getNavLinks, getTimeAgo } = require("../services/helperService"); 
const { upload } = require("../middleware/uploadMiddleware");
const { signToken, COOKIE_NAME, COOKIE_OPTIONS } = require('../config/jwt');

// =========================================================================
// 1. User Home Page (GET /home) - CONVERTED TO JSON API
//    Public endpoint: returns user if session exists, else null
// =========================================================================
exports.getHome = async (req, res) => {
    const hasSession = !!req.user;
    
    if (!hasSession) {
        return res.json({
            success: true,
            message: "User home data requested.",
            user: null
        });
    }
    
    try {
        // Fetch user from database to get onboardingCompleted status and profile fields
        const dbUser = await User.findById(req.user.id).select('onboardingCompleted about skills interests resumeUrl profileImageUrl');
        
        // Debug: Log the actual database values
        console.log('[Profile Check] User ID:', req.user.id);
        console.log('[Profile Check] DB User fields:', {
            about: dbUser?.about,
            skills: dbUser?.skills,
            interests: dbUser?.interests,
            profileImageUrl: dbUser?.profileImageUrl,
            resumeUrl: dbUser?.resumeUrl
        });
        
        // Check each profile field individually (true = filled, false = not filled)
        const profileFields = {
            aboutMe: !!(dbUser?.about && dbUser.about.trim().length > 0),
            skills: !!(dbUser?.skills && dbUser.skills.length > 0),
            interests: !!(dbUser?.interests && dbUser.interests.length > 0),
            profilePicture: !!(dbUser?.profileImageUrl && dbUser.profileImageUrl.trim().length > 0),
            resume: !!(dbUser?.resumeUrl && dbUser.resumeUrl.trim().length > 0)
        };
        
        console.log('[Profile Check] Field status:', profileFields);
        
        // Profile is complete only if ALL fields are true
        const isProfileComplete = profileFields.aboutMe && 
            profileFields.skills && 
            profileFields.interests && 
            profileFields.profilePicture && 
            profileFields.resume;
        
        // Determine which fields are missing (false)
        const missingFields = [];
        if (!profileFields.aboutMe) missingFields.push('About Me');
        if (!profileFields.skills) missingFields.push('Skills');
        if (!profileFields.interests) missingFields.push('Interests');
        if (!profileFields.profilePicture) missingFields.push('Profile Picture');
        if (!profileFields.resume) missingFields.push('Resume');
        
        const user = {
            id: req.user.id,
            name: req.user.name,
            role: req.user.role,
            email: req.user.email,
            onboardingCompleted: dbUser?.onboardingCompleted === true, // false if undefined or false
            isProfileComplete: isProfileComplete,
            profileFields: profileFields, // Individual field status
            missingFields: missingFields
        };

        res.json({
            success: true,
            message: "User home data requested.",
            user
        });
    } catch (err) {
        console.error('Error fetching user for home:', err);
        res.json({
            success: true,
            message: "User home data requested.",
            user: {
                id: req.user.id,
                name: req.user.name,
                role: req.user.role,
                email: req.user.email,
                onboardingCompleted: true, // Default to true on error to prevent repeated onboarding
                isProfileComplete: true,
                profileFields: {
                    aboutMe: true,
                    skills: true,
                    interests: true,
                    profilePicture: true,
                    resume: true
                },
                missingFields: []
            }
        });
    }
};

// =========================================================================
// 1b. Complete Onboarding (POST /complete-onboarding)
//     Marks the user's onboarding as completed
// =========================================================================
exports.completeOnboarding = async (req, res) => {
    if (!req.user) {
        return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    try {
        await User.findByIdAndUpdate(req.user.id, { onboardingCompleted: true });
        res.json({ success: true, message: 'Onboarding completed' });
    } catch (err) {
        console.error('Error completing onboarding:', err);
        res.status(500).json({ success: false, error: 'Server error' });
    }
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
// 3. Dashboard Metrics API (GET /api/dashboard-metrics)
// =========================================================================
exports.getDashboardMetrics = async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const userId = req.user.id;

    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        let metrics = await UserMetrics.findOne({ user_id: new mongoose.Types.ObjectId(userId) });
        if (!metrics) {
            metrics = await UserMetrics.create({ user_id: new mongoose.Types.ObjectId(userId) });
        }

        const completedProjects = await Project.find({ user_id: userId, status: 'completed' });

        // --- Chart data ---
        const topicNames = ['Web Development', 'Cyber Security', 'Robotics', 'Data Science', 'Deep Learning', 'Blockchain'];

        // 1) Projects I created, grouped by topic
        const myProjects = await Project.find({ user_id: userId }).lean();
        const topicProjects = topicNames.map(t => ({
            topic: t,
            count: myProjects.filter(p => p.topic === t).length
        }));

        // 2) Projects I joined (as member) that I did NOT create, grouped by topic
        const memberDocs = await ProjectMember.find({ user_id: userId }).lean();
        const joinedProjectIds = memberDocs.map(m => m.project_id);
        const joinedProjects = await Project.find({
            _id: { $in: joinedProjectIds },
            user_id: { $ne: userId }
        }).lean();
        const joinedByTopic = topicNames.map(t => ({
            topic: t,
            count: joinedProjects.filter(p => p.topic === t).length
        }));

        // 3) Job application stats (applied by me)
        const myApps = await JobApplication.find({ user_id: userId }).lean();
        const jobStats = {
            total: myApps.length,
            pending: myApps.filter(a => a.status === 'Pending' || a.status === 'Waiting').length,
            approved: myApps.filter(a => a.status === 'Approved').length,
            rejected: myApps.filter(a => a.status === 'Rejected').length
        };

        res.json({
            username: user.name,
            metrics,
            completedProjects,
            topicProjects,
            joinedByTopic,
            jobStats
        });

    } catch (err) {
        console.error('Error fetching dashboard metrics:', err);
        res.status(500).json({ error: 'Server error' });
    }
};

// =========================================================================
// 3b. Dashboard Trends API (GET /api/dashboard-trends)
// =========================================================================
exports.getDashboardTrends = async (req, res) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const userId = req.user.id;
    const userObjId = new mongoose.Types.ObjectId(userId);

    try {
        const now = new Date();
        const twelveWeeksAgo = new Date(now);
        twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 84);

        // Generate 12 weekly buckets
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

        // 1. Project Growth — members joining user's projects
        const userProjIds = (await Project.find({ user_id: userId }).select('_id').lean()).map(p => p._id);
        const memberJoins = await ProjectMember.find({
            project_id: { $in: userProjIds },
            user_id: { $ne: userId },
            joined_at: { $gte: twelveWeeksAgo }
        }).lean();
        const memberGrowth = weeks.map(w => ({
            label: w.label,
            count: memberJoins.filter(m => inWeek(m.joined_at, w)).length
        }));

        // 2. Creation vs Participation
        const createdProjs = await Project.find({ user_id: userId, createdAt: { $gte: twelveWeeksAgo } }).lean();
        const myMemberships = await ProjectMember.find({ user_id: userId, joined_at: { $gte: twelveWeeksAgo } }).lean();
        const joinedNotMineIds = new Set(
            (await Project.find({ _id: { $in: myMemberships.map(m => m.project_id) }, user_id: { $ne: userId } })
                .select('_id').lean()).map(p => p._id.toString())
        );
        const projectComparison = weeks.map(w => ({
            label: w.label,
            created: createdProjs.filter(p => inWeek(p.createdAt, w)).length,
            joined: myMemberships.filter(m => joinedNotMineIds.has(m.project_id.toString()) && inWeek(m.joined_at, w)).length
        }));

        // 3. Task Progress (cumulative)
        const doneTasks = await Task.find({ assigned_to: userObjId, status: 'Completed' }).lean();
        doneTasks.sort((a, b) => a._id.getTimestamp() - b._id.getTimestamp());
        let prior = doneTasks.filter(t => t._id.getTimestamp() < twelveWeeksAgo).length;
        const taskProgress = weeks.map(w => {
            const c = doneTasks.filter(t => inWeek(t._id.getTimestamp(), w)).length;
            prior += c;
            return { label: w.label, cumulative: prior, count: c };
        });

        // 4. Community — doubts vs replies
        const myDoubts = await Doubt.find({ user_id: userObjId, createdAt: { $gte: twelveWeeksAgo } }).lean();
        const myReplies = await Reply.find({ user_id: userObjId, createdAt: { $gte: twelveWeeksAgo } }).lean();
        const communityTrend = weeks.map(w => ({
            label: w.label,
            doubts: myDoubts.filter(d => inWeek(d.createdAt, w)).length,
            replies: myReplies.filter(r => inWeek(r.createdAt, w)).length
        }));

        // 5. Job Application Activity
        const myApps = await JobApplication.find({ user_id: userId, createdAt: { $gte: twelveWeeksAgo } }).lean();
        const jobActivity = weeks.map(w => {
            const wa = myApps.filter(a => inWeek(a.createdAt, w));
            return {
                label: w.label,
                total: wa.length,
                pending: wa.filter(a => a.status === 'Pending' || a.status === 'Waiting').length,
                approved: wa.filter(a => a.status === 'Approved').length,
                rejected: wa.filter(a => a.status === 'Rejected').length
            };
        });

        // 6. Activity Heatmap (91 days)
        const d91 = new Date(now);
        d91.setDate(d91.getDate() - 91);
        d91.setHours(0, 0, 0, 0);

        const [msgs, dms, hmTasks, hmDoubts, hmReplies, hmMembers] = await Promise.all([
            Message.find({ sender_id: userObjId, created_at: { $gte: d91 } }).select('created_at').lean(),
            DirectMessage.find({ sender_id: userObjId, created_at: { $gte: d91 } }).select('created_at').lean(),
            Task.find({ assigned_to: userObjId }).lean(),
            Doubt.find({ user_id: userObjId, createdAt: { $gte: d91 } }).select('createdAt').lean(),
            Reply.find({ user_id: userObjId, createdAt: { $gte: d91 } }).select('createdAt').lean(),
            ProjectMember.find({ user_id: userId, joined_at: { $gte: d91 } }).select('joined_at').lean()
        ]);

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

        msgs.forEach(m => addDay(m.created_at));
        dms.forEach(m => addDay(m.created_at));
        hmTasks.forEach(t => addDay(t._id.getTimestamp()));
        hmDoubts.forEach(d => addDay(d.createdAt));
        hmReplies.forEach(r => addDay(r.createdAt));
        hmMembers.forEach(m => addDay(m.joined_at));

        const maxAct = Math.max(...Object.values(dayMap), 1);
        const activityHeatmap = Object.entries(dayMap)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, count]) => ({
                date,
                count,
                level: count === 0 ? 0 : Math.min(Math.ceil((count / maxAct) * 4), 4)
            }));

        res.json({ memberGrowth, projectComparison, taskProgress, communityTrend, jobActivity, activityHeatmap });
    } catch (err) {
        console.error('Error fetching dashboard trends:', err);
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
    const targetId = req.params.id || req.user.id;

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
    const userId = req.user?.id || null;
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

        // Re-issue JWT with updated name/email so token stays fresh
        if (req.user && String(req.user.id) === String(user._id)) {
            const newToken = signToken({ id: user._id.toString(), name: user.name, email: user.email, role: req.user.role });
            res.cookie(COOKIE_NAME, newToken, COOKIE_OPTIONS);
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
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
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

// ========= Friends & Search APIs =========

exports.searchUsers = async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ users: [] });

    try {
        const regex = new RegExp(q, 'i');
        const users = await User.find({
            $or: [ { name: regex }, { email: regex } ],
            _id: { $ne: req.user.id }
        }).select('name email profileImageUrl').limit(20).lean();

        // Enrich with friend request status
        const FriendRequest = require('../database').FriendRequest;
        const currentId = req.user.id;
        const userIds = users.map(u => u._id);
        const existing = await FriendRequest.find({
            $or: [
                { from_user: currentId, to_user: { $in: userIds } },
                { from_user: { $in: userIds }, to_user: currentId }
            ]
        }).lean();

        const map = {};
        existing.forEach(r => { map[String(r.from_user)] = r; map[String(r.to_user)] = r; });

        const out = users.map(u => ({
            ...u,
            requestStatus: (map[String(u._id)] && String(map[String(u._id)].from_user) === currentId) ? 'pending_sent' : (map[String(u._id)] && map[String(u._id)].status === 'accepted' ? 'friends' : (map[String(u._id)] ? 'pending_received' : 'none'))
        }));

        res.json({ users: out });
    } catch (err) {
        console.error('Search users error:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.sendFriendRequest = async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
    const { toUserId } = req.body;
    const fromUserId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(toUserId)) return res.status(400).json({ success: false, message: 'Invalid user id' });
    if (toUserId === fromUserId) return res.status(400).json({ success: false, message: 'Cannot send request to yourself' });

    try {
        const FriendRequest = require('../database').FriendRequest;

        const exists = await FriendRequest.findOne({
            $or: [
                { from_user: fromUserId, to_user: toUserId },
                { from_user: toUserId, to_user: fromUserId }
            ]
        });
        if (exists) return res.json({ success: false, message: 'Friend request already exists' });

        await FriendRequest.create({ from_user: fromUserId, to_user: toUserId });
        await require('../database').Notification.create({ user_id: toUserId, message: `${req.user.name} sent you a friend request`, type: 'other' });
        res.json({ success: true, message: 'Request sent' });
    } catch (err) {
        console.error('Send friend request error:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getFriendRequests = async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
    try {
        const FriendRequest = require('../database').FriendRequest;
        const requests = await FriendRequest.find({ to_user: req.user.id, status: 'pending' }).populate('from_user', 'name email').lean();
        res.json({ requests });
    } catch (err) {
        console.error('Get friend requests error:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.respondFriendRequest = async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
    const { requestId, action } = req.body;
    if (!['accept','reject'].includes(action)) return res.status(400).json({ success: false, message: 'Invalid action' });

    try {
        const FriendRequest = require('../database').FriendRequest;
        const reqDoc = await FriendRequest.findById(requestId);
        if (!reqDoc) return res.status(404).json({ success: false, message: 'Request not found' });
        if (String(reqDoc.to_user) !== req.user.id) return res.status(403).json({ success: false, message: 'Unauthorized' });

        reqDoc.status = action === 'accept' ? 'accepted' : 'rejected';
        await reqDoc.save();

        if (action === 'accept') {
            await require('../database').Notification.create({ user_id: reqDoc.from_user, message: `${req.user.name} accepted your friend request`, type: 'other' });
        } else {
            await require('../database').Notification.create({ user_id: reqDoc.from_user, message: `${req.user.name} rejected your friend request`, type: 'other' });
        }

        res.json({ success: true });
    } catch (err) {
        console.error('Respond friend request error:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.getFriends = async (req, res) => {
    if (!req.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
    try {
        const FriendRequest = require('../database').FriendRequest;
        const rels = await FriendRequest.find({ $or: [ { from_user: req.user.id }, { to_user: req.user.id } ], status: 'accepted' }).lean();
        const friendIds = rels.map(r => (String(r.from_user) === req.user.id ? r.to_user : r.from_user));
        const friends = await User.find({ _id: { $in: friendIds } }).select('name email profileImageUrl').lean();
        res.json({ friends });
    } catch (err) {
        console.error('Get friends error:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
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