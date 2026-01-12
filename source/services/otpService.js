// source/services/otpService.js

const crypto = require('crypto');

const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_ATTEMPTS = 5;

/**
 * In-memory OTP store.
 * Key: email (lowercased)
 * Value: { otpHash, expiresAt, attemptsLeft, userId, role, lastSentAt }
 *
 * Note: Server restart clears this store.
 */
const otpStore = new Map();

function sha256(input) {
  return crypto.createHash('sha256').update(String(input)).digest('hex');
}

function generate4DigitOtp() {
  // 0000-9999 inclusive; preserve leading zeros
  const n = crypto.randomInt(0, 10000);
  return String(n).padStart(4, '0');
}

function canResend(email) {
  const key = String(email || '').toLowerCase();
  const existing = otpStore.get(key);
  if (!existing) return { ok: true };
  const now = Date.now();
  if (existing.lastSentAt && now - existing.lastSentAt < RESEND_COOLDOWN_MS) {
    return { ok: false, retryAfterMs: RESEND_COOLDOWN_MS - (now - existing.lastSentAt) };
  }
  return { ok: true };
}

function createLoginOtp({ email, userId, role }) {
  const key = String(email || '').toLowerCase();
  const resend = canResend(key);
  if (!resend.ok) {
    const seconds = Math.ceil(resend.retryAfterMs / 1000);
    const err = new Error(`Please wait ${seconds}s before requesting another code.`);
    err.statusCode = 429;
    throw err;
  }

  const otp = generate4DigitOtp();
  const now = Date.now();

  otpStore.set(key, {
    otpHash: sha256(otp),
    expiresAt: now + OTP_TTL_MS,
    attemptsLeft: MAX_ATTEMPTS,
    userId: String(userId),
    role,
    lastSentAt: now,
  });

  return otp;
}

function verifyLoginOtp({ email, otp }) {
  const key = String(email || '').toLowerCase();
  const entry = otpStore.get(key);

  if (!entry) {
    return { ok: false, reason: 'no_code' };
  }

  const now = Date.now();
  if (now > entry.expiresAt) {
    otpStore.delete(key);
    return { ok: false, reason: 'expired' };
  }

  if (entry.attemptsLeft <= 0) {
    otpStore.delete(key);
    return { ok: false, reason: 'locked' };
  }

  const matches = sha256(otp) === entry.otpHash;
  if (!matches) {
    entry.attemptsLeft -= 1;
    otpStore.set(key, entry);
    return { ok: false, reason: 'invalid', attemptsLeft: entry.attemptsLeft };
  }

  otpStore.delete(key);
  return { ok: true, userId: entry.userId, role: entry.role };
}

module.exports = {
  createLoginOtp,
  verifyLoginOtp,
};
