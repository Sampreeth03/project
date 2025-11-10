// routes/recruiterRoutes.js

const express = require('express');
const router = express.Router();
const recruiterController = require('../controllers/recruiterController');
const { isRecruiter } = require('../middleware/authMiddleware'); // NEW IMPORT

// Apply isRecruiter middleware to all routes in this router
router.use(isRecruiter);
const jsonParser = express.json(); 

// --- Recruiter Views ---
router.get("/recruiter-home", recruiterController.getRecruiterHome);
router.get("/rec-job", recruiterController.getRecruiterJobs);
router.get("/recruiter-dashboard", recruiterController.getRecruiterDashboard);
router.get('/rec-app', recruiterController.getRecruiterApplications);
router.get('/rec-not', recruiterController.getRecruiterNotifications);

// --- Job Management APIs (POST/DELETE/PATCH) ---
router.post("/create-recruiter-job", jsonParser, recruiterController.createRecruiterJob);
router.delete("/delete-recruiter-job/:id", recruiterController.deleteRecruiterJob);
router.patch("/toggle-job-active/:id", jsonParser, recruiterController.toggleJobActive);

// --- Application Review APIs ---
router.get('/view-resume/:id', recruiterController.viewResume);
router.patch('/update-application-status/:id', jsonParser, recruiterController.updateApplicationStatus);
router.post("/update-application-status", jsonParser, recruiterController.updateApplicationStatus); 


module.exports = router;