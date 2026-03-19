const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database/db');
const { createMailTransport, getMailConfig } = require('../services/mailer');
const { isProtectedEmail, normalizeEmail } = require('../protectedUsers');
const createAuthAdminRouter = require('./auth.admin');
const createAuthProfileRouter = require('./auth.profile');
const createAuthCoreRouter = require('./auth.core');

const router = express.Router();

// ─── Multer – Profile picture storage ────────────────────────────────────────
const uploadsDir = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'uploads')
  : path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename:    (_req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ok = allowed.test(path.extname(file.originalname).toLowerCase())
            && allowed.test(file.mimetype);
    ok ? cb(null, true) : cb(new Error('Only image files are allowed'));
  }
});

// ─── Konfigurationen und Konstanten ─────────────────────────────────────────
const THA_REGEX = /^[^\s@]+@tha\.de$/i;
const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;
const BIRTH_DATE_REGEX = /^(\d{2})\/(\d{2})\/(\d{4})$/;
const BELIEF_VALUES = new Set([
  'Atheismus',
  'Christentum',
  'Islam',
  'Judentum',
  'Hinduismus',
  'Buddhismus',
  'Daoismus',
  'Shintoismus'
]);
const CONFESSIONS_BY_BELIEF = Object.freeze({
  Atheismus: ['Agnostizismus', 'Säkularer Humanismus', 'Freidenkertum', 'Keine Konfession'],
  Christentum: ['Katholizismus', 'Evangelisch', 'Orthodoxie', 'Freikirchlich', 'Keine Konfession'],
  Islam: ['Sunnitentum', 'Schiitentum', 'Alevitentum', 'Ahmadiyya', 'Keine Konfession'],
  Judentum: ['Orthodox', 'Konservativ', 'Reformiert', 'Liberal', 'Keine Konfession'],
  Hinduismus: ['Vaishnavismus', 'Shaivismus', 'Shaktismus', 'Smartismus', 'Keine Konfession'],
  Buddhismus: ['Theravada', 'Mahayana', 'Vajrayana', 'Zen', 'Keine Konfession'],
  Daoismus: ['Zhengyi', 'Quanzhen', 'Keine Konfession'],
  Shintoismus: ['Schrein-Shinto', 'Sektenshinto', 'Volks-Shinto', 'Keine Konfession']
});
const DISALLOWED_USERNAME_TERMS = Object.freeze([
  'hitler', 'h1tler', 'adolfhitler', 'heilhitler', 'siegheil', 'nazis', 'nazi', 'faschist', 'faschismus',
  'whitepower', 'whitesupremacy', 'aryan', 'kukluxklan', 'kkk', '14words', '1488', '88', 'nigga', 'nigger',
  'nword', 'nazi88', 'heil88', 'h1tlerdidnothingwrong', 'hitlerdidnothingwrong',
  'muscular anime girl sprinting on a track with sunset city backdrop', 'muscular anime girl', 'muscularanimegirl'
]);
const DISALLOWED_USERNAME_PATTERNS = Object.freeze([
  /h[e3]il+[^a-z0-9]*h[i1l!]+t[l1!][e3]r/iu,
  /s[i1l!]*e[g69][^a-z0-9]*h[e3][i1l!]*[l1!]/iu,
  /h[i1l!]+t[l1!][e3]r[^a-z0-9]*(d[i1l!]+d[^a-z0-9]*n[o0][^a-z0-9]*th[i1l!]+ng[^a-z0-9]*wr[o0]ng)/iu,
  /w[h]+[i1l!]*t[e3][^a-z0-9]*p[o0]w[e3]r/iu,
  /w[h]+[i1l!]*t[e3][^a-z0-9]*suprem[a4]cy/iu,
  /14[^a-z0-9]*88/iu,
  /88[^a-z0-9]*14/iu,
  /k[^a-z0-9]*k[^a-z0-9]*k/iu,
  /ku[^a-z0-9]*klux[^a-z0-9]*klan/iu,
  /n+[^a-z0-9]*[i1l!]+[^a-z0-9]*[g69]+[^a-z0-9]*[g69]+[^a-z0-9]*[e3]+[^a-z0-9]*[r4]+/iu,
  /n+[^a-z0-9]*[i1l!]+[^a-z0-9]*[g69]+[^a-z0-9]*[g69]+[^a-z0-9]*[a4]+/iu,
  /n[^a-z0-9]*w[^a-z0-9]*[o0][^a-z0-9]*r[^a-z0-9]*d/iu,
  /muscular[^a-z0-9]*anime[^a-z0-9]*girl/iu,
  /sprinting[^a-z0-9]*on[^a-z0-9]*a[^a-z0-9]*track/iu
]);
const SALT_ROUNDS = 12;
const VERIFY_IP_WINDOW_MS = 10 * 60 * 1000;
const VERIFY_IP_MAX_REQUESTS = 6;
const verificationIpRequests = new Map();
const EARLY_SUPPORTER_CUTOFF = '2026-06-18 00:00:00';
const USER_ROLES = Object.freeze({
  USER: 'user',
  MODERATOR: 'moderator',
  ADMINISTRATOR: 'administrator'
});

