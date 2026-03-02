// routes/jobRoutes.js (UPDATED for API Middleware)

const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { isAuthenticatedAPI } = require('../middleware/authMiddleware'); // NEW API IMPORT
const { upload } = require("../middleware/uploadMiddleware");
const { jobApplicationLimiter } = require('../middleware/securityMiddleware');
const { validateJobApplication } = require('../middleware/validationMiddleware');

const jsonParser = express.json();

// --- Student Job Views ---
router.get('/apply', isAuthenticatedAPI, jobController.getJobApplyPage);
router.get('/job', isAuthenticatedAPI, jobController.getStudentApplications);
router.get('/job_not', isAuthenticatedAPI, jobController.getJobNotifications);

// --- Student Job Actions ---
router.post('/apply-job', isAuthenticatedAPI, jobApplicationLimiter, upload.single('resume'), jobController.applyForJob);

// --- General Notification APIs ---
router.post('/mark-notification-read', isAuthenticatedAPI, jsonParser, jobController.markNotificationRead);
router.post('/delete-notification', isAuthenticatedAPI, jsonParser, jobController.deleteNotification);


module.exports = router;