// controllers/authController.js

const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { signToken, COOKIE_NAME, PLATFORM_ADMIN_COOKIE_NAME, COOKIE_OPTIONS } = require('../config/jwt');
const { User, UserMetrics, PendingRecruiter, PendingStudent } = require("../database"); 
const { validatePassword } = require("../services/helperService");
const { upload } = require("../middleware/uploadMiddleware"); 
const { createLoginOtp, verifyLoginOtp } = require('../services/otpService');
const { sendLoginOtpEmail, isEmailConfigured } = require('../services/emailService');
const { generateTotpSecret, verifyTotpToken, buildOtpAuthUrl, buildQrCodeUrl } = require('../services/totpService');
const { syncUserUpsert } = require('../services/solrSyncService');

function sendLoginSuccess(res, user) {
    const userData = { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
    const token = signToken(userData);
    res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
    return res.status(200).json({
        success: true,
        message: 'Login successful',
        user: userData,
        redirectPath: user.role === 'admin' ? '/admin' : (user.role === 'recruiter' ? '/recruiter-home' : '/home')
    });
}

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
    
        // Keep backward compatibility for clients still posting to /login,
        // but route them through the 2-step challenge flow.
        return exports.postLoginRequestOtp(req, res, next);
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
        const normalizedEmail = String(email || '').trim().toLowerCase();
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({ success: false, error: 'Email already in use' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        // Build user object with profile fields
        const userData = { 
            name, 
            email: normalizedEmail,
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
        await syncUserUpsert(user);
        
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

// Step 2: Verify OTP and complete signup, then return authenticator setup details
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

        const totpSecret = generateTotpSecret();
        const otpauthUrl = buildOtpAuthUrl({ secret: totpSecret, email: pending.email, issuer: 'RelabTeams' });

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
            onboardingCompleted: false, // New user - show onboarding
            authenticator2faEnabled: true,
            authenticator2faSecret: totpSecret,
            authenticator2faRequired: true
        };

        const user = await User.create(userData);
        await UserMetrics.create({ user_id: user._id });
        await syncUserUpsert(user);

        // Delete pending record
        await PendingStudent.deleteOne({ email: email.toLowerCase() });

        res.status(201).json({ 
            success: true, 
            message: 'Signup successful. Scan this QR code in Google Authenticator before login.',
            twoFactorSetup: {
                qrCodeUrl: buildQrCodeUrl(otpauthUrl),
                secret: totpSecret,
                issuer: 'RelabTeams',
                account: user.email
            }
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

        // Generate and send OTP using the shared otpService
        const otp = createLoginOtp({
            email: email.toLowerCase(),
            userId: 'pending-recruiter-signup',
            role: 'recruiter'
        });

        if (!isEmailConfigured()) {
            return res.status(500).json({ success: false, error: 'Email sender not configured. Please contact support.' });
        }

        await sendLoginOtpEmail({ to: email, otp, purpose: 'signup' });

        res.status(200).json({ 
            success: true, 
            message: "Verification code sent to your email",
            email: email.toLowerCase()
        });

    } catch (err) {
        console.error('Recruiter signup init error:', err.message);
        if (err.statusCode === 429) {
            return res.status(429).json({ success: false, error: err.message });
        }
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
        // Verify OTP using shared otpService
        const otpResult = verifyLoginOtp({ email: email.toLowerCase(), otp: String(otp).trim() });

        if (!otpResult.ok) {
            let errorMsg = 'Invalid verification code.';
            if (otpResult.reason === 'expired') errorMsg = 'Verification code has expired. Please request a new one.';
            if (otpResult.reason === 'locked') errorMsg = 'Too many attempts. Please request a new code.';
            if (otpResult.reason === 'no_code') errorMsg = 'No verification code found. Please start signup again.';
            if (otpResult.attemptsLeft !== undefined) errorMsg = `Invalid code. ${otpResult.attemptsLeft} attempts remaining.`;
            return res.status(400).json({ success: false, error: errorMsg });
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

        // Generate new OTP using shared otpService
        const otp = createLoginOtp({
            email: email.toLowerCase(),
            userId: 'pending-recruiter-signup',
            role: 'recruiter'
        });

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
        
        // Create the actual user (recruiter starts as not recruiterVerified until platform admin approves)
        const user = await User.create({
            name: pending.name,
            email: pending.email,
            password: pending.password,
            role: "recruiter",
            verified: true,
            emailVerified: true,
            companyName: pending.companyName,
            companyDocumentUrl: documentUrl,
            recruiterVerified: false,
            recruiterVerificationMessage: 'Your document is being verified by the platform team. You will be able to create jobs once verification is complete.'
        });

        // Assign this recruiter to a platform administrator in round-robin fashion (if any exist)
        try {
            const { PlatformAdministrator } = require('../database');
            const admins = await PlatformAdministrator.find({}).select('_id').sort({ createdAt: 1 }).lean();
            if (admins && admins.length > 0) {
                const recruiterCount = await User.countDocuments({ role: 'recruiter' });
                const index = (recruiterCount - 1) % admins.length; // -1 because we just created this recruiter
                const assignedAdmin = admins[index];
                user.assignedPlatformAdminId = assignedAdmin._id;
                await user.save();
            }
        } catch (assignErr) {
            console.error('Error assigning platform admin to recruiter:', assignErr.message);
        }

        await syncUserUpsert(user);

        // Delete pending record
        await PendingRecruiter.deleteOne({ email: email.toLowerCase() });

        // Auto-login the recruiter: issue JWT cookie
        const userData = { id: user._id.toString(), name: user.name, email: user.email, role: "recruiter" };
        const token = signToken(userData);
        res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
        res.status(201).json({ 
            success: true, 
            message: "Account created successfully!",
            redirectPath: "/recruiter-home",
            user: userData
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
    const normalizedEmail = String(email || '').trim().toLowerCase();

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
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(409).json({ success: false, error: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            name,
            email: normalizedEmail,
            password: hashedPassword,
            role: "recruiter",
            verified: false,
            verificationFile: verificationFile || null,
            recruiterVerified: false,
            recruiterVerificationMessage: 'Your document is being verified by the platform team. You will be able to create jobs once verification is complete.'
        });

        // Assign this legacy-signup recruiter to a platform administrator (round-robin) if any exist
        try {
            const { PlatformAdministrator } = require('../database');
            const admins = await PlatformAdministrator.find({}).select('_id').sort({ createdAt: 1 }).lean();
            if (admins && admins.length > 0) {
                const recruiterCount = await User.countDocuments({ role: 'recruiter' });
                const index = (recruiterCount - 1) % admins.length;
                const assignedAdmin = admins[index];
                user.assignedPlatformAdminId = assignedAdmin._id;
                await user.save();
            }
        } catch (assignErr) {
            console.error('Error assigning platform admin to legacy recruiter:', assignErr.message);
        }

        await syncUserUpsert(user);
        
        const token = signToken({ id: user._id.toString(), name, email, role: "recruiter" });
        res.cookie(COOKIE_NAME, token, COOKIE_OPTIONS);
        res.status(201).json({ 
            success: true, 
            message: "Recruiter signup successful. Redirect to dashboard.", 
            redirectPath: "/recruiter-home" 
        });

    } catch (err) {
        console.error('Recruiter signup error:', err.message);
        res.status(500).json({ success: false, error: "Database error" });
    }
};

// =========================================================================
// 7. Handle Logout (GET /logout) - CONVERTED TO JSON API
// =========================================================================
exports.logout = (req, res) => {
    // Session destroy now returns a JSON success message.
    res.clearCookie(COOKIE_NAME);
    res.clearCookie(PLATFORM_ADMIN_COOKIE_NAME);
    res.json({ success: true, message: "Logged out successfully" });
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
        const loginEmail = String(email || '').trim().toLowerCase();
        const user = await User.findOne({ email: loginEmail });
        if (!user) {
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, error: 'Invalid email or password' });
        }

        const requireAuthenticator = user.role === 'user'
            && user.authenticator2faRequired === true
            && user.authenticator2faEnabled === true
            && !!user.authenticator2faSecret;

            if (requireAuthenticator) {
                return res.status(200).json({
                    success: true,
                    requiresAuthenticator: true,
                    verificationType: 'authenticator',
                    message: 'Enter the 6-digit code from your authenticator app.'
                });
        }

            if (!isEmailConfigured()) {
                return res.status(500).json({
                    success: false,
                    error: 'Email sender not configured. Fill project .env (EMAIL_USER and EMAIL_PASSWORD, or GMAIL_USER and GMAIL_APP_PASSWORD) and restart the backend.'
                });
            }

            const otp = createLoginOtp({ email: loginEmail, userId: user._id.toString(), role: user.role });

            try {
                await sendLoginOtpEmail({ to: user.email, otp, purpose: 'login' });
            } catch (mailErr) {
                console.error('Login OTP email send failed:', mailErr?.message || mailErr);
                if (process.env.NODE_ENV !== 'production') {
                    return res.status(500).json({
                        success: false,
                        error: `Failed to send verification code: ${mailErr?.message || 'unknown error'}`
                    });
                }
                return res.status(500).json({ success: false, error: 'Failed to send verification code.' });
            }

        return res.status(200).json({
            success: true,
                requiresOtp: true,
                verificationType: 'email',
                message: 'Verification code sent to your email.'
        });
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

    try {
        const loginEmail = String(email || '').trim().toLowerCase();
        const user = await User.findOne({ email: loginEmail });
        if (!user) {
            return res.status(401).json({ success: false, error: 'User not found' });
        }

        const requireAuthenticator = user.role === 'user'
            && user.authenticator2faRequired === true
            && user.authenticator2faEnabled === true
            && !!user.authenticator2faSecret;

        if (requireAuthenticator) {
            if (!/^\d{6}$/.test(code)) {
                return res.status(400).json({ success: false, error: 'Authentication code must be 6 digits.' });
            }

            const valid = verifyTotpToken({ secret: user.authenticator2faSecret, token: code });
            if (!valid) {
                return res.status(401).json({ success: false, error: 'Invalid authenticator code. Please try again.' });
            }

            return sendLoginSuccess(res, user);
        }

        if (!/^\d{4}$/.test(code)) {
            return res.status(400).json({ success: false, error: 'Verification code must be 4 digits.' });
        }

        const otpResult = verifyLoginOtp({ email: loginEmail, otp: code });
        if (!otpResult.ok) {
            let errorMsg = 'Invalid verification code.';
            if (otpResult.reason === 'expired') errorMsg = 'Verification code has expired. Please request a new one.';
            if (otpResult.reason === 'locked') errorMsg = 'Too many attempts. Please request a new code.';
            if (otpResult.reason === 'no_code') errorMsg = 'No verification code found. Please request a code first.';
            if (otpResult.attemptsLeft !== undefined) errorMsg = `Invalid code. ${otpResult.attemptsLeft} attempts remaining.`;
            return res.status(401).json({ success: false, error: errorMsg });
        }

        if (String(otpResult.userId) !== user._id.toString()) {
            return res.status(401).json({ success: false, error: 'Verification session mismatch. Please request a new code.' });
        }

        return sendLoginSuccess(res, user);
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
        const loginEmail = String(email || '').trim().toLowerCase();
        const user = await User.findOne({ email: loginEmail });
        
        if (!user) {
            return res.status(404).json({ success: false, error: 'No account found with this email address' });
        }

        const recipientEmail = String(user.email || '').trim();

        if (!isEmailConfigured()) {
            return res.status(500).json({
                success: false,
                error: 'Email sender not configured. Fill project .env (EMAIL_USER and EMAIL_PASSWORD, or GMAIL_USER and GMAIL_APP_PASSWORD) and restart the backend.'
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

// Step 4: Verify authenticator setup with one TOTP code
exports.postStudentVerifyAuthenticatorSetup = async (req, res) => {
    const { email, code } = req.body;

    if (!email || !code) {
        return res.status(400).json({ success: false, error: 'Email and authentication code are required' });
    }

    const loginEmail = String(email || '').trim();
    const authCode = String(code || '').trim();

    if (!/^\d{6}$/.test(authCode)) {
        return res.status(400).json({ success: false, error: 'Authentication code must be 6 digits.' });
    }

    try {
        const user = await User.findOne({ email: loginEmail.toLowerCase(), role: 'user' });
        if (!user) {
            return res.status(404).json({ success: false, error: 'User not found.' });
        }

        if (!user.authenticator2faEnabled || !user.authenticator2faSecret) {
            return res.status(400).json({ success: false, error: 'Authenticator setup is not available for this account.' });
        }

        const valid = verifyTotpToken({ secret: user.authenticator2faSecret, token: authCode });
        if (!valid) {
            return res.status(401).json({ success: false, error: 'Invalid authenticator code. Please try again.' });
        }

        return res.status(200).json({ success: true, message: 'Authenticator setup verified. You can now log in.' });
    } catch (err) {
        console.error('Error verifying authenticator setup:', err?.message || err);
        return res.status(500).json({ success: false, error: 'Server error' });
    }
};