function getMailErrorMessage(error) {
  const message = typeof error?.message === 'string' ? error.message : '';
  const code = typeof error?.code === 'string' ? error.code : '';

  if (code === 'ETIMEDOUT' || code === 'ESOCKET' || message.toLowerCase().includes('timeout')) {
    return 'Der E-Mail-Dienst hat nicht rechtzeitig geantwortet. Bitte versuche es erneut. Falls das häufiger passiert, prüfe die Railway-Logs.';
  }

  if (code === 'EAUTH') {
    return 'Der E-Mail-Anbieter hat die Anmeldung abgelehnt. Prüfe RESEND_API_KEY oder die SMTP-Zugangsdaten in Railway.';
  }

  if (code === 'EFORBIDDEN') {
    return 'Die Absenderadresse wurde abgelehnt. Verifiziere tishu.dev in Resend und setze RESEND_FROM korrekt.';
  }

  if (code === 'ERESEND') {
    return 'Resend hat die Anfrage abgelehnt. Prüfe RESEND_FROM und deine verifizierten Domain-Einstellungen.';
  }

  if (code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
    return 'Der Server konnte den E-Mail-Dienst nicht erreichen. Prüfe das ausgehende Netzwerk in Railway und die Einstellungen deines Mail-Anbieters.';
  }

  if (message === 'Email delivery is not configured for this environment.' || message === 'Resend is not configured for this environment.') {
    return 'Der E-Mail-Versand ist auf dem Server nicht konfiguriert. Setze RESEND_API_KEY und RESEND_FROM in Railway und deploye neu.';
  }

  return 'Die Verifizierungs-E-Mail konnte nicht gesendet werden. Bitte versuche es erneut.';
}
function deleteOldAvatar(avatarPath) {
  if (!avatarPath || !avatarPath.startsWith('uploads/')) return;

  const fileName = path.basename(avatarPath);
  const filePath = path.join(uploadsDir, fileName);

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (err) {
    console.error('[DELETE AVATAR ERROR]', err);
  }
}

function touchUserActivity(userId) {
  if (!userId) return;

  try {
    db.prepare("UPDATE users SET last_active_at = datetime('now') WHERE id = ?")
      .run(userId);
  } catch (err) {
    console.error('[TOUCH ACTIVITY ERROR]', err);
  }
}

function getPublicUserProfileByEmail(email) {
  return db.prepare(`
    SELECT id, username, profile_name, pronouns, bio, full_name, email, avatar, birth_date, belief, confession, accent_color, role, early_supporter, is_developer, created_at
    FROM users
    WHERE email = ?
  `).get(normalizeEmail(email));
}

function isDisallowedUsername(usernameValue) {
  if (typeof usernameValue !== 'string') return false;
  const rawValue = usernameValue.trim().toLowerCase();
  if (!rawValue) return false;

  const leetspeakNormalized = rawValue
    .replace(/0/g, 'o')
    .replace(/[1!|]/g, 'i')
    .replace(/3/g, 'e')
    .replace(/4/g, 'a')
    .replace(/[5$]/g, 's')
    .replace(/[6@]/g, 'g')
    .replace(/[7+]/g, 't')
    .replace(/8/g, 'b');

  const compact = leetspeakNormalized.replace(/[^a-z0-9]/g, '');

  const termMatch = DISALLOWED_USERNAME_TERMS.some((term) => {
    const compactTerm = String(term).toLowerCase().replace(/[^a-z0-9]/g, '');
    return compactTerm && compact.includes(compactTerm);
  });
  if (termMatch) return true;

  return DISALLOWED_USERNAME_PATTERNS.some((pattern) => pattern.test(leetspeakNormalized));
}

