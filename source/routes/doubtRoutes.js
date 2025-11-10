// routes/doubtRoutes.js

const express = require('express');
const router = express.Router();
const doubtController = require('../controllers/doubtController');
const { isAuthenticated } = require('../middleware/authMiddleware'); 
const { upload } = require("../middleware/uploadMiddleware");

const jsonParser = express.json();

// Apply Authentication to all routes
router.use(isAuthenticated);

// --- Doubt/Q&A Views ---
router.get("/doubt", doubtController.getDoubtBoard);
router.get("/clear", doubtController.getClearDoubts);

// --- Notification/Join Request Management View ---
router.get('/not', doubtController.getProjectNotifications); // FIXES PROJECT NOTIF VIEW

// --- Q&A Actions ---
// NOTE: /ask GET is a redirect in authController.js
router.post("/ask", upload.single("file-input"), doubtController.postDoubt);
router.post("/reply", jsonParser, doubtController.postReply);

module.exports = router;