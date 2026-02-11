// controllers/authController.js (UPDATED FOR API - Focus on 3, 5, 6, 7)

const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { User, UserMetrics, PendingRecruiter, PendingStudent } = require("../database"); 
const { validatePassword } = require("../services/helperService");
const { upload } = require("../middleware/uploadMiddleware"); 
const { createLoginOtp, verifyLoginOtp } = require('../services/otpService');
const { sendLoginOtpEmail, isEmailConfigured } = require('../services/emailService');
const emailService = require("../services/emailService");

// =========================================================================
// 1-2. Landing/Login Page (GET / & /login) - REMOVED EJS RENDER
// =========================================================================
exports.getLanding = (req, res) => {
    res.json({ status: 'API operational' });
};
exports.getLogin = (req, res) => {
    res.json({ status: 'API operational' });
};

// =========================================================================
// 3. Handle Login Submission (POST /login) - CONVERTED TO JSON API
// =========================================================================
exports.postLogin = async (req, res, next) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, error: "Email and password are required" });
    }

    if (!validatePassword(password)) {
        return res.status(400).json({ 
            success: false, 
            error: "Password validation failed." 
        });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ success: false, error: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: "Invalid email or password" });
        }

        req.session.user = { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
        
        req.session.save(err => {
            if (err) {
                console.error("Error saving session:", err);
                err.statusCode = 500;
                err.publicMessage = "Server error during login session setup";
                return next(err);
            }
            
            // Return JSON payload with minimal user data and a suggested redirect path
            res.status(200).json({ 
                success: true, 
                message: "Login successful",
                user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role },
                redirectPath: user.role === "admin" ? "/admin" : (user.role === "recruiter" ? "/recruiter-home" : "/home")
            });
        });

    } catch (err) {
        console.error('Error in login:', err.message);
        err.statusCode = 500;
        err.publicMessage = "Server error";
        return next(err);
    }
};

// =========================================================================
// 4. Render Student/User Signup Page (GET /signup) - REMOVED EJS RENDER
// =========================================================================
exports.getSignup = (req, res) => {
    res.json({ status: 'API operational' });
};

// =========================================================================
// 5. Handle Student/User Signup Submission (POST /signup) - CONVERTED TO JSON API
// =========================================================================
exports.postSignup = async (req, res, next) => {
    const { name, email, password, about, skills, interests } = req.body;
    
    if (!name || !email || !password) {
        return res.status(400).json({ success: false, error: 'Name, email, and password are required' });
    }

    if (!validatePassword(password)) {
        return res.status(400).json({ 
            success: false, 
            error: 'Password validation failed.' 
        });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ success: false, error: 'Email already in use' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Build user object with profile fields
        const userData = { 
            name, 
            email, 
            password: hashedPassword, 
            role: 'user', 
            verified: false 
        };
        
        // Add profile fields if provided
        if (about) userData.about = about;
        if (skills) userData.skills = skills.split(',').map(s => s.trim()).filter(Boolean);
        if (interests) userData.interests = interests.split(',').map(s => s.trim()).filter(Boolean);
        
        // Handle file uploads from multer
        if (req.files) {
            if (req.files.picture && req.files.picture[0]) {
                const f = req.files.picture[0];
                userData.profileImageUrl = `/uploads/${f.filename}`.replace(/\\/g, '/');
            }
            if (req.files.resume && req.files.resume[0]) {
                const f = req.files.resume[0];
                userData.resumeUrl = `/uploads/${f.filename}`.replace(/\\/g, '/');
            }
        }
        
        const user = await User.create(userData);
        await UserMetrics.create({ user_id: user._id });
        
        // We do not auto-login, just return success status (201 Created)
        // Client redirects to login page.
        res.status(201).json({ success: true, message: 'Signup successful. Please log in.' });

    } catch (err) {
        console.error('Signup error:', err.message);
        err.statusCode = 500;
        err.publicMessage = 'Signup failed';
        return next(err);
    }
};