function filterDisallowedUsers(users) {
  return Array.isArray(users)
    ? users.filter((user) => !isDisallowedUsername(user?.username))
    : [];
}

function normalizeUserRole(roleValue) {
  if (typeof roleValue !== 'string') return USER_ROLES.USER;
  const normalized = roleValue.trim().toLowerCase();
  if (normalized === USER_ROLES.ADMINISTRATOR) return USER_ROLES.ADMINISTRATOR;
  if (normalized === USER_ROLES.MODERATOR) return USER_ROLES.MODERATOR;
  return USER_ROLES.USER;
}

function getRoleFromUserRecord(user) {
  if (!user) return USER_ROLES.USER;
  if (isProtectedEmail(user.email)) return USER_ROLES.ADMINISTRATOR;
  return normalizeUserRole(user.role);
}

function enforceRestrictedUserRole(user) {
  if (!user?.id) return USER_ROLES.USER;

  const role = getRoleFromUserRecord(user);
  if (user.is_restricted !== 1) return role;
  if (isProtectedEmail(user.email)) return role;

  if (role === USER_ROLES.MODERATOR || role === USER_ROLES.ADMINISTRATOR) {
    try {
      db.prepare('UPDATE users SET role = ? WHERE id = ?').run(USER_ROLES.USER, user.id);
    } catch (err) {
      console.error('[RESTRICTED ROLE ENFORCEMENT ERROR]', err);
    }
    return USER_ROLES.USER;
  }

  return role;
}

function withResolvedRole(user) {
  if (!user) return user;
  return {
    ...user,
    role: getRoleFromUserRecord(user),
    is_developer: user.is_developer === 1 ? 1 : 0
  };
}

function getSessionUserRole(req) {
  if (!req.session.userId) return USER_ROLES.USER;
  const user = db.prepare('SELECT id, email, role, is_restricted FROM users WHERE id = ?').get(req.session.userId);
  return enforceRestrictedUserRole(user);
}

function isAdminSessionUser(req) {
  return getSessionUserRole(req) === USER_ROLES.ADMINISTRATOR;
}

function canAccessAdminPanel(req) {
  const role = getSessionUserRole(req);
  return role === USER_ROLES.ADMINISTRATOR || role === USER_ROLES.MODERATOR;
}

function canAccessDeveloperPanel(req) {
  if (!req.session.userId) return false;
  const user = db.prepare('SELECT is_developer, is_restricted FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return false;
  if (user.is_restricted === 1) return false;
  return user.is_developer === 1;
}

function normalizeAccentColor(colorValue) {
  if (typeof colorValue !== 'string') return null;
  const trimmedColor = colorValue.trim();
  if (!trimmedColor) return null;
  if (!HEX_COLOR_REGEX.test(trimmedColor)) return null;
  return trimmedColor.toUpperCase();
}

function normalizeBirthDate(birthDateValue) {
  if (typeof birthDateValue !== 'string') return null;

  const trimmedDate = birthDateValue.trim();
  if (!trimmedDate) return null;

  const match = trimmedDate.match(BIRTH_DATE_REGEX);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);

  if (!Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) return null;
  if (year < 1900 || year > 2100) return null;
  if (month < 1 || month > 12) return null;

  const maxDay = new Date(year, month, 0).getDate();
  if (day < 1 || day > maxDay) return null;

  return `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`;
}

function normalizeBelief(beliefValue) {
  if (typeof beliefValue !== 'string') return null;

  const trimmedBelief = beliefValue.trim();
  if (!trimmedBelief) return null;

  if (!BELIEF_VALUES.has(trimmedBelief)) return null;

  return trimmedBelief;
}

function normalizeConfession(beliefValue, confessionValue) {
  if (typeof confessionValue !== 'string') return null;

  const trimmedConfession = confessionValue.trim();
  if (!trimmedConfession) return null;

  if (!beliefValue || !BELIEF_VALUES.has(beliefValue)) return null;

  const validConfessions = CONFESSIONS_BY_BELIEF[beliefValue] || [];
  if (!validConfessions.includes(trimmedConfession)) return null;

  return trimmedConfession;
}

function normalizePronouns(pronounsValue) {
  if (typeof pronounsValue !== 'string') return null;

  const normalizedPronouns = pronounsValue.replace(/\s+/g, ' ').trim();
  if (!normalizedPronouns) return null;
  if (normalizedPronouns.length > 30) return null;

  return normalizedPronouns;
}

