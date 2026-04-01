// routes/authRoutes.js

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { upload } = require("../middleware/uploadMiddleware"); // Import Multer
const { authLimiter, otpLimiter } = require('../middleware/securityMiddleware');
const { validateStudentSignup, validateRecruiterSignup, validateLogin, validateOTP, validateEmail, validateForgotPasswordReset } = require('../middleware/validationMiddleware');

// Middleware to use for JSON body parsing on specific routes
const jsonParser = express.json();

// Public Routes (Landing, Login, Signup)
router.get('/', authController.getLanding);
router.get('/login', authController.getLogin);
router.post('/login', authLimiter, validateLogin, authController.postLogin);
router.post('/login/request-otp', otpLimiter, validateEmail, authController.postLoginRequestOtp);
router.post('/login/verify-otp', authLimiter, authController.postLoginVerifyOtp);
router.post('/forgot-password/request-otp', otpLimiter, validateEmail, authController.postForgotPasswordRequestOtp);
router.post('/forgot-password/reset', authLimiter, validateForgotPasswordReset, authController.postForgotPasswordReset);
router.get('/signup', authController.getSignup);
// Student signup now accepts file uploads for profile picture and resume
router.post('/signup', upload.fields([
    { name: 'picture', maxCount: 1 },
    { name: 'resume', maxCount: 1 }
]), authController.postSignup); 

// New multi-step student signup with OTP verification
router.post('/signup/init', authLimiter, upload.fields([
    { name: 'picture', maxCount: 1 },
    { name: 'resume', maxCount: 1 }
]), authController.postStudentSignupInit);
router.post('/signup/verify-otp', authLimiter, validateOTP, authController.postStudentVerifyOTP);
router.post('/signup/resend-otp', otpLimiter, validateEmail, authController.postStudentResendOTP);
router.post('/signup/verify-authenticator', authLimiter, authController.postStudentVerifyAuthenticatorSetup);

// Recruiter Signup Routes - Multi-step with OTP
router.get('/signupforrec', authController.getRecruiterSignup);
router.post('/recruiter-signup', upload.single("objectFile"), authController.postRecruiterSignup); // Legacy
// New multi-step recruiter signup
router.post('/recruiter/signup/init', authLimiter, authController.postRecruiterSignupInit);
router.post('/recruiter/signup/verify-otp', authLimiter, validateOTP, authController.postRecruiterVerifyOTP);
router.post('/recruiter/signup/resend-otp', otpLimiter, validateEmail, authController.postRecruiterResendOTP);
router.post('/recruiter/signup/complete', authLimiter, upload.single("companyDocument"), authController.postRecruiterCompleteSignup);

// Logout Route
router.get('/logout', authController.logout);

// Redirect Route
router.get('/ask', authController.redirectAsk); // Original route mapping to be moved here

module.exports = router;