// =========================================================================
// 5b. Student Signup - Multi-step with OTP Verification (NEW FLOW)
// =========================================================================

// Step 1: Initialize student signup and send OTP
exports.postStudentSignupInit = async (req, res) => {
    const { name, email, password, confirmPassword, about, skills, interests } = req.body;

    // Validation
    if (!name || !email || !password) {
        return res.status(400).json({ success: false, error: "Name, email, and password are required" });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ success: false, error: "Passwords do not match" });
    }

    if (!validatePassword(password)) {
        return res.status(400).json({ 
            success: false, 
            error: "Password must be at least 6 characters with uppercase and special character." 
        });
    }

    try {
        // Check if email already exists in Users
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ success: false, error: "Email already registered" });
        }

        // Check if there's a pending signup - delete it to allow retry
        await PendingStudent.deleteOne({ email: email.toLowerCase() });

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Prepare pending student data
        const pendingData = {
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            about: about || '',
            skills: skills ? skills.split(',').map(s => s.trim()).filter(Boolean) : [],
            interests: interests ? interests.split(',').map(s => s.trim()).filter(Boolean) : []
        };

        // Handle file uploads if present
        if (req.files) {
            if (req.files.picture && req.files.picture[0]) {
                const f = req.files.picture[0];
                pendingData.profileImageUrl = `/uploads/${f.filename}`.replace(/\\/g, '/');
            }
            if (req.files.resume && req.files.resume[0]) {
                const f = req.files.resume[0];
                pendingData.resumeUrl = `/uploads/${f.filename}`.replace(/\\/g, '/');
            }
        }

        // Create pending student record
        await PendingStudent.create(pendingData);

        // Generate and send OTP using the existing otpService
        const otp = createLoginOtp({ 
            email: email.toLowerCase(), 
            userId: 'pending-signup', 
            role: 'user' 
        });
        
        // Send OTP email
        await sendLoginOtpEmail({ to: email, otp, purpose: 'signup' });

        res.status(200).json({ 
            success: true, 
            message: "Verification code sent to your email",
            email: email.toLowerCase()
        });

    } catch (err) {
        console.error('Student signup init error:', err.message);
        if (err.statusCode === 429) {
            return res.status(429).json({ success: false, error: err.message });
        }
        res.status(500).json({ success: false, error: "Server error. Please try again." });
    }
};

// Step 2: Verify OTP and complete signup (auto-login)
exports.postStudentVerifyOTP = async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ success: false, error: "Email and OTP are required" });
    }

    try {
        // Verify OTP using otpService
        const otpResult = verifyLoginOtp({ email: email.toLowerCase(), otp });
        
        if (!otpResult.ok) {
            let errorMsg = 'Invalid verification code.';
            if (otpResult.reason === 'expired') errorMsg = 'Verification code has expired. Please request a new one.';
            if (otpResult.reason === 'locked') errorMsg = 'Too many attempts. Please request a new code.';
            if (otpResult.reason === 'no_code') errorMsg = 'No verification code found. Please start signup again.';
            if (otpResult.attemptsLeft !== undefined) {
                errorMsg = `Invalid code. ${otpResult.attemptsLeft} attempts remaining.`;
            }
            return res.status(400).json({ success: false, error: errorMsg });
        }

        // Find pending student
        const pending = await PendingStudent.findOne({ email: email.toLowerCase() });

        if (!pending) {
            return res.status(404).json({ success: false, error: "Signup session expired. Please start again." });
        }

        // Create actual user from pending data
        const userData = {
            name: pending.name,
            email: pending.email,
            password: pending.password, // Already hashed
            role: 'user',
            verified: true,
            about: pending.about,
            skills: pending.skills,
            interests: pending.interests,
            profileImageUrl: pending.profileImageUrl,
            resumeUrl: pending.resumeUrl,
            onboardingCompleted: false // New user - show onboarding
        };

        const user = await User.create(userData);
        await UserMetrics.create({ user_id: user._id });

        // Delete pending record
        await PendingStudent.deleteOne({ email: email.toLowerCase() });

        // Auto-login: Create session
        req.session.user = { 
            id: user._id.toString(), 
            name: user.name, 
            email: user.email, 
            role: user.role 
        };
        
        req.session.save(err => {
            if (err) {
                console.error("Error saving session:", err);
                return res.status(500).json({ success: false, error: "Server error during login" });
            }
            
            res.status(201).json({ 
                success: true, 
                message: "Signup successful! Welcome to RelabTeams.",
                user: { 
                    id: user._id.toString(), 
                    name: user.name, 
                    email: user.email, 
                    role: user.role,
                    onboardingCompleted: false,
                    isNewSignup: true // Flag to trigger onboarding on client
                },
                redirectPath: '/home',
                isNewSignup: true
            });
        });

    } catch (err) {
        console.error('Student OTP verification error:', err.message);
        res.status(500).json({ success: false, error: "Verification failed. Please try again." });
    }
};

