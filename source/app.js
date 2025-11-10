// app.js

const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");

// --- Import ALL Routers ---
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const recruiterRoutes = require('./routes/recruiterRoutes'); 
const projectRoutes = require('./routes/projectRoutes'); // NEWLY ADDED (Project Module)
const doubtRoutes = require('./routes/doubtRoutes');
const jobRoutes = require('./routes/jobRoutes');

// --- Import Config/Middleware/Utilities (Assuming correct paths relative to app.js) ---
const { navData, userNav, topics, topicNormalizationMap } = require("./config/constants");
const { validatePassword, getTimeAgo, getNavLinks } = require("./services/helperService"); 
const { upload } = require("./middleware/uploadMiddleware");
// Note: We still import models/DB from the old location until we restructure database.js
const { User, UserMetrics, Doubt, Reply, JobApplication, Project, ProjectMember, JoinRequest, Task, Notification } = require("./database"); 

const app = express();

// -------------------------------------------------------------------------
//                    GLOBAL MIDDLEWARE SETUP
// -------------------------------------------------------------------------

// 1. Core Parsers
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 2. View Engine and Static Assets
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static("public"));
app.use("/uploads", express.static("uploads"));

// 3. Session Management
app.use(
    session({
        secret: "your-secret-key", 
        resave: false,
        saveUninitialized: true,
    })
);

// -------------------------------------------------------------------------
//                         MOUNT ROUTERS
// -------------------------------------------------------------------------

// Core Authentication and Landing
app.use('/', authRoutes); 
// User Dashboard and Profile
app.use('/', userRoutes);
// Project Management and Topic Views
app.use('/', projectRoutes);
app.use('/', doubtRoutes);
app.use('/', jobRoutes);
// Role-based Modules (Order matters to prevent route hijacking, Recruiter should precede Admin)
app.use('/', recruiterRoutes); 
app.use('/', adminRoutes);


// Remaining modules (Doubt, Job Student side) will be mounted here...


// -------------------------------------------------------------------------
//              TEMPORARY GLOBAL UTILITY EXPOSURE (FOR EJS VIEWS)
// -------------------------------------------------------------------------

app.locals.navData = navData;
app.locals.userNav = userNav;
app.locals.getNavLinks = getNavLinks;


// -------------------------------------------------------------------------
//                           EXPORTS
// -------------------------------------------------------------------------

module.exports = { 
    app, 
    topics, 
    User, 
    UserMetrics, 
    Doubt, 
    Reply, 
    JobApplication, 
    Project, 
    ProjectMember, 
    JoinRequest, 
    Task, 
    Notification, 
    upload, 
    validatePassword, 
    getTimeAgo, 
    getNavLinks 
};