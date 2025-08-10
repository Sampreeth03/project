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


const app = express();
const PORT = 3000;

app.use(express.json());
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/");
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + "-" + file.originalname);
    },
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
        { name: "Clear Doubts", href: "/clear" }, // Keep this for viewing replies
        {
            name: "Projects",
            href: "#",
            submenu: [
                { name: "My Created Projects", href: "/project" },
                { name: "Joined Projects", href: "/joined-projects" },
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
// Function to create default projects



// Define MONGODB_URI here 
const MONGODB_URI = 'mongodb://localhost:27017/page-check';
async function setupDefaultProjects() {
    try {
        const srihesh = await User.findOne({ name: 'Srihesh' });
        const priya = await User.findOne({ name: 'Priya' });

        const defaultProjects = [
            {
                title: 'Block Chain ',
                description: 'Blockchain is a shared immutable ledger that facilitates the process of recording transactions and tracking assets across a business network',
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

                // Add the creator as a project member
                await ProjectMember.create({
                    project_id: project._id,
                    user_id: project.user_id,
                    joined_at: new Date()
                });
                console.log(`Added creator as member for project: ${project.title}`);

                // Update UserMetrics for the creator
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
    await mongoose.connect(MONGODB_URI);
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
    } }
updateReplies();

// Function to create default users with hashed passwords
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
                password: await bcrypt.hash('Priya@12345', saltRounds),
                role: 'user',
                verified: true,
            },
            {
                name: 'Shiva',
                email: 'shiva@gmail.co',
                password: await bcrypt.hash('Shiva@12345', saltRounds),
                role: 'recruiter',
                verified: true,
            },
            {
                name: 'Arjun',
                email: 'arjun@gm.co',
                password: await bcrypt.hash('Arjun@12345', saltRounds),
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


// MongoDB connection with defined MONGODB_URI
mongoose.connect(MONGODB_URI)
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
        // Run the update once after connection
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
                active_projects: metrics.active_projects
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
        console.log('Logged in user:', req.session.user); // Optional debug log
        if (user.role === "admin") return res.redirect("/admin");
        if (user.role === "recruiter") return res.redirect("/recruiter-home");
        res.redirect("/home");
    } catch (err) {
        console.error('Error in login:', err.message);
        res.render("login", { error: "Server error" });
    }
});

app.get('/joined-projects', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }


    const userId = req.session.user.id;

    try {
        // Fetch projects that the user has joined
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
                    'members.user_id': new mongoose.Types.ObjectId(userId),
                    user_id: { $ne: new mongoose.Types.ObjectId(userId) }
                }
            },
            {
                $addFields: {
                    member_count: { $size: '$members' }
                }
            }
        ]);

        // Fetch available projects (not joined by the user)
        const availableProjects = await Project.find({ user_id: { $ne: userId } });

        res.render('projects-list', {
            user: req.session.user,
            createdProjects: projects || [], // Projects the user has joined
            availableProjects: availableProjects || [], // Projects available to join
            navLinks: getNavLinks(req.session.user),
            homeUrl: '/dashboard'
        });
    } catch (err) {
        console.error('Error fetching joined projects:', err.message);
        res.status(500).send('Server Error');
    }
});

app.get('/available-projects', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const userId = req.session.user.id;

    try {
        // Fetch all available projects
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
                    user_id: { $ne: new mongoose.Types.ObjectId(userId) } // Exclude projects created by the user
                }
            }
        ]);

        res.render('projects-list', {
            user: req.session.user,
            createdProjects: [], // No created projects for this view
            availableProjects: availableProjects || [], // Pass the available projects to the template
            navLinks: getNavLinks(req.session.user),
            homeUrl: '/dashboard'
        });
    } catch (err) {
        console.error('Error fetching available projects:', err.message);
        res.status(500).send('Server Error');
    }
});

