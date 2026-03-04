// routes/adminRoutes.js (UPDATED for API Middleware)

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAdminAPI } = require('../middleware/authMiddleware'); // NEW API IMPORT

// NOTE: For development, auth middleware is commented out
// Uncomment the line below to enable admin authentication in production
// router.use(isAdminAPI);

// --- Dashboard & Metrics ---
router.get("/admin", adminController.getAdminDashboard);
router.get("/admin/dashboard-data", adminController.getDashboardData);

// --- Students Management ---
router.get('/stud', adminController.getStudentsPage);
router.get('/students', adminController.getStudentsData); // CORRECTED Path

// --- Doubts Management ---
router.get('/admin-doubts', adminController.getDoubtsPage);
router.get('/admin-doubts/data', adminController.getDoubtsData); // NEW API endpoint

// --- Recruiters Management ---
router.get('/admin-rec', adminController.getRecruitersPage);
router.get('/admin-rec/data', adminController.getRecruitersData);

// --- Projects Management ---
router.get("/admin-proj", adminController.getProjectsPage);
router.get("/projects", adminController.getProjectsData); // CORRECTED Path

// --- Simple Static Pages ---
router.get('/admin-prof', adminController.getAdminProfilePage);
router.get('/admin-prof/data', adminController.getProfileData); // Profile data API
router.get('/admin-mess', adminController.getAdminMessagesPage);
router.get('/admin-mess/data', adminController.getMessagesData); // NEW API endpoint

// --- Platform Administrators Management ---
router.get('/platform-admins', adminController.getPlatformAdministrators);
router.post('/platform-admins', adminController.createPlatformAdministrator);


module.exports = router;