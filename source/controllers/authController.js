// controllers/authController.js (UPDATED FOR API - Focus on 3, 5, 6, 7)

const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { User, UserMetrics } = require("../database"); 
const { validatePassword } = require("../services/helperService");
const { upload } = require("../middleware/uploadMiddleware"); 
const { createLoginOtp, verifyLoginOtp } = require('../services/otpService');
const { sendLoginOtpEmail, isEmailConfigured } = require('../services/emailService');

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
exports.postLogin = async (req, res) => {
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
                return res.status(500).json({ success: false, error: "Server error during login session setup" });
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
        res.status(500).json({ success: false, error: "Server error" });
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
exports.postSignup = async (req, res) => {
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
        res.status(500).json({ success: false, error: 'Signup failed' });
    }
};

// =========================================================================
// 6. Recruiter Signup Pages (GET /signupforrec, POST /recruiter-signup) - CONVERTED TO JSON API
// =========================================================================
exports.getRecruiterSignup = (req, res) => {
    res.json({ status: 'API operational' });
};

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