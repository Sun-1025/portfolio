'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const store = require('./store');

const COOKIE_NAME = 'pf_token';
const SECRET_FILE = path.join(store.DATA_DIR, '.jwt-secret');

function getSecret() {
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 16) {
    return process.env.JWT_SECRET;
  }
  store.ensureDirs();
  if (fs.existsSync(SECRET_FILE)) {
    return fs.readFileSync(SECRET_FILE, 'utf8').trim();
  }
  const secret = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(SECRET_FILE, secret, { mode: 0o600 });
  return secret;
}

const SECRET = getSecret();
const HOURS = Math.max(1, Number(process.env.SESSION_HOURS || 4));

function signSession(username) {
  return jwt.sign({ u: username }, SECRET, {
    expiresIn: `${HOURS}h`,
    issuer: 'portfolio-v2',
  });
}

function verifySession(token) {
  try {
    return jwt.verify(token, SECRET, { issuer: 'portfolio-v2' });
  } catch (err) {
    return null;
  }
}

function sessionExpiryMs(token) {
  try {
    const payload = jwt.decode(token);
    return payload && payload.exp ? payload.exp * 1000 : null;
  } catch (err) {
    return null;
  }
}

function readToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return req.cookies ? req.cookies[COOKIE_NAME] : null;
}

function requireAuth(req, res, next) {
  const token = readToken(req);
  const session = token ? verifySession(token) : null;
  if (!session) {
    return res.status(401).json({ ok: false, error: '未登录或登录已过期' });
  }
  req.admin = { username: session.u };
  return next();
}

function setSessionCookie(req, res, token) {
  const secure = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: HOURS * 3600 * 1000,
    path: '/',
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, { path: '/' });
}

// --- login rate limit: 5 tries / 15 min per IP ---
const attempts = new Map();
const WINDOW = 15 * 60 * 1000;
const MAX_TRIES = 5;

function tooManyAttempts(ip) {
  const entry = attempts.get(ip);
  if (!entry) return false;
  if (Date.now() - entry.first > WINDOW) {
    attempts.delete(ip);
    return false;
  }
  return entry.count >= MAX_TRIES;
}

function recordFailure(ip) {
  const entry = attempts.get(ip);
  if (!entry || Date.now() - entry.first > WINDOW) {
    attempts.set(ip, { count: 1, first: Date.now() });
  } else {
    entry.count += 1;
  }
}

function clearAttempts(ip) {
  attempts.delete(ip);
}

module.exports = {
  COOKIE_NAME,
  HOURS,
  signSession,
  verifySession,
  sessionExpiryMs,
  requireAuth,
  readToken,
  setSessionCookie,
  clearSessionCookie,
  tooManyAttempts,
  recordFailure,
  clearAttempts,
};
