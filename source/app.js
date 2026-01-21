const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const path = require("path");
const cors = require("cors");

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const adminRoutes = require('./routes/adminRoutes');
const recruiterRoutes = require('./routes/recruiterRoutes'); 
const projectRoutes = require('./routes/projectRoutes');
const doubtRoutes = require('./routes/doubtRoutes');
const jobRoutes = require('./routes/jobRoutes');
const messageRoutes = require('./routes/messageRoutes');

// Import config and middleware
const { topics, topicNormalizationMap } = require("./config/constants"); 
const { validatePassword, getTimeAgo } = require("./services/helperService"); 
const { upload } = require("./middleware/uploadMiddleware");
const { globalLimiter, helmetConfig, corsOptions } = require("./middleware/securityMiddleware");
const { morganMiddleware } = require("./middleware/loggingMiddleware");
const { User, UserMetrics, Doubt, Reply, JobApplication, Project, ProjectMember, JoinRequest, Task, Notification } = require("./database"); 

const app = express();

// Security headers
app.use(helmetConfig);

// CORS configuration
app.use(cors(corsOptions));

// Logging middleware
app.use(morganMiddleware);

// Global rate limiting
app.use(globalLimiter);

// Request parsers
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve uploaded files
app.use("/uploads", express.static("uploads"));

// Session management
app.use(
session({
 secret: "your-secret-key", 
 resave: false,
 saveUninitialized: false,
 cookie: {
   httpOnly: true,
   secure: false,
   sameSite: 'lax',
   maxAge: 24 * 60 * 60 * 1000
 }
 })
);

// Mount API routes
app.use('/api', authRoutes); 
app.use('/api', adminRoutes);
app.use('/api', recruiterRoutes); 
app.use('/api', userRoutes);
app.use('/api', projectRoutes);
app.use('/api', doubtRoutes);
app.use('/api', jobRoutes);
app.use('/api/messages', messageRoutes);



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