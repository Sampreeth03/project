const crypto = require('crypto');

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function normalizeBase32(input) {
  return String(input || '')
    .toUpperCase()
    .replace(/=+$/g, '')
    .replace(/[^A-Z2-7]/g, '');
}

function base32Encode(buffer) {
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of buffer) {
    value = (value << 8) | byte;
    bits += 8;

    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }

  return output;
}

function base32Decode(base32) {
  const clean = normalizeBase32(base32);
  let bits = 0;
  let value = 0;
  const bytes = [];

  for (const ch of clean) {
    const idx = BASE32_ALPHABET.indexOf(ch);
    if (idx === -1) continue;

    value = (value << 5) | idx;
    bits += 5;

    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return Buffer.from(bytes);
}

function generateTotpSecret(bytes = 20) {
  return base32Encode(crypto.randomBytes(bytes));
}

function generateTotpToken(secret, timeStep = 30, digits = 6, epochMs = Date.now()) {
  const key = base32Decode(secret);
  const counter = Math.floor(epochMs / 1000 / timeStep);
  const counterBuffer = Buffer.alloc(8);

  counterBuffer.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  counterBuffer.writeUInt32BE(counter & 0xffffffff, 4);

  const digest = crypto.createHmac('sha1', key).update(counterBuffer).digest();
  const offset = digest[digest.length - 1] & 0x0f;
  const binary =
    ((digest[offset] & 0x7f) << 24) |
    ((digest[offset + 1] & 0xff) << 16) |
    ((digest[offset + 2] & 0xff) << 8) |
    (digest[offset + 3] & 0xff);

  const token = binary % 10 ** digits;
  return String(token).padStart(digits, '0');
}

function verifyTotpToken({ secret, token, window = 1, timeStep = 30, digits = 6 }) {
  const normalized = String(token || '').trim();
  if (!/^\d{6}$/.test(normalized)) return false;

  const now = Date.now();
  for (let offset = -window; offset <= window; offset += 1) {
    const at = now + offset * timeStep * 1000;
    if (generateTotpToken(secret, timeStep, digits, at) === normalized) {
      return true;
    }
  }

  return false;
}

function buildOtpAuthUrl({ secret, email, issuer = 'RelabTeams' }) {
  const encodedIssuer = encodeURIComponent(issuer);
  const accountName = encodeURIComponent(String(email || '').trim().toLowerCase());
  return `otpauth://totp/${encodedIssuer}:${accountName}?secret=${secret}&issuer=${encodedIssuer}&algorithm=SHA1&digits=6&period=30`;
}

function buildQrCodeUrl(otpauthUrl) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(otpauthUrl)}`;
}

module.exports = {
  generateTotpSecret,
  verifyTotpToken,
  buildOtpAuthUrl,
  buildQrCodeUrl,
};