function normalizeBio(bioValue) {
  if (typeof bioValue !== 'string') return null;

  const normalizedBio = bioValue.replace(/\r\n?/g, '\n').trim();
  if (!normalizedBio) return null;
  if (normalizedBio.length > 200) return null;

  return normalizedBio;
}

function normalizeAvatarArtistUrl(urlValue) {
  if (typeof urlValue !== 'string') return null;

  const trimmedUrl = urlValue.trim();
  if (!trimmedUrl) return null;
  if (trimmedUrl.length > 500) return null;

  const candidateUrl = /^https?:\/\//i.test(trimmedUrl) ? trimmedUrl : `https://${trimmedUrl}`;

  try {
    const parsed = new URL(candidateUrl);
    const protocol = (parsed.protocol || '').toLowerCase();
    if (protocol !== 'http:' && protocol !== 'https:') return null;
    return parsed.toString();
  } catch (_) {
    return null;
  }
}

function shouldGrantEarlySupporterNow() {
  return Date.now() < new Date('2026-06-18T00:00:00').getTime();
}

function grantEarlySupporterStatus(userId) {
  if (!userId) return;

  try {
    db.prepare(`
      UPDATE users
      SET early_supporter = 1
      WHERE id = ?
        AND COALESCE(early_supporter, 0) = 0
        AND (
          datetime(created_at) < datetime(?)
          OR datetime('now') < datetime(?)
        )
    `).run(userId, EARLY_SUPPORTER_CUTOFF, EARLY_SUPPORTER_CUTOFF);
  } catch (err) {
    console.error('[EARLY SUPPORTER UPDATE ERROR]', err);
  }
}

function getFollowCounts(userId) {
  const followersCount = db.prepare(
    'SELECT COUNT(*) AS count FROM follows WHERE following_id = ?'
  ).get(userId)?.count || 0;

  const followingCount = db.prepare(
    'SELECT COUNT(*) AS count FROM follows WHERE follower_id = ?'
  ).get(userId)?.count || 0;

  return { followersCount, followingCount };
}

function isFollowingUser(followerId, followingId) {
  if (!followerId || !followingId) return false;

  const row = db.prepare(
    'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?'
  ).get(followerId, followingId);

  return Boolean(row);
}

function getClientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) {
    return forwarded.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function checkIpVerificationRateLimit(req) {
  const now = Date.now();
  const ip = getClientIp(req);
  const recent = (verificationIpRequests.get(ip) || []).filter((timestamp) => now - timestamp < VERIFY_IP_WINDOW_MS);

  if (recent.length >= VERIFY_IP_MAX_REQUESTS) {
    const retryAfterSeconds = Math.ceil((VERIFY_IP_WINDOW_MS - (now - recent[0])) / 1000);
    return { limited: true, retryAfterSeconds };
  }

  recent.push(now);
  verificationIpRequests.set(ip, recent);
  return { limited: false, retryAfterSeconds: 0 };
}

router.use('/admin', createAuthAdminRouter({
  db,
  isProtectedEmail,
  filterDisallowedUsers,
  getRoleFromUserRecord,
  getSessionUserRole,
  isAdminSessionUser,
  canAccessAdminPanel,
  canAccessDeveloperPanel,
  USER_ROLES,
  deleteOldAvatar
}));

router.use('/', createAuthProfileRouter({
  db,
  bcrypt,
  isProtectedEmail,
  USERNAME_REGEX,
  getPublicUserProfileByEmail,
  filterDisallowedUsers,
  isDisallowedUsername,
  getFollowCounts,
  isFollowingUser,
  withResolvedRole,
  deleteOldAvatar,
  upload,
  normalizeAccentColor,
  normalizeBirthDate,
  normalizeBelief,
  normalizeConfession,
  normalizePronouns,
  normalizeBio,
  normalizeAvatarArtistUrl
}));

router.use('/', createAuthCoreRouter({
  db,
  bcrypt,
  createMailTransport,
  getMailConfig,
  normalizeEmail,
  THA_REGEX,
  USERNAME_REGEX,
  SALT_ROUNDS,
  upload,
  isDisallowedUsername,
  withResolvedRole,
  touchUserActivity,
  grantEarlySupporterStatus,
  shouldGrantEarlySupporterNow,
  enforceRestrictedUserRole,
  getMailErrorMessage,
  checkIpVerificationRateLimit
}));

module.exports = router;