// Route to create a project
app.post('/create-project', express.json(), async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'user') {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    const { title, description, capacity, topic, deadline } = req.body;
    const userId = req.session.user.id;

    try {
        // Validate input
        if (!title || !description || !capacity || !topic || !deadline) {
            console.log('Validation failed: Missing required fields', { userId, reqBody: req.body });
            return res.status(400).json({ success: false, error: 'All fields are required' });
        }

        // Ensure userId is a valid ObjectId
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID format');
        }

        // Create the new project
        const project = await Project.create({
            user_id: new mongoose.Types.ObjectId(userId), // Explicit ObjectId
            title,
            description,
            capacity: parseInt(capacity),
            topic,
            deadline: new Date(deadline),
            status: 'active',
            created_at: new Date()
        });
        console.log(`Project created: ${project._id} for user ${userId}`);

        // Update UserMetrics
        const updateResult = await UserMetrics.findOneAndUpdate(
            { user_id: new mongoose.Types.ObjectId(userId) },
            { $inc: { active_projects: 1, leadership_roles: 1, total_collaborations: 1 } },
            { upsert: true, new: true, runValidators: true }
        );
        console.log(`UserMetrics updated for user ${userId}:`, {
            active_projects: updateResult.active_projects,
            leadership_roles: updateResult.leadership_roles,
            total_collaborations: updateResult.total_collaborations
        });

        // Add user as project member
        await ProjectMember.create({
            project_id: project._id,
            user_id: new mongoose.Types.ObjectId(userId),
            joined_at: new Date()
        });
        console.log(`ProjectMember created for project ${project._id}`);

    } catch (err) {
        console.error('Error creating project:', err.message, { stack: err.stack, userId });
        res.status(500).json({ success: false, error: 'Database error: ' + err.message });
    }
});
// Route to join a project
app.post('/join-project', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { projectId } = req.body;
    const userId = req.session.user.id;

    if (!mongoose.Types.ObjectId.isValid(projectId)) {
        return res.status(400).json({ success: false, message: 'Invalid project ID' });
    }

    try {
        // Check if already a member
        const isMember = await ProjectMember.findOne({ project_id: projectId, user_id: userId });
        if (isMember) {
            return res.json({ success: false, message: 'You are already a member of this project' });
        }

        // Check if user is the creator
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }
        if (project.user_id.toString() === userId) {
            return res.json({ success: false, message: 'You cannot join your own project' });
        }

        // Check for existing join request
        const existingRequest = await JoinRequest.findOne({ project_id: projectId, user_id: userId });
        if (existingRequest) {
            return res.json({ success: false, message: 'You have_already requested to join this project' });
        }

        // Check capacity
        const memberCount = await ProjectMember.countDocuments({ project_id: projectId });
        if (memberCount >= project.capacity) {
            return res.json({ success: false, message: 'This project is full' });
        }

        // Create join request
        await JoinRequest.create({
            project_id: projectId,
            user_id: userId,
            status: 'pending',
            requested_at: new Date()
        });

        res.json({ success: true, message: 'Join request sent successfully' });
    } catch (err) {
        console.error('Error joining project:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.post('/reject-join-request', async (req, res) => {
    const { requestId } = req.body;
    console.log('reject-join-request session:', req.session.user);
        console.log('approve-join-request session:', req.session.user, 'requestId:', req.body.requestId);

    if (!requestId) {
        console.error('Validation error: Missing requestId');
        return res.status(400).json({ success: false, message: 'Request ID is required' });
    }

    try {
        const request = await JoinRequest.findOne({ _id: requestId })
            .populate({ path: 'project_id', match: { user_id: userId } });
        if (!request || !request.project_id) {
            return res.status(404).json({ success: false, message: 'Join request not found or you are not authorized to reject it' });
        }

        await JoinRequest.deleteOne({ _id: requestId });
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting join request:', err.message);
        res.status(500).json({ success: false, message: 'Server Error: ' + err.message });
    }
});

