// controllers/authController.js

const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
// NOTE: Assuming models path. Please confirm or update path to your models!
const { User, UserMetrics } = require("../database"); 
const { validatePassword } = require("../services/helperService");
const { upload } = require("../middleware/uploadMiddleware"); 

// =========================================================================
// 1. Landing Page (GET /)
// =========================================================================
exports.getLanding = (req, res) => {
    res.render("landing", { error: null });
};

// =========================================================================
// 2. Render Login Page (GET /login)
// =========================================================================
exports.getLogin = (req, res) => {
    res.render("login", { error: null });
};

// =========================================================================
// 3. Handle Login Submission (POST /login)
// =========================================================================
exports.postLogin = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.render("login", { error: "Email and password are required" });
    }

    if (!validatePassword(password)) {
        return res.render("login", { 
            error: "Password must be at least 6 characters long, contain one uppercase letter, and one special character (e.g., !@#$%^&*)" 
        });
    }

    try {
        const user = await User.findOne({ email });
        if (!user) {
            return res.render("login", { error: "Invalid email or password" });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.render("login", { error: "Invalid email or password" });
        }

        // Authentication successful: create session payload
        req.session.user = { id: user._id.toString(), name: user.name, email: user.email, role: user.role };
        console.log('Logged in user:', req.session.user);
        
        // >>> FIX: Explicitly save the session before redirecting to prevent race conditions
        req.session.save(err => {
            if (err) {
                console.error("Error saving session:", err);
                return res.render("login", { error: "Server error during login session setup" });
            }
            
            // Redirect based on role
            if (user.role === "admin") return res.redirect("/admin");
            if (user.role === "recruiter") return res.redirect("/recruiter-home");
            
            res.redirect("/home");
        });
        // <<< END FIX

    } catch (err) {
        console.error('Error in login:', err.message);
        res.render("login", { error: "Server error" });
    }
};

// =========================================================================
// 4. Render Student/User Signup Page (GET /signup)
// =========================================================================
exports.getSignup = (req, res) => {
    res.render("signup", { error: null });
};

// =========================================================================
// 5. Handle Student/User Signup Submission (POST /signup)
// =========================================================================
exports.postSignup = async (req, res) => {
    const { name, email, password } = req.body;
    
    if (!name || !email || !password) {
        return res.json({ success: false, error: 'Name, email, and password are required' });
    }

    if (!validatePassword(password)) {
        return res.json({ 
            success: false, 
            error: 'Password must be at least 6 characters long, contain one uppercase letter, and one special character (e.g., !@#$%^&*)' 
        });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.json({ success: false, error: 'Email already in use' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, password: hashedPassword, role: 'user', verified: false });
        await UserMetrics.create({ user_id: user._id });
        
        req.session.user = { id: user._id.toString(), name: user.name, email: user.email, role: user.role, verified: false };

        // Explicitly save for signup flow as well
        req.session.save(err => {
            if (err) console.error("Error saving session during signup:", err);
            res.redirect('/home');
        });

    } catch (err) {
        console.error('Signup error:', err.message);
        res.json({ success: false, error: 'Signup failed' });
    }
};

// =========================================================================
// 6. Recruiter Signup Pages (GET /signupforrec, POST /recruiter-signup)
// =========================================================================
exports.getRecruiterSignup = (req, res) => {
    res.render("signupforrec", { error: null });
};

exports.postRecruiterSignup = async (req, res) => {
    const { name, email, password, confirmPassword } = req.body;
    const verificationFile = req.file?.path;

    if (password !== confirmPassword) {
        return res.render("signupforrec", { error: "Passwords do not match" });
    }

    if (!validatePassword(password)) {
        return res.render("signupforrec", { 
            error: "Password must be at least 6 characters long, contain one uppercase letter, and one special character (e.g., !@#$%^&*)" 
        });
    }

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.render("signupforrec", { error: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({
            name, email, password: hashedPassword, role: "recruiter", verified: false, verificationFile: verificationFile || null
        });
        
        req.session.user = { id: user._id.toString(), name, email, role: "recruiter", verified: false };
        
        // Explicitly save for recruiter signup
        req.session.save(err => {
            if (err) console.error("Error saving session during recruiter signup:", err);
            res.redirect("/recruiter-home");
        });

    } catch (err) {
        console.error('Recruiter signup error:', err.message);
        res.status(500).send("Database error");
    }
};


// =========================================================================
// 7. Handle Logout (GET /logout)
// =========================================================================
exports.logout = (req, res) => {
    req.session.destroy(() => res.redirect("/login"));
};

// =========================================================================
// 8. Redirect /ask to /doubt (GET /ask)
// =========================================================================
exports.redirectAsk = (req, res) => {
    res.redirect("/doubt");
};