// Step 3: Resend OTP for student signup
exports.postStudentResendOTP = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, error: "Email is required" });
    }

    try {
        const pending = await PendingStudent.findOne({ email: email.toLowerCase() });
        
        if (!pending) {
            return res.status(404).json({ success: false, error: "Signup session expired. Please start again." });
        }

        // Generate new OTP
        const otp = createLoginOtp({ 
            email: email.toLowerCase(), 
            userId: 'pending-signup', 
            role: 'user' 
        });
        
        // Send OTP email
        await sendLoginOtpEmail({ to: email, otp, purpose: 'signup' });

        res.status(200).json({ success: true, message: "New verification code sent" });

    } catch (err) {
        console.error('Resend OTP error:', err.message);
        if (err.statusCode === 429) {
            return res.status(429).json({ success: false, error: err.message });
        }
        res.status(500).json({ success: false, error: "Failed to resend code" });
    }
};

// =========================================================================
// 6. Recruiter Signup - Multi-step with OTP Verification
// =========================================================================
exports.getRecruiterSignup = (req, res) => {
    res.json({ status: 'API operational' });
};

// Step 1: Initialize recruiter signup and send OTP
exports.postRecruiterSignupInit = async (req, res) => {
    const { name, email, password, confirmPassword, companyName } = req.body;

    // Validation
    if (!name || !email || !password) {
        return res.status(400).json({ success: false, error: "Name, email, and password are required" });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ success: false, error: "Passwords do not match" });
    }

    if (!validatePassword(password)) {
        return res.status(400).json({ 
            success: false, 
            error: "Password must be at least 8 characters with uppercase, lowercase, number, and special character." 
        });
    }

    try {
        // Check if email already exists in Users
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({ success: false, error: "Email already registered" });
        }

        // Check if there's a pending signup
        await PendingRecruiter.deleteOne({ email: email.toLowerCase() });

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create pending recruiter record
        await PendingRecruiter.create({
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            companyName: companyName || ''
        });

        // Send OTP email
        const otpResult = await emailService.sendSignupOTP(email, name);
        
        if (!otpResult.success) {
            return res.status(500).json({ success: false, error: "Failed to send verification email. Please try again." });
        }

        res.status(200).json({ 
            success: true, 
            message: "Verification code sent to your email",
            email: email.toLowerCase()
        });

    } catch (err) {
        console.error('Recruiter signup init error:', err.message);
        res.status(500).json({ success: false, error: "Server error. Please try again." });
    }
};

