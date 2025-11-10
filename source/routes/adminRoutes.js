// routes/adminRoutes.js

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { isAdmin } = require('../middleware/authMiddleware'); // NEW IMPORT

// Apply isAdmin middleware to all routes in this router
router.use(isAdmin);

// --- Dashboard & Metrics ---
router.get("/admin", adminController.getAdminDashboard);
router.get("/admin/dashboard-data", adminController.getDashboardData);

// --- Students Management ---
router.get('/stud', adminController.getStudentsPage);
router.get('/api/students', adminController.getStudentsData);

// --- Doubts Management ---
router.get('/admin-doubts', adminController.getDoubtsPage);

// --- Recruiters Management ---
router.get('/admin-rec', adminController.getRecruitersPage);
router.get('/admin-rec/data', adminController.getRecruitersData);

// --- Projects Management ---
router.get("/admin-proj", adminController.getProjectsPage);
router.get("/api/projects", adminController.getProjectsData);

// --- Simple Static Pages ---
router.get('/admin-prof', adminController.getAdminProfilePage);
router.get('/admin-mess', adminController.getAdminMessagesPage);


module.exports = router;