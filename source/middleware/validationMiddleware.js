// middleware/validationMiddleware.js
// Input validation middleware using express-validator

const { body, validationResult } = require('express-validator');

// Helper function to handle validation errors
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            success: false,
            error: errors.array()[0].msg, // Return first error message
            errors: errors.array() // Full error details
        });
    }
    next();
};

// Validation rules for student signup
const validateStudentSignup = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 3 }).withMessage('Name must be at least 3 characters')
        .matches(/^[A-Za-z\s]+$/).withMessage('Name can only contain letters and spaces'),
    
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please enter a valid email address')
        .normalizeEmail(),
    
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
        .matches(/[0-9]/).withMessage('Password must contain at least one number'),
    
    body('confirmPassword')
        .notEmpty().withMessage('Please confirm your password')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match');
            }
            return true;
        }),
    
    handleValidationErrors
];

// Validation rules for recruiter signup
const validateRecruiterSignup = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 3 }).withMessage('Name must be at least 3 characters'),
    
    body('companyName')
        .trim()
        .notEmpty().withMessage('Company name is required')
        .isLength({ min: 2 }).withMessage('Company name must be at least 2 characters'),
    
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please enter a valid email address')
        .normalizeEmail(),
    
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
        .matches(/[A-Z]/).withMessage('Password must contain at least one uppercase letter')
        .matches(/[a-z]/).withMessage('Password must contain at least one lowercase letter')
        .matches(/[0-9]/).withMessage('Password must contain at least one number'),
    
    body('confirmPassword')
        .notEmpty().withMessage('Please confirm your password')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match');
            }
            return true;
        }),
    
    handleValidationErrors
];

// Validation rules for login
const validateLogin = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please enter a valid email address')
        .normalizeEmail(),
    
    body('password')
        .notEmpty().withMessage('Password is required'),
    
    handleValidationErrors
];

// Validation rules for OTP
const validateOTP = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please enter a valid email address')
        .normalizeEmail(),
    
    body('otp')
        .trim()
        .notEmpty().withMessage('OTP is required')
        .isLength({ min: 4, max: 4 }).withMessage('OTP must be 4 digits')
        .isNumeric().withMessage('OTP must contain only numbers'),
    
    handleValidationErrors
];

// Validation rules for job creation
const validateJobCreation = [
    body('jobTitle')
        .trim()
        .notEmpty().withMessage('Job title is required')
        .isLength({ min: 3, max: 100 }).withMessage('Job title must be 3-100 characters')
        .matches(/^[A-Za-z\s]+$/).withMessage('Job title can only contain letters and spaces'),
    
    body('description')
        .trim()
        .notEmpty().withMessage('Job description is required')
        .isLength({ min: 10, max: 2000 }).withMessage('Description must be 10-2000 characters')
        .matches(/^[A-Za-z\s]+$/).withMessage('Description can only contain letters and spaces'),
    
    body('salaryRange')
        .trim()
        .notEmpty().withMessage('Salary range is required')
        .matches(/[\d,.\-$£€₹kKmM]+/).withMessage('Please enter a valid salary range'),
    
    body('skills')
        .trim()
        .notEmpty().withMessage('Required skills are needed')
        .custom((value) => {
            const skills = value.split(',').map(s => s.trim()).filter(Boolean);
            if (skills.length === 0) {
                throw new Error('Please list at least one required skill');
            }
            return true;
        }),
    
    handleValidationErrors
];

// Validation rules for project creation
const validateProjectCreation = [
    body('title')
        .trim()
        .notEmpty().withMessage('Project title is required')
        .isLength({ min: 5, max: 100 }).withMessage('Title must be 5-100 characters'),
    
    body('description')
        .trim()
        .notEmpty().withMessage('Project description is required')
        .isLength({ min: 20, max: 1000 }).withMessage('Description must be 20-1000 characters'),
    
    body('topic')
        .trim()
        .notEmpty().withMessage('Project topic is required'),

    body('deadline')
        .notEmpty().withMessage('Deadline is required'),

    body('capacity')
        .optional()
        .isInt({ min: 2, max: 20 }).withMessage('Capacity must be between 2 and 20'),
    
    handleValidationErrors
];

// Validation rules for job application
const validateJobApplication = [
    body('skills')
        .trim()
        .notEmpty().withMessage('Your skills are required'),
    
    handleValidationErrors
];

// Validation for email only (forgot password, resend OTP, etc.)
const validateEmail = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please enter a valid email address')
        .normalizeEmail(),
    
    handleValidationErrors
];

module.exports = {
    validateStudentSignup,
    validateRecruiterSignup,
    validateLogin,
    validateOTP,
    validateJobCreation,
    validateProjectCreation,
    validateJobApplication,
    validateEmail,
    handleValidationErrors
};
