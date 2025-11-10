// routes/userRoutes.js

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { upload } = require("../middleware/uploadMiddleware");

// Authentication check middleware (Temporary inline replacement)
const isAuthenticated = (req, res, next) => {
    // This check will be centralized later in a dedicated authMiddleware.js
    if (!req.session.user) return res.redirect('/login');
    next();
};

// --- Core User/Home Routes ---
router.get('/home', isAuthenticated, userController.getHome);
router.get('/home/topics', isAuthenticated, userController.getHomeTopics);
router.get('/dashboard', isAuthenticated, userController.getDashboard);
router.get('/api/dashboard-metrics', isAuthenticated, userController.getDashboardMetrics);

// --- Profile Routes ---
router.get('/profile', isAuthenticated, userController.getProfile); // My Profile
router.get('/profile/:id', isAuthenticated, userController.getProfile); // Other User Profile
router.get('/profile-data/:id', isAuthenticated, userController.getProfileData); // API endpoint

// Note: Multer middleware is used here before the controller logic runs
router.post('/profile', isAuthenticated, upload.fields([
    { name: 'picture', maxCount: 1 },
    { name: 'resume', maxCount: 1 }
]), userController.postProfile);

// --- Simple Content Pages (No authentication required in controller logic) ---
router.get("/messages", userController.getMessages);
router.get("/FAQ", userController.getFAQ);


module.exports = router;