// Step 2: Verify OTP
exports.postRecruiterVerifyOTP = async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ success: false, error: "Email and OTP are required" });
    }

    try {
        // Verify OTP
        const otpResult = emailService.verifyOTP(email, otp, 'signup');
        
        if (!otpResult.valid) {
            return res.status(400).json({ success: false, error: otpResult.error });
        }

        // Mark pending recruiter as OTP verified
        const pending = await PendingRecruiter.findOneAndUpdate(
            { email: email.toLowerCase() },
            { otpVerified: true },
            { new: true }
        );

        if (!pending) {
            return res.status(404).json({ success: false, error: "Signup session expired. Please start again." });
        }

        res.status(200).json({ 
            success: true, 
            message: "Email verified successfully. Please upload company document.",
            email: email.toLowerCase()
        });

    } catch (err) {
        console.error('OTP verification error:', err.message);
        res.status(500).json({ success: false, error: "Verification failed. Please try again." });
    }
};

// Step 3: Resend OTP
exports.postRecruiterResendOTP = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, error: "Email is required" });
    }

    try {
        const pending = await PendingRecruiter.findOne({ email: email.toLowerCase() });
        
        if (!pending) {
            return res.status(404).json({ success: false, error: "Signup session expired. Please start again." });
        }

        const result = await emailService.resendOTP(email, pending.name, 'signup');
        
        if (!result.success) {
            return res.status(400).json({ success: false, error: result.error });
        }

        res.status(200).json({ success: true, message: "New verification code sent" });

    } catch (err) {
        console.error('Resend OTP error:', err.message);
        res.status(500).json({ success: false, error: "Failed to resend code" });
    }
};

// Step 4: Upload document and complete signup
exports.postRecruiterCompleteSignup = async (req, res) => {
    const { email } = req.body;
    const companyDocument = req.file;

    if (!email) {
        return res.status(400).json({ success: false, error: "Email is required" });
    }

    if (!companyDocument) {
        return res.status(400).json({ success: false, error: "Company document is required" });
    }

    try {
        // Find pending recruiter
        const pending = await PendingRecruiter.findOne({ 
            email: email.toLowerCase(),
            otpVerified: true 
        });

        if (!pending) {
            return res.status(404).json({ 
                success: false, 
                error: "Signup session expired or email not verified. Please start again." 
            });
        }

        // Create the actual user
        const documentUrl = `/uploads/${companyDocument.filename}`.replace(/\\/g, '/');
        
        const user = await User.create({
            name: pending.name,
            email: pending.email,
            password: pending.password,
            role: "recruiter",
            verified: true,
            emailVerified: true,
            companyName: pending.companyName,
            companyDocumentUrl: documentUrl
        });

        // Delete pending record
        await PendingRecruiter.deleteOne({ email: email.toLowerCase() });

        // Auto-login the recruiter
        req.session.user = { 
            id: user._id.toString(), 
            name: user.name, 
            email: user.email, 
            role: "recruiter" 
        };
        
        req.session.save(err => {
            if (err) console.error("Error saving session:", err);
            res.status(201).json({ 
                success: true, 
                message: "Account created successfully!",
                redirectPath: "/recruiter-home",
                user: { id: user._id.toString(), name: user.name, email: user.email, role: "recruiter" }
            });
        });

    } catch (err) {
        console.error('Complete signup error:', err.message);
        res.status(500).json({ success: false, error: "Failed to create account. Please try again." });
    }
};

// Legacy recruiter signup (kept for backward compatibility)
exports.postRecruiterSignup = async (req, res) => {
    const { name, email, password, confirmPassword } = req.body;
    const verificationFile = req.file?.path;

    if (password !== confirmPassword) {
        return res.status(400).json({ success: false, error: "Passwords do not match" });
    }

    if (!validatePassword(password)) {
        return res.status(400).json({ 
            success: false, 
            error: "Password validation failed." 
        });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ success: false, error: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            name, email, password: hashedPassword, role: "recruiter", verified: false, verificationFile: verificationFile || null
        });
        
        req.session.user = { id: user._id.toString(), name, email, role: "recruiter", verified: false };
        
        req.session.save(err => {
            if (err) console.error("Error saving session during recruiter signup:", err);
            res.status(201).json({ 
                success: true, 
                message: "Recruiter signup successful. Redirect to dashboard.", 
                redirectPath: "/recruiter-home" 
            });
        });

    } catch (err) {
        console.error('Recruiter signup error:', err.message);
        res.status(500).json({ success: false, error: "Database error" });
    }
};

