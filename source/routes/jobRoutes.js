// routes/jobRoutes.js

const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { isAuthenticated } = require('../middleware/authMiddleware'); 
const { upload } = require("../middleware/uploadMiddleware"); // Imports Multer instance

const jsonParser = express.json();

// Apply Authentication to all routes
router.use(isAuthenticated);

// --- Student Job Views ---
router.get('/apply', jobController.getJobApplyPage);
router.get('/job', jobController.getStudentApplications);
router.get('/job_not', jobController.getJobNotifications);

// --- Student Job Actions (Resume must be named 'resume' in the form) ---
router.post('/apply-job', upload.single('resume'), jobController.applyForJob);

// --- General Notification APIs ---
router.post('/mark-notification-read', jsonParser, jobController.markNotificationRead);
router.post('/delete-notification', jsonParser, jobController.deleteNotification);


module.exports = router;