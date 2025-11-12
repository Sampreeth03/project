// routes/doubtRoutes.js (UPDATED for API Middleware)

const express = require('express');
const router = express.Router();
const doubtController = require('../controllers/doubtController');
const { isAuthenticatedAPI } = require('../middleware/authMiddleware'); // NEW API IMPORT
const { upload } = require("../middleware/uploadMiddleware");

const jsonParser = express.json();

// --- Doubt/Q&A Views ---
// Public GET endpoints so users can browse doubts without logging in
router.get("/doubt", doubtController.getDoubtBoard);
router.get("/clear", doubtController.getClearDoubts);
// JSON endpoint for React frontend
router.get('/doubts', doubtController.getDoubtsJSON);

// --- Notification/Join Request Management View ---
// Auth-required: notifications are user-specific
router.get('/not', isAuthenticatedAPI, doubtController.getProjectNotifications); 

// --- API endpoint for React frontend ---
router.get('/notifications', isAuthenticatedAPI, doubtController.getProjectNotificationsJSON);

// --- Q&A Actions ---
// Auth-required for posting/ replying
router.post("/ask", isAuthenticatedAPI, upload.single("file-input"), doubtController.postDoubt);
router.post("/reply", isAuthenticatedAPI, jsonParser, doubtController.postReply);

module.exports = router;