// =========================================================================
// 7. Forgot Password Flow
// =========================================================================
exports.postForgotPassword = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, error: "Email is required" });
    }

    try {
        const user = await User.findOne({ email: email.toLowerCase() });
        
        // Don't reveal if email exists or not (security)
        if (!user) {
            return res.status(200).json({ 
                success: true, 
                message: "If an account exists with this email, you will receive a password reset link." 
            });
        }

        // Generate reset token
        const resetToken = emailService.generateResetToken();
        
        // Send reset email
        const result = await emailService.sendPasswordResetEmail(email, user.name, resetToken);
        
        if (!result.success) {
            return res.status(500).json({ success: false, error: "Failed to send reset email" });
        }

        res.status(200).json({ 
            success: true, 
            message: "If an account exists with this email, you will receive a password reset link." 
        });

    } catch (err) {
        console.error('Forgot password error:', err.message);
        res.status(500).json({ success: false, error: "Server error" });
    }
};

// Verify reset token
exports.postVerifyResetToken = async (req, res) => {
    const { email, token } = req.body;

    if (!email || !token) {
        return res.status(400).json({ success: false, error: "Invalid reset link" });
    }

    const result = emailService.verifyResetToken(email, token);
    
    if (!result.valid) {
        return res.status(400).json({ success: false, error: result.error });
    }

    res.status(200).json({ success: true, message: "Token is valid" });
};

// Reset password
exports.postResetPassword = async (req, res) => {
    const { email, token, password, confirmPassword } = req.body;

    if (!email || !token || !password) {
        return res.status(400).json({ success: false, error: "All fields are required" });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ success: false, error: "Passwords do not match" });
    }

    if (!validatePassword(password)) {
        return res.status(400).json({ 
            success: false, 
            error: "Password must be at least 8 characters with uppercase, lowercase, number, and special character." 
        });
    }

    try {
        // Verify token
        const tokenResult = emailService.verifyResetToken(email, token);
        
        if (!tokenResult.valid) {
            return res.status(400).json({ success: false, error: tokenResult.error });
        }

        // Update password
        const hashedPassword = await bcrypt.hash(password, 10);
        
        await User.findOneAndUpdate(
            { email: email.toLowerCase() },
            { password: hashedPassword }
        );

        // Clear reset token
        emailService.clearResetToken(email);

        res.status(200).json({ 
            success: true, 
            message: "Password reset successful. Please log in with your new password." 
        });

    } catch (err) {
        console.error('Reset password error:', err.message);
        res.status(500).json({ success: false, error: "Failed to reset password" });
    }
};


// =========================================================================
// 7. Handle Logout (GET /logout) - CONVERTED TO JSON API
// =========================================================================
exports.logout = (req, res) => {
    // Session destroy now returns a JSON success message.
    req.session.destroy(() => res.json({ success: true, message: "Logged out successfully" }));
};

// =========================================================================
// 8. Redirect /ask to /doubt (GET /ask) - REMOVED EJS REDIRECT
// =========================================================================
exports.redirectAsk = (req, res) => {
    res.json({ success: true, message: "Use the new /api/doubt endpoint." });
};