app.post('/delete-join-request', async (req, res) => {
    const { requestId } = req.body;
    console.log('delete-join-request session:', req.session.user);
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
                href: "/rec-prof",
                submenu: [
                    { name: "Profile", href: "/rec-prof" },
                    { name: "Dashboard", href: "/recruiter-dashboard" }
                ]
            },
        ]
    };
    res.render("recruiter-home", { user: req.session.user, ...recruiterNav });
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
                href: "/rec-prof",
                submenu: [
                    { name: "Profile", href: "/rec-prof" },
                    { name: "Dashboard", href: "/recruiter-dashboard" }
                ]
            }
        ]
    };

    const recruiterId = req.session.user.id;

    try {
        const jobCount = await JobApplication.countDocuments({ posted_by: recruiterId, user_id: null, active: 1 });
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

app.post("/create-recruiter-job", express.json(), async (req, res) => {
    if (!req.session.user || req.session.user.role !== "recruiter") {
        return res.status(403).json({ success: false, error: "Unauthorized" });
    }

    const { jobTitle, description, salaryRange, skills } = req.body;
    const recruiterId = req.session.user.id;
    const companyName = req.session.user.name;

    try {
        await JobApplication.create({
            posted_by: recruiterId,
            job_title: jobTitle,
            company_name: companyName,
            salary_range: salaryRange,
            description,
            skills,
            active: 1
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
        const result = await JobApplication.deleteOne({ _id: jobId, posted_by: recruiterId });
        if (result.deletedCount === 0) {
            return res.status(404).json({ success: false, error: "Job not found or not authorized to delete" });
        }
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
        
        // Set user in session and redirect to home
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

app.get("/admin", (req, res) => {
    if (!req.session.user || req.session.user.role !== "admin") {
        return res.redirect("/login");
    }

    const dashboardData = {
        currentPage: "dashboard",
        adminName: req.session.user.name,
        adminRole: "Super Admin",
        dashboardCards: [
            { title: "Students", icon: "user-graduate", stat: "2,547", colorClass: "primary", change: 12 },
            { title: "Recruiters", icon: "building", stat: "348", colorClass: "success", change: 8 },
            { title: "Projects", icon: "lightbulb", stat: "982", colorClass: "warning", change: 23 },
        ],
    };
    res.render('admin', { activePage: 'dashboard' });
});

app.get('/stud', (req, res) => {
    res.render('admin-stud', { activePage: 'dashboard' });
});

app.get('/admin-doubts', (req, res) => {
    res.render('admin-doubts', { activePage: 'dashboard' });
});

app.get('/admin-rec', (req, res) => {
    res.render('admin-rec', { activePage: 'dashboard' });
});

app.get('/admin-prof', (req, res) => {
    res.render('admin-prof', { activePage: 'dashboard' });
});

app.get('/admin-mess', (req, res) => {
    res.render('admin-mess', { activePage: 'dashboard' });
});

app.get('/admin-proj', (req, res) => {
    res.render('admin-proj', { activePage: 'dashboard' });
});

app.get("/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/login"));
});

app.get("/apply", async (req, res) => {
    try {
        const jobs = await JobApplication.find({ user_id: null })
            .select('_id job_title company_name salary_range description skills');
        res.render("applyjobs", {
            user: req.session.user || null,
            homeUrl: navData.homeUrl,
            navLinks: navData.navLinks,
            jobs: jobs || [],
        });
    } catch (err) {
        console.error("Error fetching jobs:", err.message);
        res.status(500).send("Internal Server Error");
    }
});

app.post("/apply-job", upload.single('resume'), async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ error: "Please log in to apply" });
    }
    const { jobId } = req.body;
    const userId = req.session.user.id;
    const resumePath = req.file ? req.file.path : null;

    try {
        const existing = await JobApplication.findOne({ _id: jobId, user_id: userId });
        if (existing) {
            return res.status(400).json({ error: "You have already applied for this job" });
        }

        const job = await JobApplication.findOne({ _id: jobId, user_id: null });
        if (!job) {
            return res.status(404).json({ error: "Job not found or already taken" });
        }

        await JobApplication.updateOne(
            { _id: jobId },
            { user_id: userId, resume_path: resumePath, date_applied: new Date(), status: 'Waiting' }
        );

        await UserMetrics.findOneAndUpdate(
            { user_id: userId },
            { $inc: { job_applications: 1 } },
            { upsert: true }
        );

        res.json({ success: true, message: "Application submitted" });
    } catch (err) {
        console.error("Error applying for job:", err.message);
        res.status(500).json({ error: "Failed to apply" });
    }
});

