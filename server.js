    const express = require("express");
    const session = require("express-session");
    const bodyParser = require("body-parser");
    const path = require("path");
    const multer = require("multer");
    const mongoose = require("mongoose");
    const bcrypt = require("bcrypt");

    const { User, UserMetrics, Doubt, Reply, JobApplication, Project, ProjectMember, JoinRequest, Task, Notification } = require("./database");

    const validatePassword = (password) => {
        const regex = /^(?=.*[A-Z])(?=.*[!@#$%^&*])[A-Za-z\d!@#$%^&*]{6,}$/;
        return regex.test(password);
    };
    const fs = require('fs');
    const app = express();
    const PORT = 3000;

    app.use(express.json());
    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, 'views'));


 const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const extension = path.extname(file.originalname);
        cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
    }
});

const upload = multer({ storage: storage });

    app.use(bodyParser.urlencoded({ extended: true }));
    app.use(express.static("public"));
    app.use("/uploads", express.static("uploads"));

    app.use(
        session({
            secret: "your-secret-key",
            resave: false,
            saveUninitialized: true,
        })
    );

    const navData = {
        homeUrl: "/home",
        navLinks: [
            { name: "Home", href: "/home" },
            { name: "Clear Doubts", href: "/clear" },
            {
                name: "Projects",
                href: "#",
                submenu: [
                    { name: "Projects", href: "/project" },
                    {name: "Joined Projects",href:"/joined-projects"},
                    { name: "Interact", href: "/messages" }
                ]
            },
            {
                name: "Notifications",
                href: "/not",
                submenu: [
                    { name: "Project Notifications", href: "/not" },
                    { name: "Job Notifications", href: "/job_not" }
                ]
            },
            {
                name: "Jobs",
                href: "/apply",
                submenu: [
                    { name: "Apply for Jobs", href: "/apply" },
                    { name: "Your Applications", href: "/job" }
                ]
            },
            {
                name: "You",
                href: "/dashboard",
                submenu: [
                    { name: "Dashboard", href: "/dashboard" },
                    { name: "Profile", href: "/profile" }
                ]
            },
            { name: "FAQ", href: "/FAQ" }
        ]
    };

    const MONGODB_URI = 'mongodb://localhost:27017/page-check';

    async function setupDefaultProjects() {
        try {
            const srihesh = await User.findOne({ name: 'Srihesh' });
            const priya = await User.findOne({ name: 'Priya' });

            const defaultProjects = [
                {
                    title: 'RelabTeams',
                    description: 'RelabTeam is a shared immutable ledger that facilitates the process of recording transactions and tracking assets across a business network',
                    capacity: 5,
                    user_id: srihesh._id,
                    status: 'active',
                    topic: 'Web Development',
                    deadline: new Date('2023-12-31'),
                    created_at: new Date()
                }
            ];

            for (const projectData of defaultProjects) {
                const existingProject = await Project.findOne({ title: projectData.title, user_id: projectData.user_id });
                if (!existingProject) {
                    const project = await Project.create(projectData);
                    console.log(`Created default project: ${project.title} for user ${project.user_id}`);

                    await ProjectMember.create({
                        project_id: project._id,
                        user_id: project.user_id,
                        joined_at: new Date()
                    });
                    console.log(`Added creator as member for project: ${project.title}`);

                    await UserMetrics.findOneAndUpdate(
                        { user_id: project.user_id },
                        { $inc: { active_projects: 1, leadership_roles: 1, total_collaborations: 1 } },
                        { upsert: true }
                    );
                    console.log(`Updated UserMetrics for user ${project.user_id}`);
                } else {
                    console.log(`Project ${projectData.title} already exists, skipping creation`);
                }
            }
        } catch (err) {
            console.error('Error setting up default projects:', err.message);
        }
    }

    async function updateReplies() {
        try {
            await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
            console.log('Connected to MongoDB for migration');

            const replies = await Reply.find({ user_id: { $exists: false } }).populate("doubt_id");
            for (const reply of replies) {
                if (reply.doubt_id && reply.doubt_id.user_id) {
                    await Reply.updateOne(
                        { _id: reply._id },
                        { $set: { user_id: reply.doubt_id.user_id } }
                    );
                    console.log(`Updated reply ${reply._id} with user_id`);
                }
            }
            console.log("Replies updated with user_id field");
        } catch (err) {
            console.error("Error updating replies:", err.message);
        }
    }
    updateReplies();

    async function setupDefaultUsers() {
        const saltRounds = 10;
        try {
            const defaultUsers = [
                {
                    name: 'Srihesh',
                    email: 'srihesh@gm.co',
                    password: await bcrypt.hash('Srih@12345', saltRounds),
                    role: 'user',
                    verified: true,
                },
                {
                    name: 'Priya',
                    email: 'priya@gm.co',
                    password: await bcrypt.hash('Srih@12345', saltRounds),
                    role: 'user',
                    verified: true,
                },
                {
                    name: 'Shiva',
                    email: 'shiva@gm.co',
                    password: await bcrypt.hash('Srih@12345', saltRounds),
                    role: 'recruiter',
                    verified: true,
                },
                {
                    name: 'Arjun',
                    email: 'arjun@gm.co',
                    password: await bcrypt.hash('Srih@12345', saltRounds),
                    role: 'admin',
                    verified: true,
                },
            ];

            for (const userData of defaultUsers) {
                const existingUser = await User.findOne({ email: userData.email });
                if (!existingUser) {
                    const user = await User.create(userData);
                    console.log(`Created default ${userData.role}: ${userData.email}`);
                    if (userData.role !== 'admin') {
                        await UserMetrics.create({ user_id: user._id });
                        console.log(`Created UserMetrics for ${userData.email}`);
                    }
                } else {
                    console.log(`User ${userData.email} already exists, skipping creation`);
                }
            }
        } catch (err) {
            console.error('Error setting up default users:', err.message);
        }
    }

    mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
        .then(async () => {
            console.log('Connected to MongoDB');
            
            await setupDefaultUsers();

            async function updateDoubts() {
                try {
                    const doubts = await Doubt.find({ author: { $exists: false } }).populate("user_id");
                    for (const doubt of doubts) {
                        if (doubt.user_id) {
                            await Doubt.updateOne(
                                { _id: doubt._id },
                                { $set: { author: doubt.user_id.name } }
                            );
                            console.log(`Updated doubt ${doubt._id} with author: ${doubt.user_id.name}`);
                        } else {
                            console.log(`Doubt ${doubt._id} has no user_id, skipping`);
                        }
                    }
                    console.log("Doubts updated with author field");
                } catch (err) {
                    console.error("Error updating doubts:", err.message);
                }
            }
            await setupDefaultProjects();
            await updateDoubts();
        })
        .catch(err => {
            console.error('Error connecting to MongoDB:', err.message);
            process.exit(1);
        });

        app.get('/dashboard', async (req, res) => {
            if (!req.session.user) {
                return res.redirect('/login');
            }
            const userId = req.session.user.id;
            try {
                const user = await User.findById(userId);
                if (!user) {
                    console.error('User not found for ID:', userId);
                    return res.redirect('/login?error=User not found');
                }
                let metrics = await UserMetrics.findOne({ user_id: new mongoose.Types.ObjectId(userId) });
                if (!metrics) {
                    console.log(`No metrics found for user ${userId}, creating new document...`);
                    metrics = await UserMetrics.create({ user_id: new mongoose.Types.ObjectId(userId) });
                }
                console.log(`Metrics fetched for user ${userId}:`, {
                    leadership_roles: metrics.leadership_roles,
                    total_collaborations: metrics.total_collaborations,
                    active_projects: metrics.active_projects,
                    projects_as_member: metrics.projects_as_member
                });
                const completedProjects = await Project.find({ user_id: userId, status: 'completed' });
                const userData = { username: user.name, metrics };
                res.render('dashboard', {
                    userData,
                    completedProjects: completedProjects || [],
                    inquiriesInitiated: metrics.inquiriesInitiated || 0,
                    solutionsProvided: metrics.solutions_provided || 0,
                    homeUrl: navData.homeUrl,
                    navLinks: navData.navLinks
                });
            } catch (err) {
                console.error('Error in dashboard route:', err.message, { stack: err.stack });
                res.redirect('/doubt?error=Failed to load dashboard');
            }
        });
        const userNav = {
            homeUrl: "/home",
            navLinks: [
                { name: "Home", href: "/home" },
                { name: "Projects", href: "/project" },
                { name: "Doubts", href: "/doubt" },
                { name: "Jobs", href: "/apply" },
                {
                    name: "Profile",
                    href: "/profile",
                    submenu: [
                        { name: "Profile", href: "/profile" },
                        { name: "Dashboard", href: "/dashboard" }
                    ]
                }
            ]
        };
    app.get('/', (req, res) => {
        res.render("landing", { error: null });
    });

    app.get("/login", (req, res) => {
        res.render("login", { error: null });
    });

    app.post("/login", async (req, res) => {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.render("login", { error: "Email and password are required" });
        }

        if (!validatePassword(password)) {
            return res.render("login", { 
                error: "Password must be at least 6 characters long, contain one uppercase letter, and one special character (e.g., !@#$%^&*)" 
            });
        }

        try {
            const user = await User.findOne({ email });
            if (!user) {
                return res.render("login", { error: "Invalid email or password" });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.render("login", { error: "Invalid email or password" });
            }

            req.session.user = { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
            console.log('Logged in user:', req.session.user);
            if (user.role === "admin") return res.redirect("/admin");
            if (user.role === "recruiter") return res.redirect("/recruiter-home");
            res.redirect("/home");
        } catch (err) {
            console.error('Error in login:', err.message);
            res.render("login", { error: "Server error" });
        }
    });

    app.get('/available-projects', async (req, res) => {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        const userId = req.session.user.id;

        try {
            const availableProjects = await Project.aggregate([
                {
                    $lookup: {
                        from: 'projectmembers',
                        localField: '_id',
                        foreignField: 'project_id',
                        as: 'members'
                    }
                },
                {
                    $lookup: {
                        from: 'joinrequests',
                        localField: '_id',
                        foreignField: 'project_id',
                        as: 'join_requests'
                    }
                },
                {
                    $addFields: {
                        member_count: { $size: '$members' },
                        is_member: {
                            $in: [new mongoose.Types.ObjectId(userId), '$members.user_id']
                        },
                        has_pending_request: {
                            $in: [new mongoose.Types.ObjectId(userId), '$join_requests.user_id']
                        }
                    }
                },
                {
                    $match: {
                        user_id: { $ne: new mongoose.Types.ObjectId(userId) }
                    }
                }
            ]);

            res.render('projects-list', {
                user: req.session.user,
                createdProjects: [],
                availableProjects: availableProjects || [],
                navLinks: getNavLinks(req.session.user),
                homeUrl: '/dashboard'
            });
        } catch (err) {
            console.error('Error fetching available projects:', err.message);
            res.status(500).send('Server Error');
        }
    });

    app.post('/create-project', async (req, res) => {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { title, description, capacity, topic, deadline } = req.body;
        const userId = req.session.user.id;

         // Count projects owned by this user (use ObjectId for exact match)
        const userProjectCount = await Project.countDocuments({ user_id: new mongoose.Types.ObjectId(userId) });
        // Interpret paid flag (accept boolean true or string 'true'/'1')
        const paidFlag = req.body && (req.body.paid === true || req.body.paid === 'true' || req.body.paid === '1');
        if (userProjectCount >= 3 && !paidFlag) {
            // If user has reached the free limit and hasn't paid, ask for payment
            return res.json({ requirePayment: true });
        }

        if (!title || !description || !capacity || !topic || !deadline) {
            return res.status(400).json({ success: false, message: 'All fields are required' });
        }

        // Normalize topic to match expected values
        const normalizedTopic = topicNormalizationMap[topic.toLowerCase()] || topic;

        try {
            const project = await Project.create({
                user_id: new mongoose.Types.ObjectId(userId),
                title,
                description,
                capacity,
                topic: normalizedTopic, // Use normalized topic
                deadline,
                status: 'active',
                created_at: new Date()
            });

            await ProjectMember.create({
                project_id: project._id,
                user_id: new mongoose.Types.ObjectId(userId),
                joined_at: new Date()
            });

            await UserMetrics.findOneAndUpdate(
                { user_id: new mongoose.Types.ObjectId(userId) },
                { 
                    $inc: { 
                        active_projects: 1, 
                        total_collaborations: 1, 
                        leadership_roles: 1 
                    } 
                },
                { upsert: true }
            );

            await Notification.create({
                user_id: new mongoose.Types.ObjectId(userId),
                message: `Project "${title}" has been successfully created.`,
                task_id: null,
                type: 'project_creation'
            });

            res.json({ success: true, message: 'Project created successfully', projectId: project._id });
        } catch (err) {
            console.error('Error creating project:', err.message);
            res.status(500).json({ success: false, message: 'Failed to create project: ' + err.message });
        }
    });

    app.post('/join-project', async (req, res) => {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { projectId } = req.body;
        const userId = req.session.user.id;

        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).json({ success: false, message: 'Invalid project ID' });
        }

        if (!mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid user ID' });
        }

        try {
            const isMember = await ProjectMember.findOne({
                project_id: new mongoose.Types.ObjectId(projectId),
                user_id: new mongoose.Types.ObjectId(userId)
            });
            if (isMember) {
                return res.json({ success: false, message: 'You are already a member of this project' });
            }

            const project = await Project.findById(projectId);
            if (!project) {
                return res.status(404).json({ success: false, message: 'Project not found' });
            }
            if (project.user_id.toString() === userId) {
                return res.json({ success: false, message: 'You cannot join your own project' });
            }

            const existingRequest = await JoinRequest.findOne({
                project_id: new mongoose.Types.ObjectId(projectId),
                user_id: new mongoose.Types.ObjectId(userId)
            });
            if (existingRequest) {
                return res.json({ success: false, message: 'You have already requested to join this project' });
            }

            const memberCount = await ProjectMember.countDocuments({ project_id: projectId });
            if (memberCount >= project.capacity) {
                return res.json({ success: false, message: 'This project is full' });
            }

            await JoinRequest.create({
                project_id: new mongoose.Types.ObjectId(projectId),
                user_id: new mongoose.Types.ObjectId(userId),
                status: 'pending',
                requested_at: new Date()
            });

            await Notification.create({
                user_id: project.user_id,
                message: `User ${req.session.user.name || userId} has requested to join your project "${project.title}"`,
                task_id: null,
                type: 'join_request'
            });

            res.json({ success: true, message: 'Join request sent successfully' });
        } catch (err) {
            console.error('Error joining project:', err.message, { stack: err.stack, projectId, userId });
            res.status(500).json({ success: false, message: 'Failed to join project: ' + err.message });
        }
    });

    app.post('/reject-join-request', async (req, res) => {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { requestId } = req.body;
        const userId = req.session.user.id;

        if (!mongoose.Types.ObjectId.isValid(requestId)) {
            return res.status(400).json({ success: false, message: 'Invalid request ID' });
        }

        try {
            const joinRequest = await JoinRequest.findById(requestId).populate('project_id');
            if (!joinRequest) {
                return res.status(404).json({ success: false, message: 'Join request not found' });
            }

            const project = joinRequest.project_id;
            if (project.user_id.toString() !== userId) {
                return res.status(403).json({ success: false, message: 'Only the project creator can reject join requests' });
            }

            if (joinRequest.status !== 'pending') {
                return res.json({ success: false, message: 'This request has already been processed' });
            }

            joinRequest.status = 'rejected';
            await joinRequest.save();

            res.json({ success: true, message: 'Join request rejected successfully' });
        } catch (err) {
            console.error('Error rejecting join request:', err.message);
            res.status(500).json({ success: false, message: 'Failed to reject join request: ' + err.message });
        }
    });

    app.post('/delete-join-request', async (req, res) => {
        const { requestId } = req.body;
        const creatorId = req.session.user.id;

        try {
            const request = await JoinRequest.findOne({ _id: requestId })
                .populate({ path: 'project_id', match: { user_id: creatorId } });
            if (!request || !request.project_id) {
                return res.status(403).json({ success: false, error: 'Unauthorized or request not found' });
            }

            await JoinRequest.deleteOne({ _id: requestId });
            res.json({ success: true });
        } catch (err) {
            console.error('Error deleting join request:', err.message);
            res.status(500).json({ success: false, error: 'Failed to delete request' });
        }
    });

    app.get("/home", (req, res) => {
        if (!req.session.user || req.session.user.role !== "user") {
            return res.redirect("/login");
        }
        res.render("user-home", { user: req.session.user, homeUrl: navData.homeUrl, navLinks: navData.navLinks });
    });

    app.get("/recruiter-home", (req, res) => {
        if (!req.session.user || req.session.user.role !== "recruiter") {
            return res.redirect("/login");
        }
        const recruiterNav = {
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
        };
        res.render("recruiter-home", { user: req.session.user, ...recruiterNav });
    });

    app.get("/rec-job", async (req, res) => {
        console.log('Accessing /rec-job, session:', req.session.user);
        if (!req.session.user || req.session.user.role !== "recruiter") {
            return res.redirect("/login");
        }
    
        try {
            const user = await User.findById(req.session.user.id).lean();
            if (!user) {
                return res.redirect("/login");
            }
    
            const recruiterId = req.session.user.id;
            const navData = {
                homeUrl: "/recruiter-home",
                navLinks: [
                    { href: "/recruiter-home", name: "Home" },
                    { href: "/rec-job", name: "Create Jobs" },
                    { href: "/rec-app", name: "Applications" },
                    { href: "/recruiter-dashboard", name: "Dashboard" }

                ]
            };

            const totalJobs = await JobApplication.countDocuments({ posted_by: recruiterId, user_id: null });
            const totalParticipants = await JobApplication.countDocuments({ posted_by: recruiterId, user_id: { $ne: null } });
            const activeJobs = await JobApplication.countDocuments({ posted_by: recruiterId, active: 1, user_id: null });

            const postedJobs = await JobApplication.find({ posted_by: recruiterId, user_id: null }).lean();

            console.log('totalJobs:', totalJobs);
            console.log('totalParticipants:', totalParticipants);
            console.log('activeJobs:', activeJobs);
            console.log('postedJobs:', postedJobs);

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
    });

    app.get("/recruiter-dashboard", async (req, res) => {
        if (!req.session.user || req.session.user.role !== "recruiter") {
            return res.redirect("/login");
        }

        const recruiterNav = {
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
                }
            ]
        };   

        const recruiterId = req.session.user.id;

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
    });


    app.get('/rec-app', async (req, res) => {
        if (!req.session.user || req.session.user.role !== 'recruiter') {
            return res.redirect('/login');
        }

        const recruiterId = req.session.user.id;

        try {
            const applications = await JobApplication.find({
                posted_by: recruiterId,
                user_id: { $ne: null }
            })
                .populate('user_id', 'name')
                .lean();

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
                    status: statusLower, // Map 'Waiting' to 'pending', 'Approved' to 'approved', etc.
                    applicantName: app.user_id.name,
                    resumeId: app._id.toString()
                };
            });

            const recruiterNav = {
                homeUrl: '/recruiter-home',
                navLinks: [
                    { name: 'Home', href: '/recruiter-home' },
                    {
                        name: 'Applications',
                        href: '/rec-app',
                        submenu: [
                            { name: 'Applications', href: '/rec-app' },
                            { name: 'Notifications', href: '/rec-not' }
                        ]
                    },
                    {
                        name: 'Profile',
                        href: '/recruiter-dashboard',
                        submenu: [
                            { name: 'Dashboard', href: '/recruiter-dashboard' }
                        ]
                    }
                ]
            };

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
    });

    // Recruiter notifications page
    app.get('/rec-not', async (req, res) => {
        if (!req.session.user || req.session.user.role !== 'recruiter') {
            return res.redirect('/login');
        }

        const recruiterId = req.session.user.id;

        try {
            // Fetch notifications for this recruiter (customize as needed)
            const notifications = await Notification.find({ user_id: recruiterId })
                .sort({ createdAt: -1 })
                .lean();

            const recruiterNav = {
                homeUrl: '/recruiter-home',
                navLinks: [
                    { name: 'Home', href: '/recruiter-home' },
                    {
                        name: 'Applications',
                        href: '/rec-app',
                        submenu: [
                            { name: 'Applications', href: '/rec-app' },
                            { name: 'Notifications', href: '/rec-not' }
                        ]
                    },
                    {
                        name: 'Profile',
                        href: '/recruiter-dashboard',
                        submenu: [
                            { name: 'Dashboard', href: '/recruiter-dashboard' }
                        ]
                    }
                ]
            };

            res.render('rec-not', {
                user: req.session.user,
                homeUrl: recruiterNav.homeUrl,
                navLinks: recruiterNav.navLinks,
                notifications
            });
        } catch (err) {
            console.error('Error in /rec-not route:', err.message);
            res.redirect('/recruiter-home?error=Failed to load notifications');
        }
    });

    function getTimeAgo(date) {
        const now = new Date();
        const diffMs = now - new Date(date);
        const diffSeconds = Math.floor(diffMs / 1000);
        const diffMinutes = Math.floor(diffSeconds / 60);
        const diffHours = Math.floor(diffMinutes / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
        if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
        if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
        return `${diffSeconds} second${diffSeconds > 1 ? 's' : ''} ago`;
    }

    app.get('/view-resume/:id', async (req, res) => {
        if (!req.session.user || req.session.user.role !== 'recruiter') {
            return res.status(403).send('Unauthorized');
        }

        const applicationId = req.params.id;
        const recruiterId = req.session.user.id;

        try {
            const application = await JobApplication.findOne({
                _id: applicationId,
                posted_by: recruiterId,
                user_id: { $ne: null }
            });

            console.log('Application found:', application);

            if (!application) {
                return res.status(404).send('Application not found');
            }

            if (!application.resume_path) {
                console.log('Resume path is missing in application:', applicationId);
                return res.status(404).send('Resume not found');
            }

            const filePath = path.join(__dirname, application.resume_path);
            console.log('Resolved filePath:', filePath);

            if (!fs.existsSync(filePath)) {
                console.log(`File does not exist at: ${filePath}`);
                return res.status(404).send('Resume file not found on server');
            }

            const fileExtension = path.extname(filePath).slice(1).toLowerCase();
            const mimeTypes = {
                pdf: 'application/pdf',
                doc: 'application/msword',
                docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            };
            const contentType = mimeTypes[fileExtension] || 'application/octet-stream';

            res.set('Content-Type', contentType);
            res.set('Content-Disposition', `inline; filename="resume-${applicationId}.${fileExtension}"`);
            fs.createReadStream(filePath).pipe(res);
        } catch (err) {
            console.error('Error serving resume:', err.message);
            res.status(500).send('Error serving resume');
        }
    });


    app.patch('/update-application-status/:id', express.json(), async (req, res) => {
        if (!req.session.user || req.session.user.role !== 'recruiter') {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }

        const applicationId = req.params.id;
        const recruiterId = req.session.user.id;
        const { status } = req.body;

        if (!['Approved', 'Rejected'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status' });
        }

        try {
            const application = await JobApplication.findOne({
                _id: applicationId,
                posted_by: recruiterId,
                user_id: { $ne: null }
            });

            if (!application) {
                return res.status(404).json({ success: false, error: 'Application not found' });
            }

            if (status === 'Rejected') {
                // Delete the application if rejected
                await JobApplication.deleteOne({ _id: applicationId });
                res.json({ success: true });
            } else {
                // Update the status if approved
                application.status = status;
                await application.save();
                // Notify the student about being hired with recruiter email
                const recruiter = await User.findById(recruiterId).select('email name').lean();
                const approvedAt = new Date();
                await Notification.create({
                    user_id: application.user_id, // student
                    message: `You got hired for "${application.job_title}" on ${approvedAt.toLocaleDateString()}. Recruiter email: ${recruiter?.email || 'N/A'}.`,
                    type: 'job_hired',
                    is_read: false
                });
                res.json({ success: true });
            }
        } catch (err) {
            console.error('Error updating application status:', err.message);
            res.status(500).json({ success: false, error: 'Database error' });
        }
    });

    app.post("/create-recruiter-job", express.json(), async (req, res) => {
        if (!req.session.user || req.session.user.role !== "recruiter") {
            return res.status(403).json({ success: false, error: "Unauthorized" });
        }

        const { jobTitle, description, salaryRange, skills } = req.body;
        const recruiterId = req.session.user.id;
        const companyName = req.session.user.name;

        try {
            const createdAt = new Date();
            const jobDoc = await JobApplication.create({
                posted_by: recruiterId,
                job_title: jobTitle,
                company_name: companyName,
                salary_range: salaryRange,
                description,
                skills,
                active: 1
            });
            // Notify recruiter about job creation
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
    });

    app.delete("/delete-recruiter-job/:id", async (req, res) => {
        if (!req.session.user || req.session.user.role !== "recruiter") {
            return res.status(403).json({ success: false, error: "Unauthorized" });
        }

        const jobId = req.params.id;
        const recruiterId = req.session.user.id;

        try {
            const job = await JobApplication.findOne({ _id: jobId, posted_by: recruiterId }).lean();
            const result = await JobApplication.deleteOne({ _id: jobId, posted_by: recruiterId });
            if (result.deletedCount === 0) {
                return res.status(404).json({ success: false, error: "Job not found or not authorized to delete" });
            }
            // Notify recruiter about job deletion
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
    });

    app.patch("/toggle-job-active/:id", express.json(), async (req, res) => {
        if (!req.session.user || req.session.user.role !== "recruiter") {
            return res.status(403).json({ success: false, error: "Unauthorized" });
        }
        const jobId = req.params.id;
        const recruiterId = req.session.user.id;
        const { active } = req.body;
        try {
            const result = await JobApplication.updateOne(
                { _id: jobId, posted_by: recruiterId },
                { active }
            );
            if (result.modifiedCount === 0) {
                return res.status(404).json({ success: false, error: "Job not found or not authorized to update" });
            }
            res.json({ success: true });
        } catch (err) {
            console.error("Error toggling job active status:", err.message);
            res.status(500).json({ success: false, error: "Database error" });
        }
    });

    app.get("/signup", (req, res) => {
        res.render("signup", { error: null });
    });

    app.post('/signup', express.json(), async (req, res) => {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.json({ success: false, error: 'Name, email, and password are required' });
        }

        if (!validatePassword(password)) {
            return res.json({ 
                success: false, 
                error: 'Password must be at least 6 characters long, contain one uppercase letter, and one special character (e.g., !@#$%^&*)' 
            });
        }

        try {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.json({ success: false, error: 'Email already in use' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const user = await User.create({ name, email, password: hashedPassword, role: 'user', verified: false });
            await UserMetrics.create({ user_id: user._id });
            
            req.session.user = user;
            res.redirect('/home');
        } catch (err) {
            console.error('Signup error:', err.message);
            res.json({ success: false, error: 'Signup failed' });
        }
    });

    app.get("/signupforrec", (req, res) => {
        res.render("signupforrec", { error: null });
    });

    app.post("/recruiter-signup", upload.single("objectFile"), async (req, res) => {
        const { name, email, password, confirmPassword } = req.body;
        const verificationFile = req.file?.path;

        if (password !== confirmPassword) {
            return res.render("signupforrec", { error: "Passwords do not match" });
        }

        if (!validatePassword(password)) {
            return res.render("signupforrec", { 
                error: "Password must be at least 6 characters long, contain one uppercase letter, and one special character (e.g., !@#$%^&*)" 
            });
        }

        try {
            const existingUser = await User.findOne({ email });
            if (existingUser) {
                return res.render("signupforrec", { error: "Email already registered" });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            const user = await User.create({
                name,
                email,
                password: hashedPassword,
                role: "recruiter",
                verified: false,
                verificationFile: verificationFile || null
            });
            req.session.user = { id: user._id.toString(), name, email, role: "recruiter", verified: false };
            res.redirect("/recruiter-home");
        } catch (err) {
            console.error('Recruiter signup error:', err.message);
            res.status(500).send("Database error");
        }
    });

    app.get("/admin", async (req, res) => {
        if (!req.session.user || req.session.user.role !== "admin") {
            return res.redirect("/login");
        }
    
        try {
                // compute counts for current 30-day window and previous 30-day window
                const now = new Date();
                const periodDays = 30;
                const periodMs = periodDays * 24 * 60 * 60 * 1000;
                const periodStart = new Date(now.getTime() - periodMs); // last 30 days
                const prevStart = new Date(now.getTime() - 2 * periodMs); // 60 days ago
                const prevEnd = periodStart; // previous window end

                // parallel counts
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

                function computeSignedPercent(curr, prev) {
                    if (!prev) {
                        if (!curr) return 0; // no change
                        return 100; // previous 0, some new => show 100% increase
                    }
                    const diff = curr - prev;
                    const raw = (diff / prev) * 100;
                    return Math.round(raw); // signed integer (+/-)
                }

                const dashboardData = {
                    currentPage: "dashboard",
                    adminName: req.session.user.name,
                    adminRole: "Super Admin",
                    dashboardCards: [
                        { title: "Students", icon: "user-graduate", stat: totalUsers, colorClass: "primary", change: computeSignedPercent(usersCurr, usersPrev) },
                        { title: "Recruiters", icon: "building", stat: totalRecruiters, colorClass: "success", change: computeSignedPercent(recCurr, recPrev) },
                        { title: "Projects", icon: "lightbulb", stat: totalProjects, colorClass: "warning", change: computeSignedPercent(projCurr, projPrev) },
                        { title: "Doubts Asked", icon: "question-circle", stat: totalDoubts, colorClass: "danger", change: computeSignedPercent(doubtCurr, doubtPrev) },
                    ],
                    period: `${periodDays} days`
                };

                res.render('admin', { activePage: 'dashboard', dashboardData });
            } catch (err) {
                console.error("Error fetching dashboard data:", err.message);
                res.status(500).send("Server Error");
            }
    });

    
    // Students List
app.get('/stud', async (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
        return res.redirect("/login");
    }

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

        res.render('admin-stud', {
            activePage: 'dashboard',
            adminName: req.session.user.name,
            studentsData
        });
    } catch (err) {
        console.error("Error fetching students data:", err.message);
        res.status(500).send("Server Error");
    }
});

    app.get('/admin-doubts', async (req, res) => {
        if (!req.session.user || req.session.user.role !== "admin") {
            return res.redirect("/login");
        }
    
        try {
            // Fetch users with role 'user' and their metrics
            const users = await User.find({ role: 'user' })
                .select('name email')
                .lean();
    
            // Fetch corresponding UserMetrics for each user and calculate total doubts
            const doubtsData = await Promise.all(users.map(async (user) => {
                const metrics = await UserMetrics.findOne({ user_id: user._id })
                    .select('inquiriesInitiated solutions_provided')
                    .lean();
                const totalDoubts = await Doubt.countDocuments({ user_id: user._id }); // Correctly calculate total doubts asked
                return {
                    id: user._id.toString(),
                    name: user.name,
                    email: user.email,
                    doubtsAsked: totalDoubts || 0, // Use totalDoubts instead of metrics.inquiriesInitiated
                    doubtsCleared: metrics ? metrics.solutions_provided || 0 : 0
                };
            }));
    
            res.render('admin-doubts', {
                activePage: 'doubts',
                adminName: req.session.user.name,
                doubtsData
            });
        } catch (err) {
            console.error("Error fetching doubts data:", err.message);
            res.status(500).send("Server Error");
        }
    });

    app.get('/admin-rec', async (req, res) => {
        if (!req.session.user || req.session.user.role !== "admin") {
            return res.redirect("/login");
        }
    
        try {
            const recruiters = await User.find({ role: 'recruiter' })
                .select('name email createdAt')
                .lean();
    
            console.log('Fetched recruiters:', recruiters); // Debug log to check fetched data
    
            const recruitersData = await Promise.all(recruiters.map(async (recruiter) => {
                const jobCount = await JobApplication.countDocuments({ posted_by: recruiter._id });
                const fallbackName = recruiter.email ? recruiter.email.split('@')[0] : 'Unnamed Recruiter';
                return {
                    id: recruiter._id.toString(),
                    name: recruiter.name || fallbackName, // Fallback in case name is still missing
                    email: recruiter.email || 'N/A',
                    company: recruiter.name || fallbackName, // Adjust if you have a company field
                    role: 'Recruiter', // Static role; adjust if you have specific roles
                    joinedDate: recruiter.createdAt ? new Date(recruiter.createdAt).toISOString().split('T')[0] : 'N/A',
                    recruitmentCount: jobCount || 0
                };
            }));
    
            console.log('Processed recruitersData:', recruitersData); // Debug log to check processed data
    
            res.render('admin-rec', {
                activePage: 'dashboard',
                adminName: req.session.user.name,
                recruitersData
            });
        } catch (err) {
            console.error("Error fetching recruiters data:", err.message);
            res.status(500).send("Server Error");
        }
    });

    app.get('/admin-prof', (req, res) => {
        res.render('admin-prof', { activePage: 'dashboard' });
    });

    app.get('/admin-mess', (req, res) => {
        res.render('admin-mess', { activePage: 'dashboard' });
    });

    app.get("/admin-proj", async (req, res) => {
        if (!req.session.user || req.session.user.role !== "admin") {
            return res.redirect("/login");
        }
    
        try {
            // Fetch all projects
            const projects = await Project.find().lean();
    
            // Fetch member counts for each project
            const now = new Date();
            const projectData = await Promise.all(projects.map(async (project) => {
                const memberCount = await ProjectMember.countDocuments({ project_id: project._id });
                // derive status: completed if marked completed, expired if deadline passed and not completed, active otherwise
                let derivedStatus = project.status || 'active';
                if ((derivedStatus === 'completed' || (typeof derivedStatus === 'string' && derivedStatus.toLowerCase() === 'completed'))) {
                    derivedStatus = 'completed';
                } else {
                    if (project.deadline) {
                        const dl = new Date(project.deadline);
                        if (dl.getTime() < now.getTime()) {
                            derivedStatus = 'expired';
                        } else {
                            derivedStatus = 'active';
                        }
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
                    members: memberCount
                };
            }));
    
            const dashboardData = {
                currentPage: "projects",
                adminName: req.session.user.name,
                adminRole: "Super Admin",
                projects: projectData
            };
    
            res.render('admin-proj', { activePage: 'projects', dashboardData });
        } catch (err) {
            console.error("Error fetching projects data:", err.message);
            res.status(500).send("Server Error");
        }
    });

    app.get("/logout", (req, res) => {
        req.session.destroy(() => res.redirect("/login"));
    });

    app.get('/apply', async (req, res) => {
        if (!req.session.user) {
            return res.redirect('/login?error=Please log in to view jobs');
        }

    try {
            const user = await User.findById(req.session.user.id).lean();
            if (!user) {
                console.error('User not found for ID:', req.session.user.id);
                return res.redirect('/login?error=User not found');
            }

            // Show all active listings (not yet applied by anyone): user_id is null or missing, active true/1
            const jobs = await JobApplication.find({
                $and: [
                    { $or: [ { user_id: null }, { user_id: { $exists: false } } ] },
                    { $or: [ { active: true }, { active: 1 } ] }
                ]
            })
                .select('_id job_title company_name salary_range description skills')
                .lean();

            // Build set of jobs (title+company) the current user has already applied for
            const userApplications = await JobApplication.find({ user_id: req.session.user.id })
                .select('job_title company_name')
                .lean();
            const appliedKeySet = new Set(
                (userApplications || []).map(a => `${a.job_title}||${a.company_name}`)
            );

            console.log('Fetched jobs for /apply:', jobs);

        res.render('applyjobs', {
                user: req.session.user,
                homeUrl: userNav.homeUrl,
                navLinks: userNav.navLinks,
                jobs: jobs.map(job => ({
            id: job._id,
                    job_title: job.job_title,
                    company_name: job.company_name,
                    salary_range: job.salary_range,
                    description: job.description,
                    skills: job.skills,
                    hasApplied: appliedKeySet.has(`${job.job_title}||${job.company_name}`)
                }))
            });
        } catch (err) {
            console.error('Error fetching jobs for /apply:', err.message);
            res.redirect('/home?error=Failed to load jobs');
        }
    });
    async function migrateJobApplications() {
        try {
            const applications = await JobApplication.find({ date_applied: { $exists: false } });
            for (const app of applications) {
                app.date_applied = app.createdAt || new Date(); // Use createdAt if available, otherwise current date
                await app.save();
            }
            console.log('Migration completed');
        } catch (err) {
            console.error('Migration failed:', err.message);
        }
    }
    migrateJobApplications();

    app.post('/apply-job', upload.single('resume'), async (req, res) => {
        if (!req.session.user) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }

        const { jobId } = req.body;
        const userId = req.session.user.id;

        try {
            if (!mongoose.Types.ObjectId.isValid(jobId)) {
                return res.status(400).json({ success: false, error: 'Invalid job ID' });
            }

            if (!req.file) {
                return res.status(400).json({ success: false, error: 'Resume is required' });
            }

            console.log('Uploaded file:', req.file);
            console.log('Saved resume_path:', req.file.path);

            const job = await JobApplication.findById(jobId);
            if (!job || job.user_id) {
                return res.status(404).json({ success: false, error: 'Job not found or already applied' });
            }

            const existingApplication = await JobApplication.findOne({
                user_id: userId,
                job_title: job.job_title,
                company_name: job.company_name
            });

            if (existingApplication) {
                return res.status(400).json({ success: false, error: 'You have already applied for this job' });
            }

            const newApplication = await JobApplication.create({
                posted_by: job.posted_by,
                job_title: job.job_title,
                company_name: job.company_name,
                salary_range: job.salary_range,
                description: job.description,
                skills: job.skills,
                user_id: userId,
                resume_path: req.file.path,
                active: true,
                date_applied: new Date()
            });

            // Notify recruiter of new application (use applicant name)
            let applicantName = req.session.user?.name;
            if (!applicantName) {
                const applicant = await User.findById(userId).select('name').lean();
                applicantName = applicant?.name || String(userId);
            }
            const appliedAt = new Date();
            await Notification.create({
                user_id: job.posted_by,
                message: `You have received a new application for your job posting: "${job.job_title}" from ${applicantName} on ${appliedAt.toLocaleDateString()}.`,
                type: 'job_application',
                is_read: false
            });

            await UserMetrics.findOneAndUpdate(
                { user_id: userId },
                { $inc: { job_applications: 1 } },
                { upsert: true }
            );

            res.json({ success: true });
        } catch (err) {
            console.error('Error applying for job:', err.message);
            res.status(500).json({ success: false, error: 'Database error' });
        }
    });

    app.get("/job", async (req, res) => {
        if (!req.session.user || !req.session.user.id) {
            return res.redirect("/login");
        }
        const userId = req.session.user.id;

        try {
            const applications = await JobApplication.find({ 
                    user_id: userId, 
                    status: { $in: ['Waiting', 'Approved'] }
                })
                .select('job_title company_name salary_range description skills date_applied status posted_by')
                .populate('posted_by', 'email name')
                .lean();

            const formattedApplications = applications.map(app => ({
                ...app,
                recruiter_email: app.posted_by && app.posted_by.email ? app.posted_by.email : null,
                date_applied: app.date_applied ? new Date(app.date_applied) : new Date() // Fallback to current date
            }));

            res.render("job-applications", {
                user: req.session.user,
                homeUrl: navData.homeUrl,
                navLinks: navData.navLinks,
                applications: formattedApplications || [],
            });
        } catch (err) {
            console.error("Error fetching applications:", err.message);
            res.status(500).send("Internal Server Error");
        }
    });

    app.post("/update-application-status", express.json(), async (req, res) => {
        if (!req.session.user || req.session.user.role !== "recruiter") {
            return res.status(403).json({ success: false, error: "Unauthorized" });
        }
        const { applicationId, status } = req.body;
        const recruiterId = req.session.user.id;

        try {
            const result = await JobApplication.updateOne(
                { _id: applicationId, posted_by: recruiterId },
                { status }
            );
            if (result.modifiedCount === 0) {
                return res.status(404).json({ success: false, error: "Application not found or not authorized" });
            }
            res.json({ success: true });
        } catch (err) {
            console.error("Error updating application status:", err.message);
            res.status(500).json({ success: false, error: "Database error" });
        }
    });


    const topics = {
        '/blockchain': { file: 'blockchain', topic: 'Blockchain' },
        '/cyb': { file: 'cyber-security', topic: 'Cyber Security' },
        '/ds': { file: 'data-science', topic: 'Data Science' },
        '/dl': { file: 'deep-learning', topic: 'Deep Learning' },
        '/web-dev': { file: 'web-dev', topic: 'Web Development' },
        '/robo': { file: 'robotics', topic: 'Robotics' }
    };

    const topicNormalizationMap = {
        'blockchain': 'Blockchain',
        'cyber-security': 'Cyber Security',
        'data-science': 'Data Science',
        'deep-learning': 'Deep Learning',
        'web-dev': 'Web Development',
        'robotics': 'Robotics',
        'deep learning': 'Deep Learning',
        'data science': 'Data Science',
        'web development': 'Web Development',
        'cyber security': 'Cyber Security'
    };

    Object.keys(topics).forEach(path => {
        app.get(path, async (req, res) => {
            if (!req.session.user) {
                return res.redirect('/login');
            }

            const userId = req.session.user.id;
            const navLinks = getNavLinks(req.session.user);
            const { file, topic } = topics[path];

            try {
                const projects = await Project.aggregate([
                    { 
                        $match: { 
                            topic: { $regex: `^${topic}$`, $options: 'i' } // Case-insensitive match
                        } 
                    },
                    { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'creator' } },
                    { $unwind: '$creator' },
                    { $lookup: { from: 'projectmembers', localField: '_id', foreignField: 'project_id', as: 'members' } },
                    { $lookup: { from: 'joinrequests', localField: '_id', foreignField: 'project_id', as: 'join_requests' } },
                    {
                        $addFields: {
                            memberCount: { $size: '$members' },
                            hasJoined: { $in: [new mongoose.Types.ObjectId(userId), '$members.user_id'] },
                            hasPendingRequest: { $in: [new mongoose.Types.ObjectId(userId), '$join_requests.user_id'] },
                            createdBy: '$creator.name'
                        }
                    },
                    { $project: { members: 0, join_requests: 0, creator: 0 } }
                ]);

                console.log(`Projects for ${topic}:`, projects); // Debug log

                res.render(file, {
                    user: req.session.user,
                    projects: projects || [],
                    navLinks,
                    homeUrl: '/dashboard'
                });
            } catch (err) {
                console.error(`Error fetching projects for ${topic}:`, err.message);
                res.status(500).send('Server Error');
            }
        });
    });

    app.get('/e', async (req, res) => {
        if (!req.session.user || req.session.user.role !== 'user') {
            return res.redirect('/login');
        }

        const userId = req.session.user.id;
        const navLinks = getNavLinks(req.session.user);
        const homeUrl = '/dashboard';

        try {
            const createdProjects = await Project.aggregate([
                { $match: { user_id: new mongoose.Types.ObjectId(userId) } },
                { $lookup: { from: 'projectmembers', localField: '_id', foreignField: 'project_id', as: 'members' } },
                { $addFields: { memberCount: { $size: '$members' } } },
                {
                    $project: {
                        id: '$_id',
                        title: 1,
                        description: 1,
                        capacity: 1,
                        memberCount: 1,
                        topic: 1,
                        deadline: { $dateToString: { format: '%Y-%m-%d', date: '$deadline' } }
                    }
                }
            ]);

            res.render('create_proj', {
                user: req.session.user,
                projects: createdProjects || [],
                homeUrl,
                navLinks,
                error: null
            });
        } catch (err) {
            console.error('Error fetching created projects:', err.message);
            res.render('create_proj', {
                user: req.session.user,
                projects: [],
                homeUrl,
                navLinks,
                error: 'Failed to load projects'
            });
        }
    });


    app.post('/mark-notification-read', async (req, res) => {
        const { notificationId } = req.body;

        try {
            const result = await Notification.updateOne(
                { _id: notificationId },
                { is_read: true }
            );
            if (result.modifiedCount === 0) {
                return res.json({ success: false, message: 'Notification not found' });
            }
            res.json({ success: true });
        } catch (err) {
            console.error('Error marking notification as read:', err.message);
            res.json({ success: false, message: 'Server Error' });
        }
    });

    app.post('/delete-notification', async (req, res) => {
        const { notificationId } = req.body;

        try {
            const result = await Notification.deleteOne({ _id: notificationId });
            if (result.deletedCount === 0) {
                return res.json({ success: false, message: 'Notification not found' });
            }
            res.json({ success: true });
        } catch (err) {
            console.error('Error deleting notification:', err.message);
            res.json({ success: false, message: 'Server Error' });
        }
    });

    app.get('/get-task-project/:taskId', async (req, res) => {
        const { taskId } = req.params;
        const userId = req.session.user.id;

        try {
            const task = await Task.findOne({ _id: taskId, assigned_to: userId });
            if (!task) {
                return res.status(404).json({ success: false, error: 'Task not found or unauthorized' });
            }
            res.json({ success: true, projectId: task.project_id });
        } catch (err) {
            console.error('Error fetching task:', err.message);
            res.status(404).json({ success: false, error: 'Task not found or unauthorized' });
        }
    });

    app.post('/delete-project', express.json(), async (req, res) => {
        if (!req.session.user || req.session.user.role !== 'user') {
            return res.status(403).json({ success: false, error: 'Unauthorized' });
        }

        const { projectId } = req.body;
        const userId = req.session.user.id;

        try {
            const project = await Project.findById(projectId);
            if (!project) {
                return res.status(404).json({ success: false, error: 'Project not found' });
            }
            if (project.user_id.toString() !== userId) {
                return res.status(403).json({ success: false, error: 'Unauthorized' });
            }

            const members = await ProjectMember.find({ project_id: projectId });

            await Promise.all([
                Project.deleteOne({ _id: projectId }),
                ProjectMember.deleteMany({ project_id: projectId }),
                Task.deleteMany({ project_id: projectId }),
                JoinRequest.deleteMany({ project_id: projectId })
            ]);

            const updates = members.map(member => 
                UserMetrics.findOneAndUpdate(
                    { user_id: member.user_id },
                    { 
                        $inc: { 
                            active_projects: -1,
                            projects_participated: -1,
                            ...(member.user_id.toString() !== userId ? { projects_as_member: -1 } : {})
                        } 
                    }
                )
            );

            await Promise.all(updates);

            res.json({ success: true });
        } catch (err) {
            console.error('Error deleting project:', err.message);
            res.status(500).json({ success: false, error: 'Database error' });
        }
    });

    app.get("/clear", async (req, res) => {
        if (!req.session.user) {
            return res.redirect("/login");
        }
        
        try {
            const doubts = await Doubt.find({ 
                visible_to_all: true 
            })
            .populate({
                path: 'replies',
                populate: {
                    path: 'user_id',
                    select: 'name'
                }
            })
            .populate('user_id', 'name')
            .sort({ timestamp: -1 })
            .lean();

            const formattedDoubts = doubts.map(doubt => ({
                ...doubt,
                author: doubt.user_id?.name || "Anonymous",
                replies: doubt.replies?.map(reply => ({
                    ...reply,
                    author: reply.user_id?.name || reply.author || "Anonymous"
                })) || []
            }));

            res.render("clear", {
                user: req.session.user,
                doubts: formattedDoubts,
                homeUrl: navData.homeUrl,
                navLinks: navData.navLinks
            });
        } catch (err) {
            console.error("Error fetching doubts:", err.message);
            res.render("clear", {
                user: req.session.user,
                doubts: [],
                homeUrl: navData.homeUrl,
                navLinks: navData.navLinks
            });
        }
    });

   
    app.post("/reply", express.json(), async (req, res) => {
        const { doubtId, text, isPrivate } = req.body;
        if (!req.session.user) {
            return res.json({ success: false, message: "Not logged in" });
        }
        try {
            const doubt = await Doubt.findById(doubtId);
            if (!doubt) {
                return res.json({ success: false, message: "Doubt not found" });
            }

            // New rule: doubt owner can only reply AFTER at least one other user has replied.
            const isOwner = doubt.user_id && doubt.user_id.toString() === req.session.user.id;
            if (isOwner) {
                const otherReplyExists = await Reply.exists({ doubt_id: doubtId, user_id: { $ne: doubt.user_id } });
                if (!otherReplyExists) {
                    return res.json({ success: false, message: "Wait for another user to reply before you add a follow-up." });
                }
            }

            const reply = await Reply.create({
                doubt_id: doubtId,
                author: req.session.user.name,
                text,
                timestamp: new Date(),
                user_id: req.session.user.id,
                visible_to_all: !isPrivate
            });
            await Doubt.findByIdAndUpdate(doubtId, { $push: { replies: reply._id } });
            // Only count as a solution if the replier is NOT the original asker
            if (!isOwner) {
                await UserMetrics.findOneAndUpdate(
                    { user_id: req.session.user.id },
                    { $inc: { solutions_provided: 1 } },
                    { upsert: true }
                );
            }
            res.json({ 
                success: true, 
                reply: { 
                    _id: reply._id, 
                    author: reply.author, 
                    text: reply.text, 
                    timestamp: reply.timestamp,
                    visible_to_all: reply.visible_to_all
                } 
            });
        } catch (err) {
            console.error("Error posting reply:", err.message);
            res.json({ success: false, message: "Failed to save reply" });
        }
    });
    app.get('/job_not', (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }
    res.render('job_notiffinal', {
        user: req.session.user,
        navLinks: (typeof getNavLinks === 'function') ? getNavLinks(req.session.user) : (navData.navLinks || []),
        homeUrl: navData.homeUrl || '/home'
    });
});


    app.get('/project', async (req, res) => {
        if (!req.session.user) {
        return res.redirect('/login');
        }
    
        const userId = req.session.user.id;
    
        try {
        const createdProjects = await Project.find({ user_id: userId });
    
        const availableProjects = await Project.aggregate([
            {
            $lookup: {
                from: 'projectmembers',
                localField: '_id',
                foreignField: 'project_id',
                as: 'members'
            }
            },
            {
            $lookup: {
                from: 'joinrequests',
                localField: '_id',
                foreignField: 'project_id',
                as: 'join_requests'
            }
            },
            {
            $addFields: {
                member_count: { $size: '$members' },
                is_member: {
                $in: [new mongoose.Types.ObjectId(userId), '$members.user_id']
                },
                has_pending_request: {
                $in: [new mongoose.Types.ObjectId(userId), '$join_requests.user_id']
                }
            }
            },
            {
            $match: {
                user_id: { $ne: new mongoose.Types.ObjectId(userId) },
                is_member: false,
                status: { $ne: 'completed' }
            }
            }
        ]);
    
        res.render('projects-list', {
            user: req.session.user,
            createdProjects: createdProjects || [],
            availableProjects: availableProjects || [],
            navLinks: getNavLinks(req.session.user),
            homeUrl: '/dashboard'
        });
        } catch (err) {
        console.error('Error fetching projects:', err.message);
        res.status(500).send('Server Error');
        }
    });

    app.get('/joined-projects', async (req, res) => {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        const userId = req.session.user.id;

        try {
            // Fetch projects that the user has joined
            const userObjectId = new mongoose.Types.ObjectId(userId);
            const projects = await Project.aggregate([
                {
                    $lookup: {
                        from: 'projectmembers',
                        localField: '_id',
                        foreignField: 'project_id',
                        as: 'members'
                    }
                },
                {
                    $match: {
                        $expr: {
                            $and: [
                                { $in: [userObjectId, '$members.user_id'] },
                                { $ne: ['$user_id', userObjectId] }
                            ]
                        }
                    }
                },
                {
                    $addFields: {
                        member_count: { $size: '$members' }
                    }
                }
            ]);

            // Fetch tasks for all joined projects
            const projectIds = projects.map(project => project._id);
            const tasks = await Task.find({
                project_id: { $in: projectIds },
                assigned_to: userId
            }).lean();

            // Group tasks by project ID
            const tasksByProject = {};
            tasks.forEach(task => {
                const projectId = task.project_id.toString();
                if (!tasksByProject[projectId]) {
                    tasksByProject[projectId] = [];
                }
                tasksByProject[projectId].push({
                    id: task._id,
                    title: task.title,
                    description: task.description,
                    due_date: task.due_date,
                    status: task.status,
                    github_link: task.github_link,
                    feedback: task.feedback
                });
            });

            // Format projects for the template
            const formattedProjects = projects.map(project => ({
                id: project._id,
                title: project.title,
                description: project.description,
                member_count: project.member_count
            }));

            res.render('joined_projects', {
                user: req.session.user,
                projects: formattedProjects,
                tasks: tasksByProject,
                navLinks: getNavLinks(req.session.user),
                homeUrl: '/dashboard'
            });
        } catch (err) {
            console.error('Error fetching joined projects:', err.message);
            res.status(500).send('Server Error');
        }
    });

    app.post('/task/create', async (req, res) => {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { projectId, title, description, assignedTo, dueDate } = req.body;
        const userId = req.session.user.id;

        try {
            // Validate input
            if (!projectId || !title || !dueDate) {
                return res.status(400).json({ success: false, message: 'Project ID, title, and due date are required' });
            }
            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                return res.status(400).json({ success: false, message: 'Invalid project ID' });
            }
            if (assignedTo && !mongoose.Types.ObjectId.isValid(assignedTo)) {
                return res.status(400).json({ success: false, message: 'Invalid assigned user ID' });
            }

            // Check if the user is the project creator
            const project = await Project.findById(projectId);
            if (!project) {
                return res.status(404).json({ success: false, message: 'Project not found' });
            }
            if (project.user_id.toString() !== userId) {
                return res.status(403).json({ success: false, message: 'Only the project creator can create tasks' });
            }

            // Verify assigned user is a project member (if assigned)
            let assignedUser = null;
            if (assignedTo) {
                const isMember = await ProjectMember.findOne({ project_id: projectId, user_id: assignedTo }).populate('user_id', 'name');
                if (!isMember) {
                    return res.status(400).json({ success: false, message: 'Assigned user is not a project member' });
                }
                assignedUser = isMember.user_id;
            }

            // Create the task
            const task = new Task({
                project_id: projectId,
                title,
                description: description || '',
                assigned_to: assignedTo || null,
                due_date: new Date(dueDate),
                status: 'In Progress',
                github_link: null,
                feedback: null
            });
            await task.save();

            // Notify assigned user (if assigned)
            if (assignedTo) {
                try {
                    await Notification.create({
                        user_id: assignedTo,
                        message: `You have been assigned to task "${title}" in project "${project.title}"`,
                        task_id: task._id,
                        type: 'task_assignment',
                        created_at: new Date(),
                        is_read: false
                    });
                } catch (notificationErr) {
                    console.error('Failed to create notification for task assignment:', notificationErr.message);
                    // Continue without failing the task creation
                }
            }

            // Prepare response with task details
            res.json({
                success: true,
                task: {
                    id: task._id,
                    title,
                    description,
                    assigned_to: assignedUser ? { name: assignedUser.name, _id: assignedUser._id } : null,
                    due_date: task.due_date,
                    status: task.status
                }
            });
        } catch (err) {
            console.error('Error creating task:', err.message);
            res.status(500).json({ success: false, message: 'Server error: ' + err.message });
        }
    });

    app.get('/project/:id', async (req, res) => {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        const projectId = req.params.id;
        const userId = req.session.user.id;

        try {
            if (!mongoose.Types.ObjectId.isValid(projectId)) {
                return res.status(400).send('Invalid project ID');
            }

            const projects = await Project.aggregate([
                { $match: { _id: new mongoose.Types.ObjectId(projectId) } },
                { $lookup: { from: 'users', localField: 'user_id', foreignField: '_id', as: 'creator' } },
                { $unwind: '$creator' },
                { $lookup: { from: 'projectmembers', localField: '_id', foreignField: 'project_id', as: 'members' } },
                { $lookup: { from: 'joinrequests', localField: '_id', foreignField: 'project_id', as: 'join_requests' } },
                {
                    $addFields: {
                        id: '$_id', // Add id field
                        memberCount: { $size: '$members' },
                        hasJoined: { $in: [new mongoose.Types.ObjectId(userId), '$members.user_id'] },
                        hasPendingRequest: { $in: [new mongoose.Types.ObjectId(userId), '$join_requests.user_id'] },
                        createdBy: '$creator.name'
                    }
                },
                { $project: { members: 0, join_requests: 0, creator: 0 } }
            ]);

            if (!projects || projects.length === 0) {
                return res.status(404).send('Project not found');
            }

            const project = projects[0];

            const tasks = await Task.find({ project_id: projectId }).populate('assigned_to', 'name');

            const projectMembers = await ProjectMember.find({ project_id: projectId })
                .populate({
                    path: 'user_id',
                    select: 'name email',
                })
                .lean();

            console.log('Project Members:', JSON.stringify(projectMembers, null, 2));

            const userProjects = await Project.find({ user_id: userId });

            res.render('project-details', {
                user: req.session.user,
                project,
                tasks: tasks || [],
                projectMembers: projectMembers || [],
                projects: userProjects || [],
                navLinks: getNavLinks(req.session.user),
                homeUrl: '/dashboard'
            });
        } catch (err) {
            console.error('Error fetching project details:', err.message);
            res.status(500).send('Server Error');
        }
    });


    app.post('/project/:id/finish', async (req, res) => {
        try {
            const projectId = req.params.id;
            const project = await Project.findById(projectId);
            if (!project) {
                return res.status(404).json({ success: false, message: 'Project not found' });
            }

            // Update project status to completed
            await Project.findByIdAndUpdate(projectId, { status: 'completed' });
            await Task.updateMany({ project_id: projectId, status: { $ne: 'Completed' } }, { status: 'Completed' });

            const updatedProject = await Project.findById(projectId);
            console.log('Project status after update:', updatedProject ? updatedProject.status : 'Project not found');

            // Fetch all project members (including the creator)
            const projectMembers = await ProjectMember.find({ project_id: projectId }).select('user_id');

            // Update UserMetrics for all members by decrementing active_projects
            const memberUpdates = projectMembers.map(async (member) => {
                const memberId = member.user_id;
                const updateResult = await UserMetrics.findOneAndUpdate(
                    { user_id: new mongoose.Types.ObjectId(memberId) },
                    { $inc: { active_projects: -1 } },
                    { new: true, runValidators: true }
                );
                console.log(`UserMetrics updated for user ${memberId} after project completion:`, {
                    active_projects: updateResult ? updateResult.active_projects : 'No metrics found'
                });

                // Create a notification for each member
                await Notification.create({
                    user_id: new mongoose.Types.ObjectId(memberId),
                    message: `Project "${project.title}" has been successfully completed.`,
                    task_id: null,
                    type: 'project_completion',
                    created_at: new Date(),
                    is_read: false
                });
                console.log(`Notification created for user ${memberId} for project ${projectId} completion`);
            });

            // Wait for all updates and notifications to complete
            await Promise.all(memberUpdates);

            res.json({ success: true });
        } catch (err) {
            console.error('Error completing project:', err.message, { stack: err.stack, projectId: req.params.id });
            res.status(500).json({ success: false, message: err.message });
        }
    });

    app.get('/project/:id/pending-tasks', async (req, res) => {
        try {
            const projectId = req.params.id;
            const pendingTasks = await Task.countDocuments({ project_id: projectId, status: { $ne: 'Completed' } });
            res.json({ pendingTasks });
        } catch (err) {
            res.json({ pendingTasks: 0 });
        }
    });


    app.post('/task/extend-deadline', async (req, res) => {
        try {
            const { taskTitle, projectId, newDueDate } = req.body;
            const task = await Task.findOne({ title: taskTitle, project_id: projectId });
            if (task) {
                task.due_date = new Date(newDueDate);
                await task.save();
                res.json({ success: true });
            } else {
                res.json({ success: false, message: 'Task not found' });
            }
        } catch (err) {
            res.json({ success: false, message: err.message });
        }
    });

    app.post('/task/:id/feedback', async (req, res) => {
        try {
            const taskId = req.params.id;
            const { approved, feedback, projectId } = req.body;
            await Task.findByIdAndUpdate(taskId, {
                status: approved ? 'Completed' : 'Rejected',
                feedback: feedback || ''
            });
            res.json({ success: true });
        } catch (err) {
            res.json({ success: false, message: err.message });
        }
    });

    app.post('/task/submit-github-link', async (req, res) => {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { taskId, githubLink, projectId } = req.body;
        const userId = req.session.user.id;

        try {
            const task = await Task.findOneAndUpdate(
                { _id: taskId, assigned_to: userId },
                { 
                    github_link: githubLink,
                    status: 'Review'
                },
                { new: true }
            );

            if (!task) {
                return res.status(404).json({ success: false, message: 'Task not found or not assigned to you' });
            }

            const project = await Project.findById(projectId).populate('user_id');
            if (!project) {
                return res.status(404).json({ success: false, message: 'Project not found' });
            }

            await Notification.create({
                user_id: project.user_id._id,
                message: `Task "${task.title}" submitted for review by ${req.session.user.name}`,
                task_id: task._id,
                type: 'task',
                is_read: false
            });

            res.json({ success: true });
        } catch (err) {
            console.error('Error submitting task:', err.message);
            res.status(500).json({ success: false, message: 'Server error: ' + err.message });
        }
    });

    app.post('/task/review-submission', async (req, res) => {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { taskId, projectId, action, feedback } = req.body;
        const userId = req.session.user.id;

        try {
            // Validate input
            if (!taskId || !projectId || !action || !feedback) {
                return res.status(400).json({ success: false, message: 'Task ID, project ID, action, and feedback are required' });
            }
            if (!mongoose.Types.ObjectId.isValid(taskId) || !mongoose.Types.ObjectId.isValid(projectId)) {
                return res.status(400).json({ success: false, message: 'Invalid task or project ID' });
            }
            if (!['accept', 'reject'].includes(action)) {
                return res.status(400).json({ success: false, message: 'Invalid action. Use "accept" or "reject"' });
            }

            // Check if user is the project creator
            const project = await Project.findById(projectId);
            if (!project) {
                return res.status(404).json({ success: false, message: 'Project not found' });
            }
            if (project.user_id.toString() !== userId) {
                return res.status(403).json({ success: false, message: 'Only the project creator can review submissions' });
            }

            // Find and update the task
            const task = await Task.findById(taskId).populate('assigned_to', 'name');
            if (!task) {
                return res.status(404).json({ success: false, message: 'Task not found' });
            }
            if (task.status !== 'Review') {
                return res.status(400).json({ success: false, message: 'Task is not in review status' });
            }

            const update = {
                feedback,
                status: 'Completed',
                github_link: action === 'accept' ? task.github_link : null
            };

            const updatedTask = await Task.findByIdAndUpdate(taskId, update, { new: true }).populate('assigned_to', 'name');

            // Update UserMetrics for the assigned user if action is accept
            if (action === 'accept' && task.assigned_to) {
                try {
                    await UserMetrics.findOneAndUpdate(
                        { user_id: task.assigned_to._id },
                        { $inc: { completed_tasks: 1 } },
                        { upsert: true }
                    );
                    console.log(`Incremented completed_tasks for user ${task.assigned_to._id}`);
                } catch (metricsErr) {
                    console.error(`Failed to update UserMetrics for user ${task.assigned_to._id}:`, metricsErr.message);
                }
            }

            // Notify the assigned user
            if (task.assigned_to) {
                const notificationType = action === 'accept' ? 'task_accepted' : 'task_rejected';
                const notificationMessage = action === 'accept'
                    ? `Your submission for task "${task.title}" was accepted. Feedback: ${feedback}`
                    : `Your submission for task "${task.title}" was rejected. Reason: ${feedback}`;
                
                try {
                    await Notification.create({
                        user_id: task.assigned_to._id,
                        message: notificationMessage,
                        task_id: task._id,
                        type: notificationType,
                        is_read: false
                    });
                } catch (notificationErr) {
                    console.error(`Failed to create ${notificationType} notification:`, notificationErr.message);
                }
            }

            res.json({
                success: true,
                task: {
                    id: updatedTask._id,
                    title: updatedTask.title,
                    description: updatedTask.description,
                    assigned_to: updatedTask.assigned_to ? { name: updatedTask.assigned_to.name, _id: updatedTask.assigned_to._id } : null,
                    due_date: updatedTask.due_date,
                    status: updatedTask.status,
                    github_link: updatedTask.github_link,
                    feedback: updatedTask.feedback
                }
            });
        } catch (err) {
            console.error('Error reviewing submission:', err.message);
            res.status(500).json({ success: false, message: 'Server error: ' + err.message });
        }
    });


    app.get("/messages", (req, res) => {
        res.render("group", { user: req.session.user || null, homeUrl: navData.homeUrl, navLinks: navData.navLinks });
    });

    app.get("/FAQ", (req, res) => {
        res.render("faqpage", { user: req.session.user || null, homeUrl: navData.homeUrl, navLinks: navData.navLinks });
    });

    app.get('/not', async (req, res) => {
        if (!req.session.user) {
            return res.redirect('/login');
        }

        const userId = req.session.user.id;
        const navLinks = getNavLinks(req.session.user);

        try {
            // Include task-related notifications
            const taskNotifications = await Notification.find({ 
                user_id: userId, 
                type: { $in: ['task', 'task_assignment', 'join_request_approved', 'task_accepted', 'task_rejected'] }
            })
                .populate('task_id', 'title')
                .sort({ createdAt: -1 });

            // Project-related notifications
            const projectCreationNotifications = await Notification.find({
                user_id: userId,
                type: { $in: ['project_creation', 'project_completion'] }
            }).sort({ createdAt: -1 });

            const joinRequests = await JoinRequest.find({})
                .populate('user_id', 'name')
                .populate({ path: 'project_id', match: { user_id: userId }, select: 'title' })
                .then(results => results.filter(jr => jr.project_id));

            res.render('proj_notif', {
                user: req.session.user,
                taskNotifications: taskNotifications.map(n => ({
                    id: n._id,
                    message: n.message,
                    task_id: n.task_id?._id,
                    created_at: n.createdAt,
                    is_read: n.is_read,
                    task_title: n.task_id?.title,
                    type: n.type
                })) || [],
                projectCreationNotifications: projectCreationNotifications.map(n => ({
                    id: n._id,
                    message: n.message,
                    created_at: n.createdAt,
                    is_read: n.is_read,
                    type: n.type
                })) || [],
                joinRequests: joinRequests.map(jr => ({
                    id: jr._id,
                    user_id: jr.user_id._id,
                    user_name: jr.user_id.name,
                    project_title: jr.project_id.title,
                    requested_at: jr.requested_at,
                    status: jr.status
                })) || [],
                navLinks,
                homeUrl: '/dashboard'
            });
        } catch (err) {
            console.error('Error fetching notifications:', err.message);
            res.status(500).send('Server Error');
        }
    });

    function getNavLinks(user) {
        const links = [
            { href: '/dashboard', name: 'Dashboard' },
            {
                href: '#',
                name: 'Projects',
                submenu: [
                    { href: '/project', name: 'My Created Projects' },
                    { href: '/joined-projects', name: 'Joined Projects' }
                ]
            },
            {
                href: '#',
                name: 'Topics',
                submenu: [
                    { href: '/cyb', name: 'Cyber Security' },
                    { href: '/blockchain', name: 'Blockchain' },
                    { href: '/ds', name: 'Data Science' },
                    { href: '/dl', name: 'Deep Learning' },
                    { href: '/robo', name: 'Robotics' },
                    { href: '/web-dev', name: 'Web Development' }
                ]
            },
            { href: '/not', name: 'Notifications' }
        ];

        if (user.role === 'admin') {
            links.push({ href: '/admin', name: 'Admin Panel' });
        }

        if (user.role === 'recruiter') {
            links.push({ href: '/recruiter', name: 'Recruiter Dashboard' });
        }

        links.push({ href: '/logout', name: 'Logout' });

        return links;
    }

    app.post('/approve-join-request', async (req, res) => {
        if (!req.session.user) {
            return res.status(401).json({ success: false, message: 'Unauthorized' });
        }

        const { requestId } = req.body;
        const userId = req.session.user.id;

        if (!mongoose.Types.ObjectId.isValid(requestId)) {
            return res.status(400).json({ success: false, message: 'Invalid request ID' });
        }

        try {
            const joinRequest = await JoinRequest.findById(requestId).populate('project_id');
            if (!joinRequest) {
                return res.status(404).json({ success: false, message: 'Join request not found' });
            }

            const project = joinRequest.project_id;
            if (project.user_id.toString() !== userId) {
                return res.status(403).json({ success: false, message: 'Only the project creator can approve join requests' });
            }

            if (joinRequest.status !== 'pending') {
                return res.json({ success: false, message: 'This request has already been processed' });
            }

            const memberCount = await ProjectMember.countDocuments({ project_id: project._id });
            if (memberCount >= project.capacity) {
                return res.json({ success: false, message: 'Project is already at full capacity' });
            }

            // Update the join request status to approved
            joinRequest.status = 'approved';
            await joinRequest.save();

            // Add the user as a project member
            await ProjectMember.create({
                project_id: project._id,
                user_id: joinRequest.user_id,
                joined_at: new Date()
            });

            // Update UserMetrics for the member (joinRequest.user_id)
            await UserMetrics.findOneAndUpdate(
                { user_id: joinRequest.user_id },
                {
                    $inc: {
                        projects_as_member: 1, // Increment projects as member
                        active_projects: 1,    // Increment active projects
                        total_collaborations: 1 // Increment total collaborations
                    }
                },
                { upsert: true }
            );

            // Create a notification for the member
            await Notification.create({
                user_id: joinRequest.user_id,
                message: `Your request to join project "${project.title}" has been approved`,
                task_id: null,
                type: 'join_request_approved'
            });

            res.json({ success: true, message: 'Join request approved successfully' });
        } catch (err) {
            console.error('Error approving join request:', err.message);
            res.status(500).json({ success: false, message: 'Failed to approve join request: ' + err.message });
        }
    });


    app.get("/ask", (req, res) => {
        res.redirect("/doubt");
    });

    app.post("/ask", upload.single("file-input"), async (req, res) => {
        const { message } = req.body;
        const filePath = req.file ? req.file.path : null;

        if (!req.session.user) {
            return res.json({ success: false, message: "Not logged in" });
        }

        if (req.session.user.role !== "user") {
            return res.json({ success: false, message: "Only users can raise doubts" });
        }

        try {
            const existingDoubt = await Doubt.findOne({
                text: message,
                user_id: req.session.user.id
            });
            if (existingDoubt) {
                return res.json({ success: false, message: "Doubt already exists" });
            }

            const doubt = await Doubt.create({
                author: req.session.user.name,
                text: message,
                file_path: filePath,
                timestamp: new Date(),
                user_id: req.session.user.id,
                visible_to_all: true
            });
            console.log("Created and saved doubt:", doubt);

            await UserMetrics.findOneAndUpdate(
                { user_id: req.session.user.id },
                { $inc: { inquiriesInitiated: 1 } },
                { upsert: true }
            );

            res.json({ 
                success: true, 
                message: "Doubt posted successfully", 
                doubt: {
                    _id: doubt._id,
                    author: doubt.author,
                    text: doubt.text,
                    timestamp: doubt.timestamp,
                    visible_to_all: doubt.visible_to_all
                }
            });
        } catch (err) {
            console.error("Error posting doubt:", err.message);
            res.json({ success: false, message: "Failed to post doubt" });
        }
    });

    app.get("/doubt", async (req, res) => {
        if (!req.session.user) {
            return res.redirect("/login");
        }

        try {
            const doubts = await Doubt.find({ visible_to_all: true })
                .populate({
                    path: 'replies',
                    match: { 
                        $or: [
                            { visible_to_all: true },
                            { user_id: req.session.user.id }
                        ]
                    },
                    populate: {
                        path: 'user_id',
                        select: 'name'
                    }
                })
                .populate('user_id', 'name')
                .sort({ timestamp: -1 })
                .lean();

            console.log("Raw doubts from DB:", doubts);

            const formattedDoubts = doubts.map(doubt => {
                const isOriginalPoster = doubt.user_id?._id.toString() === req.session.user.id;
                const filteredReplies = doubt.replies?.filter(reply => 
                    isOriginalPoster || reply.visible_to_all
                ) || [];

                console.log("Formatted doubt:", { ...doubt, replies: filteredReplies });

                return {
                    ...doubt,
                    author: doubt.user_id?.name || "Anonymous",
                    replies: filteredReplies.map(reply => ({
                        ...reply,
                        author: reply.user_id?.name || reply.author || "Anonymous",
                        timestamp: new Date(reply.timestamp).toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true
                        })
                    })),
                    timestamp: new Date(doubt.timestamp).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                        hour12: true
                    })
                };
            });

            console.log("Final formatted doubts:", formattedDoubts);

            res.render("doubt", {
                user: req.session.user,
                doubts: formattedDoubts,
                success: req.query.success,
                error: req.query.error,
                homeUrl: navData.homeUrl,
                navLinks: navData.navLinks
            });
        } catch (err) {
            console.error("Error fetching doubts:", err.message);
            res.render("doubt", {
                user: req.session.user,
                doubts: [],
                success: null,
                error: "Failed to load doubts",
                homeUrl: navData.homeUrl,
                navLinks: navData.navLinks
            });
        }
    });
