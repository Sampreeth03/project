// routes/recruiterRoutes.js (UPDATED for API Middleware)

const express = require('express');
const router = express.Router();
const recruiterController = require('../controllers/recruiterController');
const { isRecruiterAPI } = require('../middleware/authMiddleware'); // NEW API IMPORT
const { jobPostingLimiter } = require('../middleware/securityMiddleware');
const { validateJobCreation } = require('../middleware/validationMiddleware');
const { cacheRoute } = require('../middleware/cacheMiddleware');

const jsonParser = express.json(); 

/**
 * @swagger
 * /api/recruiter-home:
 *   get:
 *     summary: Get recruiter home payload
 *     tags: [Recruiter]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Recruiter home data
 *       403:
 *         description: Recruiter access required
 */

// --- Recruiter Views ---
router.get("/recruiter-home", isRecruiterAPI, recruiterController.getRecruiterHome);

/**
 * @swagger
 * /api/rec-job:
 *   get:
 *     summary: Get recruiter job management view data
 *     tags: [Recruiter]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Recruiter jobs and metrics
 */
router.get("/rec-job", isRecruiterAPI, cacheRoute({ scope: 'recruiter' }), recruiterController.getRecruiterJobs);

/**
 * @swagger
 * /api/recruiter-dashboard:
 *   get:
 *     summary: Get recruiter dashboard metrics
 *     tags: [Recruiter]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Dashboard counts and success rate
 */
router.get("/recruiter-dashboard", isRecruiterAPI, cacheRoute({ scope: 'recruiter' }), recruiterController.getRecruiterDashboard);

/**
 * @swagger
 * /api/recruiter-dashboard-trends:
 *   get:
 *     summary: Get recruiter dashboard trend analytics
 *     tags: [Recruiter]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Weekly trends and hiring pipeline data
 */
router.get("/recruiter-dashboard-trends", isRecruiterAPI, cacheRoute({ scope: 'recruiter' }), recruiterController.getRecruiterDashboardTrends);

/**
 * @swagger
 * /api/rec-app:
 *   get:
 *     summary: Get recruiter application feed
 *     tags: [Recruiter]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Applications for recruiter jobs
 */
router.get('/rec-app', isRecruiterAPI, cacheRoute({ scope: 'recruiter' }), recruiterController.getRecruiterApplications);

/**
 * @swagger
 * /api/rec-not:
 *   get:
 *     summary: Get recruiter notifications
 *     tags: [Recruiter]
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Recruiter notifications list
 */
router.get('/rec-not', isRecruiterAPI, cacheRoute({ scope: 'recruiter' }), recruiterController.getRecruiterNotifications);

// --- Job Management APIs (Paths are correct) ---

/**
 * @swagger
 * /api/create-recruiter-job:
 *   post:
 *     summary: Create a recruiter job posting
 *     tags: [Recruiter]
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [jobTitle, companyName, description, salaryRange, skills]
 *             properties:
 *               jobTitle:
 *                 type: string
 *               companyName:
 *                 type: string
 *               description:
 *                 type: string
 *               salaryRange:
 *                 type: string
 *               skills:
 *                 type: string
 *               customQuestions:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Job created
 *       403:
 *         description: Recruiter not verified or forbidden
 */
router.post("/create-recruiter-job", isRecruiterAPI, jobPostingLimiter, jsonParser, validateJobCreation, recruiterController.createRecruiterJob);

/**
 * @swagger
 * /api/delete-recruiter-job/{id}:
 *   delete:
 *     summary: Delete recruiter job posting
 *     tags: [Recruiter]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job deleted
 *       404:
 *         description: Job not found
 */
router.delete("/delete-recruiter-job/:id", isRecruiterAPI, recruiterController.deleteRecruiterJob);

/**
 * @swagger
 * /api/toggle-job-active/{id}:
 *   patch:
 *     summary: Toggle recruiter job active state
 *     tags: [Recruiter]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               active:
 *                 oneOf:
 *                   - type: boolean
 *                   - type: integer
 *                     enum: [0, 1]
 *     responses:
 *       200:
 *         description: Job activation updated
 */
router.patch("/toggle-job-active/:id", isRecruiterAPI, jsonParser, recruiterController.toggleJobActive);

// --- Application Review APIs (Paths are correct) ---

/**
 * @swagger
 * /api/view-resume/{id}:
 *   get:
 *     summary: Stream applicant resume file
 *     tags: [Recruiter]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Resume stream
 *       404:
 *         description: Resume not found
 */
router.get('/view-resume/:id', isRecruiterAPI, recruiterController.viewResume);

/**
 * @swagger
 * /api/update-application-status/{id}:
 *   patch:
 *     summary: Update applicant status in recruiter pipeline
 *     tags: [Recruiter]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [Approved, Rejected]
 *               statusLc:
 *                 type: string
 *                 enum: [approved, rejected]
 *     responses:
 *       200:
 *         description: Application status updated
 */
router.patch('/update-application-status/:id', isRecruiterAPI, jsonParser, recruiterController.updateApplicationStatus);

/**
 * @swagger
 * /api/update-application-status:
 *   post:
 *     summary: Update applicant status (legacy endpoint)
 *     tags: [Recruiter]
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
 *               status:
 *                 type: string
 *                 enum: [Approved, Rejected]
 *               statusLc:
 *                 type: string
 *                 enum: [approved, rejected]
 *     responses:
 *       200:
 *         description: Application status updated
 */
router.post("/update-application-status", isRecruiterAPI, jsonParser, recruiterController.updateApplicationStatus);

/**
 * @swagger
 * /api/user-profile-for-recruiter/{userId}:
 *   get:
 *     summary: Get applicant profile data visible to recruiter
 *     tags: [Recruiter]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User profile and metrics
 *       403:
 *         description: Access denied for this profile
 */
router.get('/user-profile-for-recruiter/:userId', isRecruiterAPI, recruiterController.getUserProfileForRecruiter);


module.exports = router;