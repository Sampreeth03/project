// routes/jobRoutes.js (UPDATED for API Middleware)

const express = require('express');
const router = express.Router();
const jobController = require('../controllers/jobController');
const { isAuthenticatedAPI } = require('../middleware/authMiddleware'); // NEW API IMPORT
const { upload } = require("../middleware/uploadMiddleware");
const { jobApplicationLimiter } = require('../middleware/securityMiddleware');
const { validateJobApplication } = require('../middleware/validationMiddleware');
const { cacheRoute } = require('../middleware/cacheMiddleware');

const jsonParser = express.json();

/**
 * @swagger
 * /api/apply:
 *   get:
 *     summary: Get active job postings for student apply page
 *     tags: [Job]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Available jobs with hasApplied flags
 */

// --- Student Job Views ---
router.get('/apply', isAuthenticatedAPI, cacheRoute({ ttlSeconds: 30, scope: 'user' }), jobController.getJobApplyPage);

/**
 * @swagger
 * /api/job:
 *   get:
 *     summary: Get current student job applications
 *     tags: [Job]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Student applications list
 */
router.get('/job', isAuthenticatedAPI, cacheRoute({ ttlSeconds: 30, scope: 'user' }), jobController.getStudentApplications);

/**
 * @swagger
 * /api/job_not:
 *   get:
 *     summary: Get student job notifications (approved/rejected/applied)
 *     tags: [Job]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Job notifications feed
 */
router.get('/job_not', isAuthenticatedAPI, cacheRoute({ ttlSeconds: 30, scope: 'user' }), jobController.getJobNotifications);

// --- Student Job Actions ---

/**
 * @swagger
 * /api/apply-job:
 *   post:
 *     summary: Submit a student job application with resume upload
 *     tags: [Job]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [jobId, resume]
 *             properties:
 *               jobId:
 *                 type: string
 *               resume:
 *                 type: string
 *                 format: binary
 *               customAnswers:
 *                 type: string
 *                 description: JSON string of custom answers
 *     responses:
 *       200:
 *         description: Application submitted
 *       400:
 *         description: Validation error or duplicate application
 */
router.post('/apply-job', isAuthenticatedAPI, jobApplicationLimiter, upload.single('resume'), jobController.applyForJob);

// --- General Notification APIs ---

/**
 * @swagger
 * /api/mark-notification-read:
 *   post:
 *     summary: Mark notification as read
 *     tags: [Job]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [notificationId]
 *             properties:
 *               notificationId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Notification marked as read
 */
router.post('/mark-notification-read', isAuthenticatedAPI, jsonParser, jobController.markNotificationRead);

/**
 * @swagger
 * /api/delete-notification:
 *   post:
 *     summary: Delete notification
 *     tags: [Job]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [notificationId]
 *             properties:
 *               notificationId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Notification deleted
 */
router.post('/delete-notification', isAuthenticatedAPI, jsonParser, jobController.deleteNotification);

// --- Revoke Application ---

/**
 * @swagger
 * /api/revoke-application:
 *   delete:
 *     summary: Revoke student application (if not approved)
 *     tags: [Job]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [applicationId]
 *             properties:
 *               applicationId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Application revoked
 *       400:
 *         description: Invalid state for revoke
 */
router.delete('/revoke-application', isAuthenticatedAPI, jsonParser, jobController.revokeApplication);


module.exports = router;