// middleware/authMiddleware.js (UPDATED FOR API)

// 1. Checks if ANY user is logged in (API version)
exports.isAuthenticatedAPI = (req, res, next) => {
    // If not logged in, return 401 Unauthorized
    if (!req.session.user) {
        return res.status(401).json({ 
            success: false, 
            error: "Unauthorized: Please log in to access this resource." 
        });
    }
    next();
};

// 2. Checks if the user is a Recruiter (API version)
exports.isRecruiterAPI = (req, res, next) => {
    // Check for login AND role
    if (!req.session.user || req.session.user.role !== "recruiter") {
        return res.status(403).json({ 
            success: false, 
            error: "Forbidden: Recruiter access required." 
        });
    }
    next();
};

// 3. Checks if the user is an Admin (API version)
exports.isAdminAPI = (req, res, next) => {
    // Check for login AND role
    if (!req.session.user || req.session.user.role !== "admin") {
        return res.status(403).json({ 
            success: false, 
            error: "Forbidden: Admin privileges required." 
        });
    }
    next();
};

// --- Original Middleware (Kept for compatibility, though API versions are used) ---
exports.isAuthenticated = (req, res, next) => {
    if (!req.session.user) {
        return res.redirect("/login?error=Please log in to access this page");
    }
    next();
};

exports.isRecruiter = (req, res, next) => {
    if (!req.session.user || req.session.user.role !== "recruiter") {
        return res.redirect("/login?error=Unauthorized access to recruiter page");
    }
    next();
};
exports.isAdmin = exports.isAdminAPI; // Use API version for consistency