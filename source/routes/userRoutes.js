// routes/userRoutes.js (UPDATED for API Middleware)

const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { upload } = require("../middleware/uploadMiddleware");
// *** Use the new API-aware middleware ***
const { isAuthenticatedAPI, optionalAuth } = require('../middleware/authMiddleware'); 
const { cacheRoute } = require('../middleware/cacheMiddleware');
const jsonParser = require('express').json();

// User/Friends search & friend APIs
router.get('/users/search', isAuthenticatedAPI, userController.searchUsers);
router.post('/friend-request/send', isAuthenticatedAPI, jsonParser, userController.sendFriendRequest);
router.post('/friend-request/respond', isAuthenticatedAPI, jsonParser, userController.respondFriendRequest);
router.get('/friends', isAuthenticatedAPI, cacheRoute({ ttlSeconds: 20, scope: 'user' }), userController.getFriends);
router.get('/friend-requests', isAuthenticatedAPI, cacheRoute({ ttlSeconds: 20, scope: 'user' }), userController.getFriendRequests);


// --- Core User/Home Routes ---
// Public endpoints for session-check and topics (optionalAuth populates req.user if token exists)
router.get('/home', optionalAuth, userController.getHome);
router.get('/home/topics', userController.getHomeTopics);
router.post('/complete-onboarding', isAuthenticatedAPI, userController.completeOnboarding);
router.get('/dashboard', isAuthenticatedAPI, userController.getDashboard);
router.get('/dashboard-metrics', isAuthenticatedAPI, cacheRoute({ ttlSeconds: 45, scope: 'user' }), userController.getDashboardMetrics); // CORRECTED Path (No /api)
router.get('/dashboard-trends', isAuthenticatedAPI, cacheRoute({ ttlSeconds: 45, scope: 'user' }), userController.getDashboardTrends);

// --- Profile Routes ---
router.get('/profile', isAuthenticatedAPI, userController.getProfile); 
router.get('/profile/:id', isAuthenticatedAPI, userController.getProfile); 
router.get('/profile-data/:id', isAuthenticatedAPI, cacheRoute({ ttlSeconds: 45, scope: 'user' }), userController.getProfileData); // CORRECTED Path

router.post('/profile', isAuthenticatedAPI, upload.fields([
    { name: 'picture', maxCount: 1 },
    { name: 'resume', maxCount: 1 }
]), userController.postProfile);

// --- Simple Content Pages ---
router.get("/messages", userController.getMessages);
router.get("/FAQ", userController.getFAQ);


module.exports = router;