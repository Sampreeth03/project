// routes/paymentRoutes.js

const express = require('express');
const router  = express.Router();
const paymentController = require('../controllers/paymentController');
const { isAuthenticatedAPI } = require('../middleware/authMiddleware');

const jsonParser = express.json();

// Create a Razorpay order (called before checkout opens)
router.post('/create-order', isAuthenticatedAPI, jsonParser, paymentController.createOrder);

// Verify payment signature and create project
router.post('/verify', isAuthenticatedAPI, jsonParser, paymentController.verifyAndCreateProject);

module.exports = router;
