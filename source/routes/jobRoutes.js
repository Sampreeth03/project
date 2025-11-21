// routes/jobRoutes.js (UPDATED for API Middleware)

const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { isAuthenticatedAPI } = require('../middleware/authMiddleware'); // NEW API IMPORT
const { upload } = require("../middleware/uploadMiddleware"); 

const jsonParser = express.json();

// Apply Authentication to all routes
router.use(isAuthenticatedAPI); // Changed to API-aware middleware

// --- Student Job Views ---
router.get('/apply', jobController.getJobApplyPage);
router.get('/job', jobController.getStudentApplications);
router.get('/job_not', jobController.getJobNotifications);

// --- Student Job Actions ---
router.post('/apply-job', upload.single('resume'), jobController.applyForJob);

// --- General Notification APIs ---
router.post('/mark-notification-read', jsonParser, jobController.markNotificationRead);
router.post('/delete-notification', jsonParser, jobController.deleteNotification);


module.exports = router;