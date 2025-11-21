// routes/adminRoutes.js (UPDATED for API Middleware)

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAdminAPI } = require('../middleware/authMiddleware'); // NEW API IMPORT

// Apply isAdminAPI middleware to all routes in this router
router.use(isAdminAPI);

// --- Dashboard & Metrics ---
router.get("/admin", adminController.getAdminDashboard);
router.get("/admin/dashboard-data", adminController.getDashboardData);

// --- Students Management ---
router.get('/stud', adminController.getStudentsPage);
router.get('/students', adminController.getStudentsData); // CORRECTED Path

// --- Doubts Management ---
router.get('/admin-doubts', adminController.getDoubtsPage);

// --- Recruiters Management ---
router.get('/admin-rec', adminController.getRecruitersPage);
router.get('/admin-rec/data', adminController.getRecruitersData);

// --- Projects Management ---
router.get("/admin-proj", adminController.getProjectsPage);
router.get("/projects", adminController.getProjectsData); // CORRECTED Path

// --- Simple Static Pages ---
router.get('/admin-prof', adminController.getAdminProfilePage);
router.get('/admin-mess', adminController.getAdminMessagesPage);


module.exports = router;