// =========================================================================
//  Request Login OTP (POST /login/request-otp)
// =========================================================================
exports.postLoginRequestOtp = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    // Keep existing password policy behavior to avoid disturbing current rules
    if (!validatePassword(password)) {
        return res.status(400).json({ success: false, error: 'Password validation failed.' });
    }

    try {
        const loginEmail = String(email || '').trim();
        const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Case-insensitive match so user can type Gmail with different casing
        const user = await User.findOne({ email: new RegExp(`^${escapeRegExp(loginEmail)}$`, 'i') });
        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
        }

        // Skip OTP for default test users
        const defaultUserEmails = ['srihesh@gm.co', 'priya@gm.co', 'shiva@gm.co', 'arjun@gm.co'];
        if (defaultUserEmails.includes(user.email.toLowerCase())) {
            req.session.user = { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
            
            req.session.save(err => {
                if (err) {
                    console.error('Error saving session:', err);
                    return res.status(500).json({ success: false, error: 'Server error during login session setup' });
                }
                
                return res.status(200).json({
                    success: true,
                    message: 'Login successful (default user, OTP skipped)',
                    skipOtp: true,
                    user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role },
                    redirectPath: user.role === 'admin' ? '/admin' : (user.role === 'recruiter' ? '/recruiter-home' : '/home')
                });
            });
            return; // Important: prevent further execution
        }

        // Always send OTP to the email stored on the account 
        const recipientEmail = String(user.email || '').trim();

        if (!isEmailConfigured()) {
            return res.status(500).json({
                success: false,
                error: 'Email sender not configured. Fill source/config/emailConfig.js (GMAIL_USER, GMAIL_APP_PASSWORD) and restart the backend.'
            });
        }

        const otp = createLoginOtp({ email: recipientEmail, userId: user._id.toString(), role: user.role });

        try {
            await sendLoginOtpEmail({ to: recipientEmail, otp });
        } catch (mailErr) {
            console.error('OTP email send failed:', mailErr?.message || mailErr);
            if (process.env.NODE_ENV !== 'production') {
                return res.status(500).json({
                    success: false,
                    error: `Failed to send verification code: ${mailErr?.message || 'unknown error'}`
                });
            }
            return res.status(500).json({ success: false, error: 'Failed to send verification code.' });
        }

        return res.status(200).json({ success: true, message: 'Verification code sent to your email.' });
    } catch (err) {
        const status = err.statusCode || 500;
        return res.status(status).json({ success: false, error: err.message || 'Server error' });
    }
};

// =========================================================================
// 3b. Verify Login OTP + Create Session (POST /login/verify-otp)
// =========================================================================
exports.postLoginVerifyOtp = async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ success: false, error: 'Email and verification code are required' });
    }

    const code = String(otp).trim();
    if (!/^\d{4}$/.test(code)) {
        return res.status(400).json({ success: false, error: 'Verification code must be 4 digits.' });
    }

    try {
        // Skip OTP verification for default test users
        const defaultUserEmails = ['srihesh@gm.co', 'priya@gm.co', 'shiva@gm.co', 'arjun@gm.co'];
        const loginEmail = String(email || '').trim().toLowerCase();
        
        let result;
        if (defaultUserEmails.includes(loginEmail)) {
            // For default users, find user directly without OTP check
            const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const user = await User.findOne({ email: new RegExp(`^${escapeRegExp(loginEmail)}$`, 'i') });
            if (user) {
                result = { ok: true, userId: user._id.toString(), role: user.role };
            } else {
                result = { ok: false, reason: 'no_user' };
            }
        } else {
            result = verifyLoginOtp({ email, otp: code });
        }
        if (!result.ok) {
            const msg = result.reason === 'expired'
                ? 'Verification code expired. Please request a new one.'
                : result.reason === 'locked'
                    ? 'Too many attempts. Please request a new code.'
                    : result.reason === 'no_code'
                        ? 'No verification code found. Please request a code.'
                        : `Invalid code.${typeof result.attemptsLeft === 'number' ? ` Attempts left: ${result.attemptsLeft}.` : ''}`;

            return res.status(401).json({ success: false, error: msg });
        }

        const user = await User.findById(result.userId);
        if (!user) {
            return res.status(401).json({ success: false, error: 'User not found' });
        }

        req.session.user = { id: user._id.toString(), name: user.name, email: user.email, role: user.role };

        req.session.save(err => {
            if (err) {
                console.error('Error saving session:', err);
                return res.status(500).json({ success: false, error: 'Server error during login session setup' });
            }

            return res.status(200).json({
                success: true,
                message: 'Login successful',
                user: { id: user._id.toString(), name: user.name, email: user.email, role: user.role },
                redirectPath: user.role === 'admin' ? '/admin' : (user.role === 'recruiter' ? '/recruiter-home' : '/home')
            });
        });
    } catch (err) {
        console.error('Error verifying OTP:', err?.message || err);
        return res.status(500).json({ success: false, error: 'Server error' });
    }
};

