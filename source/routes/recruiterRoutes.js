// routes/recruiterRoutes.js (UPDATED for API Middleware)

const express = require('express');
const router = express.Router();
const recruiterController = require('../controllers/recruiterController');
const { isRecruiterAPI } = require('../middleware/authMiddleware'); // NEW API IMPORT
const { jobPostingLimiter } = require('../middleware/securityMiddleware');
const { validateJobCreation } = require('../middleware/validationMiddleware');

const jsonParser = express.json(); 

// --- Recruiter Views ---
router.get("/recruiter-home", isRecruiterAPI, recruiterController.getRecruiterHome);
router.get("/rec-job", isRecruiterAPI, recruiterController.getRecruiterJobs);
router.get("/recruiter-dashboard", isRecruiterAPI, recruiterController.getRecruiterDashboard);
router.get("/recruiter-dashboard-trends", isRecruiterAPI, recruiterController.getRecruiterDashboardTrends);
router.get('/rec-app', isRecruiterAPI, recruiterController.getRecruiterApplications);
router.get('/rec-not', isRecruiterAPI, recruiterController.getRecruiterNotifications);

// --- Job Management APIs (Paths are correct) ---
router.post("/create-recruiter-job", isRecruiterAPI, jobPostingLimiter, jsonParser, validateJobCreation, recruiterController.createRecruiterJob);
router.delete("/delete-recruiter-job/:id", isRecruiterAPI, recruiterController.deleteRecruiterJob);
router.patch("/toggle-job-active/:id", isRecruiterAPI, jsonParser, recruiterController.toggleJobActive);

// --- Application Review APIs (Paths are correct) ---
router.get('/view-resume/:id', isRecruiterAPI, recruiterController.viewResume);
router.patch('/update-application-status/:id', isRecruiterAPI, jsonParser, recruiterController.updateApplicationStatus);
router.post("/update-application-status", isRecruiterAPI, jsonParser, recruiterController.updateApplicationStatus);
router.get('/user-profile-for-recruiter/:userId', isRecruiterAPI, recruiterController.getUserProfileForRecruiter);


module.exports = router;