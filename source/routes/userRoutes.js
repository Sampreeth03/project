// routes/userRoutes.js (UPDATED for API Middleware)

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { upload } = require("../middleware/uploadMiddleware");
// *** Use the new API-aware middleware ***
const { isAuthenticatedAPI } = require('../middleware/authMiddleware'); 

// --- Core User/Home Routes ---
router.get('/home', isAuthenticatedAPI, userController.getHome);
router.get('/home/topics', isAuthenticatedAPI, userController.getHomeTopics);
router.get('/dashboard', isAuthenticatedAPI, userController.getDashboard);
router.get('/dashboard-metrics', isAuthenticatedAPI, userController.getDashboardMetrics); // CORRECTED Path (No /api)

// --- Profile Routes ---
router.get('/profile', isAuthenticatedAPI, userController.getProfile); 
router.get('/profile/:id', isAuthenticatedAPI, userController.getProfile); 
router.get('/profile-data/:id', isAuthenticatedAPI, userController.getProfileData); // CORRECTED Path

router.post('/profile', isAuthenticatedAPI, upload.fields([
    { name: 'picture', maxCount: 1 },
    { name: 'resume', maxCount: 1 }
]), userController.postProfile);

// --- Simple Content Pages ---
router.get("/messages", userController.getMessages);
router.get("/FAQ", userController.getFAQ);


module.exports = router;