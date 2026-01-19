// middleware/rateLimiterMiddleware.js
// Rate limiting middleware to prevent abuse

const rateLimit = require('express-rate-limit');

// Global rate limiter - applies to all routes (generous limit)
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // Limit each IP to 1000 requests per windowMs
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Auth limiter - for login/signup endpoints (strict)
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Limit each IP to 5 requests per windowMs
    message: {
        success: false,
        error: 'Too many authentication attempts, please try again after 15 minutes.'
    },
    skipSuccessfulRequests: true, // Don't count successful requests
});

// OTP limiter - for OTP request endpoints (very strict)
const otpLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 3 OTP requests per hour
    message: {
        success: false,
        error: 'Too many OTP requests. Please try again after 1 hour.'
    },
});

// Job application limiter - prevent spam applications
const jobApplicationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10, // Limit each IP to 10 job applications per hour
    message: {
        success: false,
        error: 'Too many job applications. Please try again later.'
    },
});

// Project creation limiter
const projectCreationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // Limit to 5 project creations per hour
    message: {
        success: false,
        error: 'Too many project creation requests. Please try again later.'
    },
});

// Recruiter job posting limiter
const jobPostingLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // Limit to 20 job postings per hour
    message: {
        success: false,
        error: 'Too many job postings. Please try again later.'
    },
});

module.exports = {
    globalLimiter,
    authLimiter,
    otpLimiter,
    jobApplicationLimiter,
    projectCreationLimiter,
    jobPostingLimiter
};