app.get("/job", async (req, res) => {
    if (!req.session.user || !req.session.user.id) {
        return res.redirect("/login");
    }
    const userId = req.session.user.id;

    try {
        const applications = await JobApplication.find({ user_id: userId, status: 'Waiting' })
            .select('job_title company_name salary_range description skills date_applied status');
        res.render("job-applications", {
            user: req.session.user,
            homeUrl: navData.homeUrl,
            navLinks: navData.navLinks,
            applications: applications || [],
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
                        topic,
                        user_id: { $ne: new mongoose.Types.ObjectId(userId) }
                    }
                },
                {
                    $lookup: {
                        from: 'users',
                        localField: 'user_id',
                        foreignField: '_id',
                        as: 'creator'
                    }
                },
                { $unwind: '$creator' },
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
                        memberCount: { $size: '$members' },
                        hasJoined: {
                            $in: [new mongoose.Types.ObjectId(userId), '$members.user_id']
                        },
                        hasPendingRequest: {
                            $in: [
                                new mongoose.Types.ObjectId(userId),
                                '$join_requests.user_id'
                            ]
                        },
                        createdBy: '$creator.name'
                    }
                },
                {
                    $project: {
                        members: 0,
                        join_requests: 0,
                        creator: 0
                    }
                }
            ]);

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

app.get("/e", async (req, res) => {
    if (!req.session.user || req.session.user.role !== "user") {
        return res.redirect("/login");
    }

    const userId = req.session.user.id;

    try {
        const createdProjects = await Project.aggregate([
            {
                $match: { user_id: new mongoose.Types.ObjectId(userId) }
            },
            {
                $lookup: {
                    from: 'projectmembers',
                    localField: '_id',
                    foreignField: 'project_id',
                    as: 'members'
                }
            },
            {
                $addFields: {
                    memberCount: { $size: '$members' }
                }
            },
            {
                $project: {
                    id: '$_id',
                    title: 1,
                    description: 1,
                    capacity: 1,
                    memberCount: 1,
                    topic: 1,
                    deadline: {
                        $dateToString: {
                            format: '%Y-%m-%d',
                            date: '$deadline'
                        }
                    }
                }
            }
        ]);

        res.render("create_proj", {
            user: req.session.user,
            projects: createdProjects || [],
            homeUrl: navData.homeUrl,
            navLinks: navData.navLinks,
            error: null
        });
    } catch (err) {
        console.error("Error fetching created projects:", err.message);
        res.render("create_proj", {
            user: req.session.user,
            projects: [],
            homeUrl: navData.homeUrl,
            navLinks: navData.navLinks,
            error: "Failed to load projects"
        });
    }
});