// =========================================================================
// 9. Forgot Password - Request OTP (POST /forgot-password/request-otp)
// =========================================================================
exports.postForgotPasswordRequestOtp = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, error: 'Email is required' });
    }

    try {
        const loginEmail = String(email || '').trim();
        const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const user = await User.findOne({ email: new RegExp(`^${escapeRegExp(loginEmail)}$`, 'i') });
        
        if (!user) {
            return res.status(404).json({ success: false, error: 'No account found with this email address' });
        }

        const recipientEmail = String(user.email || '').trim();

        if (!isEmailConfigured()) {
            return res.status(500).json({
                success: false,
                error: 'Email sender not configured. Fill source/config/emailConfig.js (GMAIL_USER, GMAIL_APP_PASSWORD) and restart the backend.'
            });
        }

        const otp = createLoginOtp({ email: recipientEmail, userId: user._id.toString(), role: user.role });

        try {
            await sendLoginOtpEmail({ to: recipientEmail, otp, purpose: 'forgot-password' });
        } catch (mailErr) {
            console.error('OTP email send failed:', mailErr?.message || mailErr);
            if (process.env.NODE_ENV !== 'production') {
                return res.status(500).json({
                    success: false,
                    error: `Failed to send verification code: ${mailErr?.message || 'unknown error'}`
                });
            }
            return res.status(500).json({ success: false, error: 'Failed to send verification code.' });
        }

        return res.status(200).json({ success: true, message: 'Verification code sent to your email.' });
    } catch (err) {
        const status = err.statusCode || 500;
        return res.status(status).json({ success: false, error: err.message || 'Server error' });
    }
};

// =========================================================================
// 10. Forgot Password - Verify OTP + Reset Password (POST /forgot-password/reset)
// =========================================================================
exports.postForgotPasswordReset = async (req, res) => {
    const { email, otp, newPassword } = req.body;

    if (!email || !otp || !newPassword) {
        return res.status(400).json({ success: false, error: 'Email, verification code, and new password are required' });
    }

    const code = String(otp).trim();
    if (!/^\d{4}$/.test(code)) {
        return res.status(400).json({ success: false, error: 'Verification code must be 4 digits.' });
    }

    if (!validatePassword(newPassword)) {
        return res.status(400).json({ success: false, error: 'Password must be at least 6 characters with 1 uppercase letter and 1 special character.' });
    }

    try {
        const result = verifyLoginOtp({ email, otp: code });
        if (!result.ok) {
            const msg = result.reason === 'expired'
                ? 'Verification code expired. Please request a new one.'
                : result.reason === 'locked'
                    ? 'Too many attempts. Please request a new code.'
                    : result.reason === 'no_code'
                        ? 'No verification code found. Please request a code.'
                        : `Invalid code.${typeof result.attemptsLeft === 'number' ? ` Attempts left: ${result.attemptsLeft}.` : ''}`;

            return res.status(401).json({ success: false, error: msg });
        }

        const user = await User.findById(result.userId);
        if (!user) {
            return res.status(401).json({ success: false, error: 'User not found' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        return res.status(200).json({
            success: true,
            message: 'Password reset successful. Please log in with your new password.'
        });
    } catch (err) {
        console.error('Error resetting password:', err?.message || err);
        return res.status(500).json({ success: false, error: 'Server error' });
    }
};