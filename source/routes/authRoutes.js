// routes/authRoutes.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { upload } = require("../middleware/uploadMiddleware"); // Import Multer

// Middleware to use for JSON body parsing on specific routes
const jsonParser = express.json();

// Public Routes (Landing, Login, Signup)
router.get('/', authController.getLanding);
router.get('/login', authController.getLogin);
router.post('/login', authController.postLogin);
router.post('/login/request-otp', authController.postLoginRequestOtp);
router.post('/login/verify-otp', authController.postLoginVerifyOtp);
router.post('/forgot-password/request-otp', authController.postForgotPasswordRequestOtp);
router.post('/forgot-password/reset', authController.postForgotPasswordReset);
router.get('/signup', authController.getSignup);
// Student signup now accepts file uploads for profile picture and resume
router.post('/signup', upload.fields([
    { name: 'picture', maxCount: 1 },
    { name: 'resume', maxCount: 1 }
]), authController.postSignup); 

// New multi-step student signup with OTP verification
router.post('/signup/init', upload.fields([
    { name: 'picture', maxCount: 1 },
    { name: 'resume', maxCount: 1 }
]), authController.postStudentSignupInit);
router.post('/signup/verify-otp', authController.postStudentVerifyOTP);
router.post('/signup/resend-otp', authController.postStudentResendOTP);

// Recruiter Signup Routes - Multi-step with OTP
router.get('/signupforrec', authController.getRecruiterSignup);
router.post('/recruiter-signup', upload.single("objectFile"), authController.postRecruiterSignup); // Legacy
// New multi-step recruiter signup
router.post('/recruiter/signup/init', authController.postRecruiterSignupInit);
router.post('/recruiter/signup/verify-otp', authController.postRecruiterVerifyOTP);
router.post('/recruiter/signup/resend-otp', authController.postRecruiterResendOTP);
router.post('/recruiter/signup/complete', upload.single("companyDocument"), authController.postRecruiterCompleteSignup);

// Forgot Password Routes
router.post('/forgot-password', authController.postForgotPassword);
router.post('/verify-reset-token', authController.postVerifyResetToken);
router.post('/reset-password', authController.postResetPassword);

// Logout Route
router.get('/logout', authController.logout);

// Redirect Route
router.get('/ask', authController.redirectAsk); // Original route mapping to be moved here

module.exports = router;