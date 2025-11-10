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
router.get('/signup', authController.getSignup);
// Student signup uses express.json() for the JSON body, which we add inline
router.post('/signup', jsonParser, authController.postSignup); 

// Recruiter Signup Routes (File upload logic is here)
router.get('/signupforrec', authController.getRecruiterSignup);
router.post('/recruiter-signup', upload.single("objectFile"), authController.postRecruiterSignup); 

// Logout Route
router.get('/logout', authController.logout);

// Redirect Route
router.get('/ask', authController.redirectAsk); // Original route mapping to be moved here

module.exports = router;