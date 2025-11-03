// controllers/authController.js (UPDATED FOR API - Focus on 3, 5, 6, 7)

const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const { User, UserMetrics } = require("../database"); 
const { validatePassword } = require("../services/helperService");
const { upload } = require("../middleware/uploadMiddleware"); 

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