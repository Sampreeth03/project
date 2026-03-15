// middleware/authMiddleware.js  – JWT-based (stateless, httpOnly cookie)

const { verifyToken, COOKIE_NAME } = require('../config/jwt');

// ─────────────────────────────────────────────────────────────
// Helper: extract and verify JWT from cookie, populate req.user
// Returns the decoded payload or null.
// ─────────────────────────────────────────────────────────────
function getUserFromRequest(req) {
    const authHeader = req.get('authorization') || req.get('Authorization');
    if (authHeader) {
        const [scheme, token] = authHeader.split(' ');
        if (scheme && token && scheme.toLowerCase() === 'bearer') {
            const headerPayload = verifyToken(token);
            if (headerPayload) return headerPayload;
        }
    }

    const cookieToken = req.cookies?.[COOKIE_NAME];
    if (!cookieToken) return null;
    return verifyToken(cookieToken); // null on expired / invalid
}

// 1. Optional auth – sets req.user if valid token present, never blocks
exports.optionalAuth = (req, res, next) => {
    const payload = getUserFromRequest(req);
    if (payload) req.user = payload;
    next();
};

// 2. Require any authenticated user
exports.isAuthenticatedAPI = (req, res, next) => {
    const payload = getUserFromRequest(req);
    if (!payload) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Please log in.' });
    }
    req.user = payload;
    next();
};

// 3. Require recruiter role
exports.isRecruiterAPI = (req, res, next) => {
    const payload = getUserFromRequest(req);
    if (!payload || payload.role !== 'recruiter') {
        return res.status(403).json({ success: false, error: 'Forbidden: Recruiter access required.' });
    }
    req.user = payload;
    next();
};

// 4. Require admin role
exports.isAdminAPI = (req, res, next) => {
    const payload = getUserFromRequest(req);
    if (!payload || payload.role !== 'admin') {
        return res.status(403).json({ success: false, error: 'Forbidden: Admin privileges required.' });
    }
    req.user = payload;
    next();
};

// Aliases kept for compatibility with existing route files
exports.isAuthenticated     = exports.isAuthenticatedAPI;
exports.isRecruiter         = exports.isRecruiterAPI;
exports.isAdmin             = exports.isAdminAPI;
exports.isAdminHybrid       = exports.isAdminAPI;
exports.isAuthenticatedHybrid = exports.isAuthenticatedAPI;