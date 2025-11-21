// routes/recruiterRoutes.js (UPDATED for API Middleware)

const express = require('express');
const router = express.Router();
const recruiterController = require('../controllers/recruiterController');
const { isRecruiterAPI } = require('../middleware/authMiddleware'); // NEW API IMPORT

// Apply isRecruiterAPI middleware to all routes in this router
router.use(isRecruiterAPI);
const jsonParser = express.json(); 

// --- Recruiter Views ---
router.get("/recruiter-home", recruiterController.getRecruiterHome);
router.get("/rec-job", recruiterController.getRecruiterJobs);
router.get("/recruiter-dashboard", recruiterController.getRecruiterDashboard);
router.get('/rec-app', recruiterController.getRecruiterApplications);
router.get('/rec-not', recruiterController.getRecruiterNotifications);

// --- Job Management APIs (Paths are correct) ---
router.post("/create-recruiter-job", jsonParser, recruiterController.createRecruiterJob);
router.delete("/delete-recruiter-job/:id", recruiterController.deleteRecruiterJob);
router.patch("/toggle-job-active/:id", jsonParser, recruiterController.toggleJobActive);

// --- Application Review APIs (Paths are correct) ---
router.get('/view-resume/:id', recruiterController.viewResume);
router.patch('/update-application-status/:id', jsonParser, recruiterController.updateApplicationStatus);
router.post("/update-application-status", jsonParser, recruiterController.updateApplicationStatus); 


module.exports = router;