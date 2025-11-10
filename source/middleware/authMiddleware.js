// middleware/authMiddleware.js

// 1. Checks if ANY user is logged in
exports.isAuthenticated = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect("/login?error=Please log in to access this page");
    }
    next();
};

// 2. Checks if the user is a Recruiter
exports.isRecruiter = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== "recruiter") {
        // If not logged in OR role is wrong, redirect to login.
        return res.redirect("/login?error=Unauthorized access to recruiter page");
    }
    next();
};

// 3. Checks if the user is an Admin
exports.isAdmin = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== "admin") {
        // Handle API requests with 403, and HTML requests with redirect
        if (req.accepts('html')) return res.redirect("/login?error=Admin access required");
        return res.status(403).json({ error: "Unauthorized: Admin privileges required" });
    }
    next();
};