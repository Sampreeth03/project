// project/source/app.js (Updated for React API Backend)

const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser"); // Retained for compatibility, but express.json is primary
const path = require("path");
const cors = require("cors");

// --- Import ALL Routers ---
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const recruiterRoutes = require('./routes/recruiterRoutes'); 
const projectRoutes = require('./routes/projectRoutes');
const doubtRoutes = require('./routes/doubtRoutes');
const jobRoutes = require('./routes/jobRoutes');

// --- Import Config/Middleware/Utilities ---
// navData, userNav, getNavLinks removed as they are for EJS navigation
const { topics, topicNormalizationMap } = require("./config/constants"); 
const { validatePassword, getTimeAgo } = require("./services/helperService"); 
const { upload } = require("./middleware/uploadMiddleware");
// Note: Keeping database imports
const { User, UserMetrics, Doubt, Reply, JobApplication, Project, ProjectMember, JoinRequest, Task, Notification } = require("./database"); 

const app = express();

// -------------------------------------------------------------------------
//                    GLOBAL MIDDLEWARE SETUP
// -------------------------------------------------------------------------

// 0. CORS Configuration
app.use(cors({
  origin: 'http://localhost:5173', // Vite default port
  credentials: true
}));

// 1. Core Parsers
app.use(express.json()); // Essential for API requests
// Keep urlencoded for form data handling if needed, but JSON is primary for API
app.use(bodyParser.urlencoded({ extended: true }));

// 2. View Engine and Static Assets
// REMOVED: app.set('view engine', 'ejs');
// REMOVED: app.set('views', path.join(__dirname, 'views'));
// REMOVED: app.use(express.static("public")); 
app.use("/uploads", express.static("uploads")); // KEEP to serve user uploaded files (e.g., profile pictures)

// 3. Session Management - KEPT for now, but React requires cookie handling (withCredentials)
app.use(
session({
 secret: "your-secret-key", 
 resave: false,
 saveUninitialized: false,
 cookie: {
   httpOnly: true,
   secure: false, // set to true in production with HTTPS
   sameSite: 'lax',
   maxAge: 24 * 60 * 60 * 1000 // 24 hours
 }
 })
);

// -------------------------------------------------------------------------
//                         MOUNT ROUTERS
// -------------------------------------------------------------------------

// CRITICAL: Mount ALL routers under the '/api' prefix for the React frontend
// NOTE: Order matters! Admin routes mounted first to avoid auth conflicts
app.use('/api', authRoutes); 
app.use('/api', adminRoutes);  // Admin routes first (no auth for development)
app.use('/api', recruiterRoutes); 
app.use('/api', userRoutes);
app.use('/api', projectRoutes);
app.use('/api', doubtRoutes);
app.use('/api', jobRoutes);


// -------------------------------------------------------------------------
//                   REMOVED EJS GLOBAL UTILITY EXPOSURE
// -------------------------------------------------------------------------

// app.locals.navData = navData; // REMOVED
// app.locals.userNav = userNav; // REMOVED
// app.locals.getNavLinks = getNavLinks; // REMOVED


// -------------------------------------------------------------------------
//                           EXPORTS
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
};