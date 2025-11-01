// routes/doubtRoutes.js (UPDATED for API Middleware)

const express = require('express');
const router = express.Router();
const doubtController = require('../controllers/doubtController');
const { isAuthenticatedAPI } = require('../middleware/authMiddleware'); // NEW API IMPORT
const { upload } = require("../middleware/uploadMiddleware");

const jsonParser = express.json();

// Apply Authentication to all routes
router.use(isAuthenticatedAPI); // Changed to API-aware middleware

// --- Doubt/Q&A Views ---
router.get("/doubt", doubtController.getDoubtBoard);
router.get("/clear", doubtController.getClearDoubts);
// JSON endpoint for React frontend
router.get('/doubts', doubtController.getDoubtsJSON);

// --- Notification/Join Request Management View ---
router.get('/not', doubtController.getProjectNotifications); 

// --- API endpoint for React frontend ---
router.get('/notifications', doubtController.getProjectNotificationsJSON);

// --- Q&A Actions ---
router.post("/ask", upload.single("file-input"), doubtController.postDoubt);
router.post("/reply", jsonParser, doubtController.postReply);

module.exports = router;