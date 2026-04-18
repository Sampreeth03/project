// config/jwt.js  – centralised JWT helpers (stateless, httpOnly cookie)

const jwt = require('jsonwebtoken');

// Secret and TTL – override via environment variables in production
const JWT_SECRET   = process.env.JWT_SECRET   || 'relab-jwt-secret-change-in-production-2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const isProduction = process.env.NODE_ENV === 'production';

const cookieSecureFromEnv = String(process.env.COOKIE_SECURE || '').trim().toLowerCase();
const cookieSecure = cookieSecureFromEnv
    ? cookieSecureFromEnv === 'true' || cookieSecureFromEnv === '1'
    : isProduction;

const sameSiteFromEnv = String(process.env.COOKIE_SAME_SITE || '').trim().toLowerCase();
const normalizedSameSite = ['lax', 'strict', 'none'].includes(sameSiteFromEnv)
    ? sameSiteFromEnv
    : (isProduction ? 'none' : 'lax');

const cookieDomain = String(process.env.COOKIE_DOMAIN || '').trim();
const effectiveCookieSecure = normalizedSameSite === 'none' ? true : cookieSecure;

// Cookie names
const COOKIE_NAME               = 'token';
const PLATFORM_ADMIN_COOKIE_NAME = 'platform_admin_token';

// Default httpOnly cookie options (secure:true when deployed with HTTPS)
const COOKIE_OPTIONS = {
    httpOnly : true,
    secure   : effectiveCookieSecure,
    sameSite : normalizedSameSite,
    maxAge   : 7 * 24 * 60 * 60 * 1000, // 7 days in ms
    ...(cookieDomain ? { domain: cookieDomain } : {}),
};

/**
 * Sign a JWT payload.
 * @param {object} payload  – { id, name, email, role }
 * @returns {string}
 */
const signToken = (payload) =>
    jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

/**
 * Verify and decode a JWT.  Returns null instead of throwing on invalid token.
 * @param {string} token
 * @returns {object|null}
 */
const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
};

module.exports = {
    signToken,
    verifyToken,
    COOKIE_NAME,
    PLATFORM_ADMIN_COOKIE_NAME,
    COOKIE_OPTIONS,
};
