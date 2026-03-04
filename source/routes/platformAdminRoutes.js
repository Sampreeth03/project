// routes/platformAdminRoutes.js

const express = require('express');
const router = express.Router();
const platformAdminController = require('../controllers/platformAdminController');

const jsonParser = express.json();

// Platform administrator login
router.post('/platform-admin/login', jsonParser, platformAdminController.loginPlatformAdmin);

// Platform administrator dashboard summary
router.get('/platform-admin/summary', platformAdminController.getPlatformAdminSummary);

// Recruiter verification APIs (protected via session check inside controller)
router.get('/platform-admin/recruiters', platformAdminController.getRecruitersForVerification);
router.post('/platform-admin/recruiters/:id/verify', jsonParser, platformAdminController.updateRecruiterVerification);

module.exports = router;
