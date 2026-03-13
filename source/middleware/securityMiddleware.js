const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Global rate limiter: 1000 requests per 15 minutes
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    message: {
        success: false,
        error: 'Too many requests from this IP, please try again later.'
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// Auth limiter: 5 attempts per 15 minutes for login/signup
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        success: false,
        error: 'Too many authentication attempts, please try again after 15 minutes.'
    },
    skipSuccessfulRequests: true,
});

// OTP limiter: 10 requests per hour
const otpLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        error: 'Too many OTP requests. Please try again after 1 hour.'
    },
});

// Job application limiter: 10 per hour
const jobApplicationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        error: 'Too many job applications. Please try again later.'
    },
});

// Project creation limiter: 100 per hour (increased for development/testing)
const projectCreationLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 100,
    message: {
        success: false,
        error: 'Too many project creation requests. Please try again later.'
    },
});

// Job posting limiter: 20 per hour
const jobPostingLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 20,
    message: {
        success: false,
        error: 'Too many job postings. Please try again later.'
    },
});

// Helmet configuration for secure HTTP headers
const helmetConfig = helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:", "http://localhost:5173"],
            connectSrc: ["'self'", "http://localhost:5173", "http://localhost:5000", "ws://localhost:5000"],
            fontSrc: ["'self'", "data:"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
});

// CORS configuration for Vite dev server
const corsOptions = {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    credentials: true,
    maxAge: 600,
    optionsSuccessStatus: 204
};

module.exports = {
    // Rate Limiters
    globalLimiter,
    authLimiter,
    otpLimiter,
    jobApplicationLimiter,
    projectCreationLimiter,
    jobPostingLimiter,
    // Security Middleware
    helmetConfig,
    corsOptions
};