app.get('/profile', async (req, res) => {
  if (!req.session.user) return res.redirect('/login');
  try {
    const userId = req.session.user.id;
    const user = await User.findById(userId).lean();
    if (!user) return res.redirect('/login?error=User not found');
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
});

app.post('/profile', upload.fields([
    { name: 'picture', maxCount: 1 },
    { name: 'resume', maxCount: 1 }
]), async (req, res) => {
    try {
        console.log('--- /profile called ---');
        console.log('session present:', !!req.session, req.session && req.session.user ? { id: req.session.user.id, name: req.session.user.name } : req.session);
        console.log('body keys:', Object.keys(req.body || {}), req.body);
        console.log('files keys:', req.files ? Object.keys(req.files) : 'no files', req.files);

        const userId = (req.session && req.session.user && (req.session.user.id || req.session.user._id)) || req.session.userId || null;
        if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });

        // Build update object
        const update = {};
        if (typeof req.body.name === 'string') update.name = req.body.name.trim();
        if (typeof req.body.email === 'string') update.email = req.body.email.trim();
        if (typeof req.body.about === 'string') update.about = req.body.about.trim();
        if (typeof req.body.skills === 'string') update.skills = req.body.skills.split(',').map(s => s.trim()).filter(Boolean);
        if (typeof req.body.interests === 'string') update.interests = req.body.interests.split(',').map(s => s.trim()).filter(Boolean);
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

        // update session user info if this is the logged-in user
        try {
            if (req.session && req.session.user && String(req.session.user.id) === String(user._id)) {
                req.session.user.name = user.name;
                req.session.user.email = user.email;
            }
        } catch (syncErr) {
            console.warn('Failed to sync session after profile save', syncErr);
        }

        const respUser = {
            _id: user._id,
            name: user.name,
            email: user.email,
            about: user.about,
            skills: Array.isArray(user.skills) ? user.skills : [],
            interests: Array.isArray(user.interests) ? user.interests : [],
            profileImageUrl: user.profileImageUrl || null,
            resumeUrl: user.resumeUrl || null,
            questionsAnswered: user.questionsAnswered || 0,
            thumbsUp: user.thumbsUp || 0,
            thumbsDown: user.thumbsDown || 0
        };

        console.log('/profile: success for user', userId);
        return res.json({ success: true, user: respUser });
    } catch (err) {
        console.error('Error in /profile POST:', err);
        return res.status(500).json({ success: false, error: err.message, stack: err.stack });
    }
});
app.get('/profile/:id', async (req, res) => {
    if (!req.session.user) return res.redirect('/login');
    const otherId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(otherId)) {
        return res.status(400).send('Invalid user id');
    }
    try {
        const user = await User.findById(otherId).lean();
        if (!user) return res.status(404).send('User not found');
        res.render('profile', {
            user,
            homeUrl: navData.homeUrl,
            navLinks: getNavLinks(req.session.user),
            query: req.query || {}
        });
    } catch (err) {
        console.error('Error loading user profile:', err.message);
        res.status(500).send('Server error');
    }
});

// JSON endpoint used by the notifications modal to fetch a lightweight profile
app.get('/profile-data/:id', async (req, res) => {
    // require logged-in user to view profile snippets
    if (!req.session.user) return res.status(401).json({ success: false, message: 'Not authenticated' });
    const id = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid user id' });
    try {
        const u = await User.findById(id).lean();
        if (!u) return res.status(404).json({ success: false, message: 'User not found' });

        const user = {
            id: u._id,
            name: u.name || 'Unknown',
            email: u.email || '',
            avatarUrl: u.profileImageUrl || u.profileImage || null,
            bio: u.about || u.bio || '',
            skills: Array.isArray(u.skills) ? u.skills : (u.skills ? String(u.skills).split(',').map(s => s.trim()).filter(Boolean) : []),
            interests: Array.isArray(u.interests) ? u.interests : (u.interests ? String(u.interests).split(',').map(s => s.trim()).filter(Boolean) : []),
            resumeUrl: u.resumeUrl || null,
            joinedAt: u.createdAt || u.created_at || null
        };

        return res.json({ success: true, user });
    } catch (err) {
        console.error('Error in /profile-data/:id', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
});

  




    app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    });