app.post('/create-project', express.json(), async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'user') {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
    }
    const { title, description, capacity, topic, deadline } = req.body;
    const userId = req.session.user.id;

    try {
        // Validate input
        if (!title || !description || !capacity || !topic || !deadline) {
            console.log('Validation failed: Missing required fields', { userId, reqBody: req.body });
            return res.status(400).json({ success: false, error: 'All fields are required' });
        }

        // Create the new project
        const project = await Project.create({
            user_id: userId,
            title,
            description,
            capacity: parseInt(capacity),
            topic,
            deadline: new Date(deadline),
            status: 'active',
            created_at: new Date()
        });
        console.log(`Project created: ${project._id} for user ${userId}`);

        // Update UserMetrics
        const updateResult = await UserMetrics.findOneAndUpdate(
            { user_id: new mongoose.Types.ObjectId(userId) },
            { $inc: { active_projects: 1, leadership_roles: 1, total_collaborations: 1 } },
            { upsert: true, new: true, runValidators: true }
        );
        console.log(`UserMetrics updated for user ${userId}:`, {
            active_projects: updateResult.active_projects,
            leadership_roles: updateResult.leadership_roles,
            total_collaborations: updateResult.total_collaborations
        });

        // Add user as project member
        await ProjectMember.create({ project_id: project._id, user_id: new mongoose.Types.ObjectId(userId), joined_at: new Date() });
        console.log(`ProjectMember created for project ${project._id}`);

        res.json({ success: true, projectId: project._id, redirect: '/dashboard' });
    } catch (err) {
        console.error('Error creating project:', err.message, { stack: err.stack, userId });
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

app.post('/join-project', async (req, res) => {
    const { projectId } = req.body;
    const userId = req.session.user.id;

    if (!req.session.user || !userId) {
        console.error('Session error: User not authenticated');
        return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    if (!projectId) {
        console.error('Validation error: Missing projectId');
        return res.status(400).json({ success: false, message: 'Project ID is required' });
    }

    try {
        const member = await ProjectMember.findOne({ project_id: projectId, user_id: userId });
        if (member) {
            return res.json({ success: false, message: 'You are already a member of this project' });
        }

        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        if (project.user_id.equals(userId)) {
            return res.json({ success: false, message: 'You are the creator of this project and cannot join as a member' });
        }

        const existingRequest = await JoinRequest.findOne({ project_id: projectId, user_id: userId });
        if (existingRequest) {
            return res.json({ success: false, message: 'You have already requested to join this project' });
        }

        const memberCount = await ProjectMember.countDocuments({ project_id: projectId });
        if (memberCount >= project.capacity) {
            return res.json({ success: false, message: 'Project is already at full capacity' });
        }

        await JoinRequest.create({ project_id: projectId, user_id: userId, status: 'pending', requested_at: new Date() });
        res.json({ success: true, message: 'Join request sent for approval' });
    } catch (err) {
        console.error('Error creating join request:', err.message);
        res.status(500).json({ success: false, message: 'Server Error: ' + err.message });
    }
});

app.post('/reject-join-request', async (req, res) => {
    const { requestId } = req.body;
    const userId = req.session.user.id;

    if (!requestId) {
        console.error('Validation error: Missing requestId');
        return res.status(400).json({ success: false, message: 'Request ID is required' });
    }

    try {
        const request = await JoinRequest.findOne({ _id: requestId })
            .populate({ path: 'project_id', match: { user_id: userId } });
        if (!request || !request.project_id) {
            return res.status(404).json({ success: false, message: 'Join request not found or you are not authorized to reject it' });
        }

        await JoinRequest.deleteOne({ _id: requestId });
        res.json({ success: true });
    } catch (err) {
        console.error('Error deleting join request:', err.message);
        res.status(500).json({ success: false, message: 'Server Error: ' + err.message });
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

app.post('/mark-notification-read', async (req, res) => {
    const { notificationId } = req.body;
    console.log('mark-notification-read session:', req.session.user);

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
    console.log('delete-notification session:', req.session.user);

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
    console.log('get-task-project session:', req.session.user);
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

        // Get all members before deleting
        const members = await ProjectMember.find({ project_id: projectId });

        // Delete project and related data
        await Promise.all([
            Project.deleteOne({ _id: projectId }),
            ProjectMember.deleteMany({ project_id: projectId }),
            Task.deleteMany({ project_id: projectId }),
            JoinRequest.deleteMany({ project_id: projectId })
        ]);

        // Update metrics for all members
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
        // Get all doubts marked as visible_to_all (shared with everyone)
        const doubts = await Doubt.find({ 
            visible_to_all: true 
        })
        .populate({
            path: 'replies',
            populate: {
                path: 'user_id',
                select: 'name' // Include user name with each reply
            }
        })
        .populate('user_id', 'name') // Include original doubt author's name
        .sort({ timestamp: -1 })
        .lean();

        // Format the data for the view
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
// Route to reply to a doubt (from clear section)
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
        const reply = await Reply.create({
            doubt_id: doubtId,
            author: req.session.user.name,
            text,
            timestamp: new Date(),
            user_id: req.session.user.id,
            visible_to_all: !isPrivate
        });
        await Doubt.findByIdAndUpdate(doubtId, { $push: { replies: reply._id } });
        await UserMetrics.findOneAndUpdate(
            { user_id: req.session.user.id },
            { $inc: { solutions_provided: 1 } },
            { upsert: true }
        );
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

app.get('/project', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const userId = req.session.user.id;

    try {
        // Fetch projects created by the user
        const createdProjects = await Project.find({ user_id: userId });

        // Fetch available projects (projects not created by the user and not joined)
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
                    user_id: { $ne: new mongoose.Types.ObjectId(userId) }, // Exclude projects created by the user
                    is_member: false // Exclude projects the user has already joined
                }
            }
        ]);

        res.render('projects-list', {
            user: req.session.user,
            createdProjects: createdProjects || [],
            availableProjects: availableProjects || [], // Pass availableProjects to the template
            navLinks: getNavLinks(req.session.user),
            homeUrl: '/dashboard'
        });
    } catch (err) {
        console.error('Error fetching projects:', err.message);
        res.status(500).send('Server Error');
    }
});


app.get('/project/:id', async (req, res) => {
    if (!req.session.user) {
        return res.redirect('/login');
    }

    const projectId = req.params.id;
    const userId = req.session.user.id;

    try {
        // Validate projectId
        if (!mongoose.Types.ObjectId.isValid(projectId)) {
            return res.status(400).send('Invalid project ID');
        }

        // Fetch the specific project details
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).send('Project not found');
        }

        // Fetch tasks related to the project
        const tasks = await Task.find({ project_id: projectId });

        // Fetch all members of the project with populated user_id
        const projectMembers = await ProjectMember.find({ project_id: projectId })
            .populate({
                path: 'user_id',
                select: 'name email', // Only fetch necessary fields
            })
            .lean(); // Convert to plain JS objects for easier debugging

        // Log projectMembers to debug
        console.log('Project Members:', JSON.stringify(projectMembers, null, 2));

        // Fetch the user's created projects for the dropdown
        const projects = await Project.find({ user_id: userId });

        res.render('project-details', {
            user: req.session.user,
            project,
            tasks: tasks || [],
            projectMembers: projectMembers || [],
            projects: projects || [],
            navLinks: getNavLinks(req.session.user),
            homeUrl: '/dashboard'
        });
    } catch (err) {
        console.error('Error fetching project details:', err.message);
        res.status(500).send('Server Error');
    }
});
app.post('/task/create', async (req, res) => {
    try {
        const { projectId, title, description, assignedTo, dueDate } = req.body;
        const task = new Task({
            title,
            description,
            assigned_to: assignedTo,
            due_date: new Date(dueDate),
            status: 'In Progress',
            project_id: projectId
        });
        await task.save();
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});

app.post('/project/:id/finish', async (req, res) => {
    try {
        const projectId = req.params.id;
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        // Update project status and tasks
        await Project.findByIdAndUpdate(projectId, { status: 'completed' });
        await Task.updateMany({ project_id: projectId, status: { $ne: 'Completed' } }, { status: 'Completed' });

        // Decrement active_projects for the project creator
        const userId = project.user_id.toString();
        const updateResult = await UserMetrics.findOneAndUpdate(
            { user_id: new mongoose.Types.ObjectId(userId) },
            { $inc: { active_projects: -1 } },
            { new: true, runValidators: true }
        );
        console.log(`UserMetrics updated for user ${userId} after project completion:`, {
            active_projects: updateResult.active_projects
        });

        res.json({ success: true });
    } catch (err) {
        console.error('Error completing project:', err.message, { stack: err.stack, projectId });
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
app.post('/project/:id/remove-member', async (req, res) => {
    try {
        const projectId = req.params.id;
        const { memberId } = req.body;
        await ProjectMember.deleteOne({ project_id: projectId, user_id: memberId });
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false, message: err.message });
    }
});
app.get('/project/:id/pending-tasks', async (req, res) => {
    if (!req.session.user || req.session.user.role !== 'user') {
        return res.status(403).json({ success: false, error: 'Unauthorized' });
    }

    const projectId = req.params.id;
    const userId = req.session.user.id;

    try {
        const isMember = await ProjectMember.findOne({ project_id: projectId, user_id: userId });
        if (!isMember) {
            return res.status(403).json({ success: false, error: 'Unauthorized: You are not a member of this project' });
        }

        const count = await Task.countDocuments({ project_id: projectId, status: { $ne: 'Completed' } });
        res.json({ success: true, pendingTasks: count });
    } catch (err) {
        console.error('Error checking pending tasks:', err.message);
        res.status(500).json({ success: false, error: 'Database error' });
    }
});
app.post('/task/submit-github-link', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    const { taskId, githubLink, projectId } = req.body;
    const userId = req.session.user.id;

    try {
        // Verify task exists and is assigned to user
        const task = await Task.findOneAndUpdate(
            { _id: taskId, assigned_to: userId },
            { 
                github_link: githubLink,
                status: 'Review'
            },
            { new: true }
        );

        if (!task) {
            return res.status(404).json({ success: false, message: 'Task not found' });
        }

        // Get project owner
        const project = await Project.findById(projectId)
            .populate('user_id');

        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found' });
        }

        // Notify project owner
        await Notification.create({
            user_id: project.user_id._id,
            message: `Task "${task.title}" submitted for review by ${req.session.user.name}`,
            task_id: task._id,
            is_read: false
        });

        res.json({ success: true });
    } catch (err) {
        console.error('Error submitting task:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

app.get("/messages", (req, res) => {
    res.render("group", { user: req.session.user || null, homeUrl: navData.homeUrl, navLinks: navData.navLinks });
});

app.get("/FAQ", (req, res) => {
    res.render("faqpage", { user: req.session.user || null, homeUrl: navData.homeUrl, navLinks: navData.navLinks });
});

app.get('/not', async (req, res) => {
 
    const userId = req.session.user.id;
    const navLinks = getNavLinks(req.session.user);

    try {
        const taskNotifications = await Notification.find({ user_id: userId })
            .populate('task_id', 'title')
            .sort({ created_at: -1 });

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
                created_at: n.created_at,
                is_read: n.is_read,
                task_title: n.task_id?.title
            })) || [],
            joinRequests: joinRequests.map(jr => ({
                id: jr._id,
                user_id: jr.user_id._id,
                user_name: jr.user_id.name,
                project_title: jr.project_id.title,
                requested_at: jr.requested_at
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
    const { requestId } = req.body;
    const userId = req.session.user.id;

    if (!requestId) {
        console.error('Validation error: Missing requestId');
        return res.status(400).json({ success: false, message: 'Request ID is required' });
    }

    try {
        const request = await JoinRequest.findOne({ _id: requestId })
            .populate({ path: 'project_id', match: { user_id: userId } });
        if (!request || !request.project_id) {
            return res.status(404).json({ success: false, message: 'Join request not found or you are not authorized to approve it' });
        }

        const projectId = request.project_id._id;
        const memberId = request.user_id;

        const memberCount = await ProjectMember.countDocuments({ project_id: projectId });
        const project = await Project.findById(projectId);
        if (memberCount >= project.capacity) {
            return res.json({ success: false, message: 'Project is already at full capacity' });
        }

        await ProjectMember.create({ project_id: projectId, user_id: memberId, joined_at: new Date() });

        await UserMetrics.findOneAndUpdate(
            { user_id: memberId },
            { $inc: { projects_as_member: 1, projects_participated: 1, active_projects: project.status === 'active' ? 1 : 0 } },
            { upsert: true }
        );

        await JoinRequest.deleteOne({ _id: requestId });

        res.json({ success: true });
    } catch (err) {
        console.error('Error approving join request:', err.message);
        res.status(500).json({ success: false, message: 'Server Error: ' + err.message });
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
        console.log("Created and saved doubt:", doubt); // Debug

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

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});