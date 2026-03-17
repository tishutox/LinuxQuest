const express = require('express');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../database/db');
const { createMailTransport, getMailConfig } = require('../services/mailer');
const { isProtectedEmail, normalizeEmail } = require('../protectedUsers');

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
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB max
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
    SELECT id, username, profile_name, pronouns, bio, full_name, email, avatar, birth_date, belief, confession, accent_color, role, early_supporter, created_at
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
    role: getRoleFromUserRecord(user)
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

async function sendVerificationCodeEmail(email, code, subject) {
  const mailConfig = getMailConfig();

  if (!mailConfig.isConfigured && !mailConfig.allowConsoleFallback) {
    return {
      ok: false,
      status: 503,
      error: 'Der E-Mail-Versand ist auf dem Server nicht konfiguriert. Bitte kontaktiere den Support.'
    };
  }

  const transport = createMailTransport();
  const info = await transport.sendMail({
    from: mailConfig.from,
    to: email,
    subject,
    text: `Dein Verifizierungscode lautet: ${code}\n\nDieser Code läuft in 15 Minuten ab.\nFalls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.`,
    html: `<p>Dein Verifizierungscode lautet:</p><p style="font-size:1.6em;font-weight:bold;letter-spacing:6px">${code}</p><p>Dieser Code läuft in 15 Minuten ab.</p><p style="color:#999;font-size:.85em">Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.</p>`
  });

  if (!mailConfig.isConfigured) {
    console.log(`[EMAIL VERIFICATION] No SMTP configured - code for ${email}: ${code}`);
    return { ok: true };
  }

  const accepted = Array.isArray(info.accepted) ? info.accepted : [];
  const rejected = Array.isArray(info.rejected) ? info.rejected : [];

  console.log('[EMAIL VERIFICATION SENT]', {
    to: email,
    messageId: info.messageId,
    accepted,
    rejected,
    response: info.response || null
  });

  if (!accepted.length) {
    throw new Error('Der Mail-Anbieter hat keine Empfänger für die Verifizierungs-E-Mail akzeptiert.');
  }

  return { ok: true };
}

// ─── SEND EMAIL VERIFICATION ──────────────────────────────────────────────────
router.post('/send-verification', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !THA_REGEX.test(email.trim())) {
      return res.status(400).json({ error: 'Nur @tha.de-E-Mail-Adressen sind erlaubt.' });
    }

    const normalizedEmail = normalizeEmail(email);

    const ipLimit = checkIpVerificationRateLimit(req);
    if (ipLimit.limited) {
      return res.status(429).json({
        error: `Zu viele Verifizierungsanfragen aus deinem Netzwerk. Bitte versuche es in etwa ${ipLimit.retryAfterSeconds} Sekunden erneut.`
      });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
    if (existing) {
      return res.status(409).json({ error: 'Diese E-Mail-Adresse ist bereits registriert.' });
    }

    // Rate limit: one code per 60 seconds
    const recent = db.prepare(`
      SELECT id FROM email_verifications
      WHERE email = ? AND datetime(created_at) > datetime('now', '-60 seconds')
    `).get(normalizedEmail);

    if (recent) {
      return res.status(429).json({ error: 'Bitte warte einen Moment, bevor du einen neuen Code anforderst.' });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const mailResult = await sendVerificationCodeEmail(normalizedEmail, code, 'Dein Verifizierungscode');
    if (!mailResult.ok) {
      return res.status(mailResult.status).json({ error: mailResult.error });
    }

    db.prepare('DELETE FROM email_verifications WHERE email = ?').run(normalizedEmail);
    db.prepare(`
      INSERT INTO email_verifications (email, code, expires_at)
      VALUES (?, ?, datetime('now', '+15 minutes'))
    `).run(normalizedEmail, code);

    return res.json({ message: 'Verifizierungscode gesendet! Bitte prüfe dein Postfach.' });
  } catch (err) {
    console.error('[SEND VERIFICATION ERROR]', {
      code: err?.code || err?.responseCode || null,
      message: err?.message || 'Unknown error',
      response: err?.response || null,
      command: err?.command || null
    });
    return res.status(500).json({ error: getMailErrorMessage(err) });
  }
});

// ─── SEND PASSWORD RESET VERIFICATION ────────────────────────────────────────
router.post('/send-password-reset-verification', async (req, res) => {
  try {
    const { identifier } = req.body;

    if (!identifier || !identifier.trim()) {
      return res.status(400).json({ error: 'Bitte gib deine E-Mail-Adresse oder deinen Benutzernamen ein.' });
    }

    const trimmedIdentifier = identifier.trim();

    const ipLimit = checkIpVerificationRateLimit(req);
    if (ipLimit.limited) {
      return res.status(429).json({
        error: `Zu viele Verifizierungsanfragen aus deinem Netzwerk. Bitte versuche es in etwa ${ipLimit.retryAfterSeconds} Sekunden erneut.`
      });
    }

    const user = db.prepare(
      'SELECT email FROM users WHERE email = ? OR username = ?'
    ).get(normalizeEmail(trimmedIdentifier), trimmedIdentifier);

    if (!user) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    }

    const normalizedEmail = normalizeEmail(user.email);

    const recent = db.prepare(`
      SELECT id FROM password_reset_verifications
      WHERE email = ? AND datetime(created_at) > datetime('now', '-60 seconds')
    `).get(normalizedEmail);

    if (recent) {
      return res.status(429).json({ error: 'Bitte warte einen Moment, bevor du einen neuen Code anforderst.' });
    }

    const code = Math.floor(100000 + Math.random() * 900000).toString();

    const mailResult = await sendVerificationCodeEmail(normalizedEmail, code, 'Dein Code zum Zurücksetzen des Passworts');
    if (!mailResult.ok) {
      return res.status(mailResult.status).json({ error: mailResult.error });
    }

    db.prepare('DELETE FROM password_reset_verifications WHERE email = ?').run(normalizedEmail);
    db.prepare(`
      INSERT INTO password_reset_verifications (email, code, expires_at)
      VALUES (?, ?, datetime('now', '+15 minutes'))
    `).run(normalizedEmail, code);

    return res.json({ message: 'Verifizierungscode gesendet! Bitte prüfe dein Postfach.' });
  } catch (err) {
    console.error('[SEND RESET VERIFICATION ERROR]', {
      code: err?.code || err?.responseCode || null,
      message: err?.message || 'Unknown error',
      response: err?.response || null,
      command: err?.command || null
    });
    return res.status(500).json({ error: getMailErrorMessage(err) });
  }
});

// ─── REGISTER ─────────────────────────────────────────────────────────────────
router.post('/register', upload.single('avatar'), async (req, res) => {
  try {
    const { username, profile_name, full_name, email, password, confirm_password, verificationCode } = req.body;

    // ── Validation ────────────────────────────────────────────────────────────
    if (!username || !full_name || !email || !password || !confirm_password) {
      return res.status(400).json({ error: 'Alle Felder sind erforderlich.' });
    }

    if (!verificationCode) {
      return res.status(400).json({ error: 'Bitte verifiziere zuerst deine E-Mail-Adresse.' });
    }

    if (!USERNAME_REGEX.test(username)) {
      return res.status(400).json({ error: 'Der Benutzername darf nur Buchstaben, Zahlen, Unterstriche und Bindestriche enthalten.' });
    }

    if (isDisallowedUsername(username)) {
      return res.status(400).json({ error: 'Dieser Benutzername ist nicht erlaubt.' });
    }

    if (username.length > 20) {
      return res.status(400).json({ error: 'Der Benutzername darf maximal 20 Zeichen lang sein.' });
    }

    if (!THA_REGEX.test(email)) {
      return res.status(400).json({ error: 'Nur @tha.de-E-Mail-Adressen sind erlaubt.' });
    }

    // ── Email verification check ──────────────────────────────────────────────
    const emailVerification = db.prepare(`
      SELECT id FROM email_verifications
      WHERE email = ? AND code = ? AND datetime(expires_at) > datetime('now')
    `).get(normalizeEmail(email), verificationCode.trim());

    if (!emailVerification) {
      return res.status(400).json({ error: 'Ungültiger oder abgelaufener Verifizierungscode.' });
    }

    if (password !== confirm_password) {
      return res.status(400).json({ error: 'Die Passwörter stimmen nicht überein.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Das Passwort muss mindestens 6 Zeichen lang sein.' });
    }

    // ── Uniqueness checks ─────────────────────────────────────────────────────
    const existingEmail    = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizeEmail(email));
    const existingUsername = db.prepare('SELECT id FROM users WHERE username = ?').get(username);

    if (existingEmail)    return res.status(409).json({ error: 'Diese E-Mail-Adresse ist bereits registriert.' });
    if (existingUsername) return res.status(409).json({ error: 'Dieser Benutzername ist bereits vergeben.' });

    const trimmedProfileName = typeof profile_name === 'string' ? profile_name.trim() : '';
    if (trimmedProfileName.length > 20) {
      return res.status(400).json({ error: 'Der Profilname darf maximal 20 Zeichen lang sein.' });
    }

    const normalizedProfileName = trimmedProfileName || null;

    // ── Store avatar path (relative) or null ──────────────────────────────────
    const avatarPath = req.file ? 'uploads/' + req.file.filename : null;

    // ── Hash & insert ─────────────────────────────────────────────────────────
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    const info = db.prepare(`
      INSERT INTO users (username, profile_name, full_name, email, password, avatar, last_active_at, early_supporter)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)
    `).run(username.trim(), normalizedProfileName, full_name.trim(), normalizeEmail(email), hashed, avatarPath, shouldGrantEarlySupporterNow() ? 1 : 0);

    // ── Start session ─────────────────────────────────────────────────────────
    req.session.userId = info.lastInsertRowid;

    db.prepare('DELETE FROM email_verifications WHERE email = ?').run(normalizeEmail(email));

    const user = db.prepare('SELECT id, username, profile_name, pronouns, bio, full_name, email, avatar, birth_date, belief, confession, accent_color, role, early_supporter, created_at FROM users WHERE id = ?')
                   .get(info.lastInsertRowid);

    return res.status(201).json({ message: 'Konto erfolgreich erstellt!', user: withResolvedRole(user) });

  } catch (err) {
    console.error('[REGISTER ERROR]', err);
    return res.status(500).json({ error: 'Serverfehler. Bitte versuche es erneut.' });
  }
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;   // identifier = email OR username

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Bitte fülle alle Felder aus.' });
    }

    // Try to find by email first, then by username
    const user = db.prepare(
      'SELECT * FROM users WHERE email = ? OR username = ?'
    ).get(identifier.trim(), identifier.trim());

    if (!user) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Ungültige Anmeldedaten.' });
    }

    touchUserActivity(user.id);
    grantEarlySupporterStatus(user.id);

    const refreshedUser = db.prepare(`
      SELECT id, username, profile_name, pronouns, bio, full_name, email, avatar, birth_date, belief, confession, accent_color, role, early_supporter, created_at, is_restricted
      FROM users
      WHERE id = ?
    `).get(user.id);

    const resolvedRole = enforceRestrictedUserRole(refreshedUser);

    req.session.userId = user.id;

    return res.json({
      message: 'Erfolgreich angemeldet!',
      user: {
        ...withResolvedRole(refreshedUser),
        role: resolvedRole
      }
    });

  } catch (err) {
    console.error('[LOGIN ERROR]', err);
    return res.status(500).json({ error: 'Serverfehler. Bitte versuche es erneut.' });
  }
});

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ message: 'Abgemeldet.' }));
});

// ─── SESSION CHECK ────────────────────────────────────────────────────────────
router.get('/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Nicht authentifiziert.' });

  const user = db.prepare(
    'SELECT id, username, profile_name, pronouns, bio, full_name, email, avatar, birth_date, belief, confession, accent_color, role, early_supporter, created_at, is_restricted FROM users WHERE id = ?'
  ).get(req.session.userId);

  if (!user) return res.status(401).json({ error: 'Benutzer nicht gefunden.' });

  touchUserActivity(req.session.userId);

  // Check if username is valid; if not, frontend should show change modal
  const isValidUsername = USERNAME_REGEX.test(user.username);
  const resolvedRole = enforceRestrictedUserRole(user);

  return res.json({
    user: {
      ...withResolvedRole(user),
      role: resolvedRole
    },
    needsUsernameUpdate: !isValidUsername
  });
});

router.get('/project-contacts', (_req, res) => {
  try {
    const contacts = {
      armand: getPublicUserProfileByEmail('armand.patrick.asztalos@tha.de') || null,
      jost: getPublicUserProfileByEmail('jost.witthauer@tha.de') || null
    };

    return res.json({ contacts });
  } catch (err) {
    console.error('[PROJECT CONTACTS ERROR]', err);
    return res.status(500).json({ error: 'Projektkontakte konnten nicht geladen werden.' });
  }
});

router.get('/search-users', (req, res) => {
  try {
    const rawQuery = typeof req.query.q === 'string' ? req.query.q : '';
    const query = rawQuery.trim();

    if (!query) {
      return res.json({
        query: '',
        results: {
          displayNames: [],
          usernames: []
        }
      });
    }

    const likeQuery = `%${query}%`;
    const limitPerGroup = 6;

    const displayNames = db.prepare(`
      SELECT id, username, profile_name, full_name, avatar, accent_color
      FROM users
      WHERE profile_name IS NOT NULL
        AND TRIM(profile_name) != ''
        AND profile_name LIKE ? COLLATE NOCASE
      ORDER BY username COLLATE NOCASE ASC
      LIMIT ?
    `).all(likeQuery, limitPerGroup);

    const usernames = db.prepare(`
      SELECT id, username, profile_name, full_name, avatar, accent_color
      FROM users
      WHERE username LIKE ? COLLATE NOCASE
      ORDER BY username COLLATE NOCASE ASC
      LIMIT ?
    `).all(likeQuery, limitPerGroup);

    const filteredDisplayNames = filterDisallowedUsers(displayNames);
    const filteredUsernames = filterDisallowedUsers(usernames);

    return res.json({
      query,
      results: {
        displayNames: filteredDisplayNames,
        usernames: filteredUsernames
      }
    });
  } catch (err) {
    console.error('[SEARCH USERS ERROR]', err);
    return res.status(500).json({ error: 'Suche konnte nicht geladen werden.' });
  }
});

router.get('/admin/users', (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert.' });
    }

    if (!canAccessAdminPanel(req)) {
      return res.status(403).json({ error: 'Kein Zugriff auf den Admin-Bereich.' });
    }

    const rawQuery = typeof req.query.q === 'string' ? req.query.q : '';
    const query = rawQuery.trim();

    const users = query
      ? db.prepare(`
          SELECT id, username, profile_name, full_name, email, avatar, accent_color, role, is_restricted
          FROM users
          WHERE username LIKE ? COLLATE NOCASE
          ORDER BY username COLLATE NOCASE ASC
        `).all(`%${query}%`)
      : db.prepare(`
          SELECT id, username, profile_name, full_name, email, avatar, accent_color, role, is_restricted
          FROM users
          ORDER BY username COLLATE NOCASE ASC
        `).all();

    const visibleUsers = filterDisallowedUsers(users);

    const sanitizedUsers = visibleUsers.map((user) => ({
      id: user.id,
      username: user.username,
      profile_name: user.profile_name,
      full_name: user.full_name,
      avatar: user.avatar,
      accent_color: user.accent_color,
      role: getRoleFromUserRecord(user),
      isProtected: isProtectedEmail(user.email),
      isRestricted: user.is_restricted === 1
    }));

    return res.json({ query, users: sanitizedUsers });
  } catch (err) {
    console.error('[ADMIN USER LIST ERROR]', err);
    return res.status(500).json({ error: 'Admin-Userliste konnte nicht geladen werden.' });
  }
});

router.delete('/admin/users/:username', (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert.' });
    }

    if (!isAdminSessionUser(req)) {
      return res.status(403).json({ error: 'Kein Zugriff auf den Admin-Bereich.' });
    }

    const username = typeof req.params.username === 'string' ? req.params.username.trim() : '';
    if (!username) {
      return res.status(400).json({ error: 'Ungültiger Benutzername.' });
    }

    const usersToDelete = db.prepare(`
      SELECT id, username, email, avatar
      FROM users
      WHERE username = ? COLLATE NOCASE
    `).all(username);

    const hasProtectedUser = usersToDelete.some((user) => isProtectedEmail(user.email));
    if (hasProtectedUser) {
      return res.status(403).json({ error: 'Dieser Nutzer ist geschützt und kann nicht gelöscht werden.' });
    }

    if (!usersToDelete.length) {
      return res.json({ message: `Nutzer @${username} war bereits entfernt.` });
    }

    const deleteEmailVerificationsByEmail = db.prepare('DELETE FROM email_verifications WHERE LOWER(email) = LOWER(?)');
    const deletePasswordResetByEmail = db.prepare('DELETE FROM password_reset_verifications WHERE LOWER(email) = LOWER(?)');
    const deleteUserFollows = db.prepare('DELETE FROM follows WHERE follower_id = ? OR following_id = ?');
    const deleteUserById = db.prepare('DELETE FROM users WHERE id = ?');

    db.exec('BEGIN');
    try {
      usersToDelete.forEach((user) => {
        if (user.email) {
          deleteEmailVerificationsByEmail.run(user.email);
          deletePasswordResetByEmail.run(user.email);
        }
        deleteUserFollows.run(user.id, user.id);
        deleteUserById.run(user.id);
      });
      db.exec('COMMIT');
    } catch (txErr) {
      db.exec('ROLLBACK');
      throw txErr;
    }
    usersToDelete.forEach((user) => deleteOldAvatar(user.avatar));

    return res.json({ message: `Nutzer @${usersToDelete[0].username} wurde gelöscht.` });
  } catch (err) {
    console.error('[ADMIN DELETE USER ERROR]', err);
    return res.status(500).json({ error: 'Nutzer konnte nicht gelöscht werden.' });
  }
});

router.patch('/admin/users/:username/moderator-toggle', (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert.' });
    }

    if (!isAdminSessionUser(req)) {
      return res.status(403).json({ error: 'Nur Administrator*innen können Rollen ändern.' });
    }

    const username = typeof req.params.username === 'string' ? req.params.username.trim() : '';
    if (!username) {
      return res.status(400).json({ error: 'Ungültiger Benutzername.' });
    }

    const targetUser = db.prepare(`
      SELECT id, username, email, role
      FROM users
      WHERE username = ? COLLATE NOCASE
    `).get(username);

    if (!targetUser) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    }

    const targetRole = getRoleFromUserRecord(targetUser);
    if (targetRole === USER_ROLES.ADMINISTRATOR) {
      return res.status(403).json({ error: 'Administrator*innen können nicht zur Moderatorrolle geändert werden.' });
    }

    const nextRole = targetRole === USER_ROLES.MODERATOR ? USER_ROLES.USER : USER_ROLES.MODERATOR;

    db.prepare('UPDATE users SET role = ? WHERE id = ?').run(nextRole, targetUser.id);

    return res.json({
      message: nextRole === USER_ROLES.MODERATOR
        ? `@${targetUser.username} wurde zu Moderator*in befördert.`
        : `@${targetUser.username} wurde zur Nutzerrolle zurückgestuft.`,
      role: nextRole,
      username: targetUser.username
    });
  } catch (err) {
    console.error('[ADMIN TOGGLE MODERATOR ERROR]', err);
    return res.status(500).json({ error: 'Rolle konnte nicht geändert werden.' });
  }
});

router.patch('/admin/users/:username/restrict', (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert.' });
    }

    if (!canAccessAdminPanel(req)) {
      return res.status(403).json({ error: 'Nur Administrator*innen und Moderator*innen können Nutzer einschränken.' });
    }

    const username = typeof req.params.username === 'string' ? req.params.username.trim() : '';
    if (!username) {
      return res.status(400).json({ error: 'Ungültiger Benutzername.' });
    }

    const targetUser = db.prepare(`
      SELECT id, username, email, role, is_restricted
      FROM users
      WHERE username = ? COLLATE NOCASE
    `).get(username);

    if (!targetUser) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    }

    // Cannot restrict oneself
    if (targetUser.id === req.session.userId) {
      return res.status(403).json({ error: 'Du kannst dich selbst nicht einschränken.' });
    }

    const viewerRole = getSessionUserRole(req);
    const targetRole = getRoleFromUserRecord(targetUser);

    // Moderators can only restrict normal users
    if (viewerRole === USER_ROLES.MODERATOR) {
      if (targetRole !== USER_ROLES.USER) {
        return res.status(403).json({ error: 'Moderator*innen können nur normale Nutzer einschränken.' });
      }
    }

    // Admins cannot restrict other admins
    if (viewerRole === USER_ROLES.ADMINISTRATOR) {
      if (targetRole === USER_ROLES.ADMINISTRATOR) {
        return res.status(403).json({ error: 'Administrator*innen können nicht eingeschränkt werden.' });
      }
    }

    const isProtected = isProtectedEmail(targetUser.email);
    if (isProtected) {
      return res.status(403).json({ error: 'Geschützte Nutzer können nicht eingeschränkt werden.' });
    }

    const nextRestrictionStatus = targetUser.is_restricted === 1 ? 0 : 1;
    
    // If restricting a mod or admin, automatically downgrade them to user
    let downgradedRole = null;
    if (nextRestrictionStatus === 1 && (targetRole === USER_ROLES.MODERATOR || targetRole === USER_ROLES.ADMINISTRATOR)) {
      db.prepare('UPDATE users SET is_restricted = ?, role = ? WHERE id = ?').run(nextRestrictionStatus, USER_ROLES.USER, targetUser.id);
      downgradedRole = targetRole;
    } else {
      db.prepare('UPDATE users SET is_restricted = ? WHERE id = ?').run(nextRestrictionStatus, targetUser.id);
    }

    let message = nextRestrictionStatus === 1
      ? `@${targetUser.username} wurde eingeschränkt.`
      : `@${targetUser.username} wurde freigegeben.`;
    
    if (downgradedRole === USER_ROLES.MODERATOR) {
      message += ' Rolle wurde von Moderator*in zu Nutzer degradiert.';
    } else if (downgradedRole === USER_ROLES.ADMINISTRATOR) {
      message += ' Rolle wurde von Administrator*in zu Nutzer degradiert.';
    }

    return res.json({
      message,
      restricted: nextRestrictionStatus === 1,
      username: targetUser.username
    });
  } catch (err) {
    console.error('[ADMIN TOGGLE RESTRICT ERROR]', err);
    return res.status(500).json({ error: 'Einschränkung konnte nicht geändert werden.' });
  }
});

router.get('/public/:username', (req, res) => {
  try {
    const username = req.params.username?.trim();

    if (!username || !USERNAME_REGEX.test(username)) {
      return res.status(400).json({ error: 'Ungültiger Benutzername.' });
    }

    if (isDisallowedUsername(username)) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    }

    const user = db.prepare(`
      SELECT id, username, profile_name, pronouns, bio, full_name, email, avatar, birth_date, belief, confession, accent_color, role, early_supporter, created_at, is_restricted
      FROM users
      WHERE username = ?
    `).get(username);

    if (!user) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    }

    const { followersCount, followingCount } = getFollowCounts(user.id);
    const viewerId = req.session.userId || null;
    const isOwnProfile = Boolean(viewerId && viewerId === user.id);
    const isFollowing = isOwnProfile ? false : isFollowingUser(viewerId, user.id);

    return res.json({
      user: withResolvedRole(user),
      follow: {
        followersCount,
        followingCount,
        isFollowing,
        isOwnProfile,
        canFollow: Boolean(viewerId) && !isOwnProfile
      }
    });
  } catch (err) {
    console.error('[PUBLIC PROFILE ERROR]', err);
    return res.status(500).json({ error: 'Öffentliches Profil konnte nicht geladen werden.' });
  }
});

router.get('/public/:username/followers', (req, res) => {
  try {
    const username = req.params.username?.trim();

    if (!username || !USERNAME_REGEX.test(username)) {
      return res.status(400).json({ error: 'Ungültiger Benutzername.' });
    }

    if (isDisallowedUsername(username)) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    }

    const user = db.prepare('SELECT id, username FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    }

    const users = db.prepare(`
      SELECT u.id, u.username, u.full_name, u.avatar, u.accent_color
      FROM follows f
      INNER JOIN users u ON u.id = f.follower_id
      WHERE f.following_id = ?
      ORDER BY datetime(f.created_at) DESC, u.username COLLATE NOCASE ASC
    `).all(user.id);

    return res.json({ users });
  } catch (err) {
    console.error('[PUBLIC FOLLOWERS ERROR]', err);
    return res.status(500).json({ error: 'Follower konnten nicht geladen werden.' });
  }
});

router.get('/public/:username/following', (req, res) => {
  try {
    const username = req.params.username?.trim();

    if (!username || !USERNAME_REGEX.test(username)) {
      return res.status(400).json({ error: 'Ungültiger Benutzername.' });
    }

    if (isDisallowedUsername(username)) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    }

    const user = db.prepare('SELECT id, username FROM users WHERE username = ?').get(username);
    if (!user) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    }

    const users = db.prepare(`
      SELECT u.id, u.username, u.full_name, u.avatar, u.accent_color
      FROM follows f
      INNER JOIN users u ON u.id = f.following_id
      WHERE f.follower_id = ?
      ORDER BY datetime(f.created_at) DESC, u.username COLLATE NOCASE ASC
    `).all(user.id);

    return res.json({ users });
  } catch (err) {
    console.error('[PUBLIC FOLLOWING ERROR]', err);
    return res.status(500).json({ error: 'Gefolgte Profile konnten nicht geladen werden.' });
  }
});

router.post('/follow/:username', (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Bitte melde dich an, um zu folgen.' });
    }

    const username = req.params.username?.trim();
    if (!username || !USERNAME_REGEX.test(username)) {
      return res.status(400).json({ error: 'Ungültiger Benutzername.' });
    }

    if (isDisallowedUsername(username)) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    }

    const targetUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (!targetUser) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    }

    if (targetUser.id === req.session.userId) {
      return res.status(400).json({ error: 'Du kannst dir nicht selbst folgen.' });
    }

    const existing = db.prepare(
      'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?'
    ).get(req.session.userId, targetUser.id);

    if (existing) {
      return res.status(409).json({ error: 'Du folgst diesem Profil bereits.' });
    }

    db.prepare(
      'INSERT INTO follows (follower_id, following_id) VALUES (?, ?)'
    ).run(req.session.userId, targetUser.id);

    const counts = getFollowCounts(targetUser.id);
    return res.json({ message: 'Du folgst diesem Profil jetzt.', follow: counts });
  } catch (err) {
    console.error('[FOLLOW USER ERROR]', err);
    return res.status(500).json({ error: 'Profil konnte nicht gefolgt werden.' });
  }
});

router.delete('/follow/:username', (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Bitte melde dich an, um zu entfolgen.' });
    }

    const username = req.params.username?.trim();
    if (!username || !USERNAME_REGEX.test(username)) {
      return res.status(400).json({ error: 'Ungültiger Benutzername.' });
    }

    if (isDisallowedUsername(username)) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    }

    const targetUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (!targetUser) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    }

    db.prepare(
      'DELETE FROM follows WHERE follower_id = ? AND following_id = ?'
    ).run(req.session.userId, targetUser.id);

    const counts = getFollowCounts(targetUser.id);
    return res.json({ message: 'Du folgst diesem Profil nicht mehr.', follow: counts });
  } catch (err) {
    console.error('[UNFOLLOW USER ERROR]', err);
    return res.status(500).json({ error: 'Profil konnte nicht entfolgt werden.' });
  }
});

// ─── UPDATE USERNAME ──────────────────────────────────────────────────────────
router.post('/update-username', (req, res) => {
  try {
    const { newUsername } = req.body;

    if (!req.session.userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert.' });
    }

    if (!newUsername || !USERNAME_REGEX.test(newUsername)) {
      return res.status(400).json({ error: 'Der Benutzername darf nur Buchstaben, Zahlen, Unterstriche und Bindestriche enthalten.' });
    }

    if (isDisallowedUsername(newUsername)) {
      return res.status(400).json({ error: 'Dieser Benutzername ist nicht erlaubt.' });
    }

    if (newUsername.length > 20) {
      return res.status(400).json({ error: 'Der Benutzername darf maximal 20 Zeichen lang sein.' });
    }

    // Check if username is already taken
    const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?')
                       .get(newUsername, req.session.userId);
    if (existing) {
      return res.status(409).json({ error: 'Dieser Benutzername ist bereits vergeben.' });
    }

    db.prepare("UPDATE users SET username = ?, last_active_at = datetime('now') WHERE id = ?")
      .run(newUsername, req.session.userId);

    const user = db.prepare('SELECT id, username, profile_name, pronouns, bio, full_name, email, avatar, birth_date, belief, confession, accent_color, role, early_supporter, created_at FROM users WHERE id = ?')
                   .get(req.session.userId);

    return res.json({ message: 'Benutzername aktualisiert!', user: withResolvedRole(user) });
  } catch (err) {
    console.error('[UPDATE USERNAME ERROR]', err);
    return res.status(500).json({ error: 'Serverfehler.' });
  }
});

// ─── UPDATE AVATAR ────────────────────────────────────────────────────────────
router.post('/update-avatar', upload.single('avatar'), (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Bitte wähle eine Bilddatei aus.' });
    }

    const currentUser = db.prepare('SELECT avatar FROM users WHERE id = ?')
                          .get(req.session.userId);

    if (!currentUser) {
      deleteOldAvatar('uploads/' + req.file.filename);
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    }

    const newAvatarPath = 'uploads/' + req.file.filename;

    db.prepare("UPDATE users SET avatar = ?, last_active_at = datetime('now') WHERE id = ?")
      .run(newAvatarPath, req.session.userId);

    deleteOldAvatar(currentUser.avatar);

    const user = db.prepare('SELECT id, username, profile_name, pronouns, bio, full_name, email, avatar, birth_date, belief, confession, accent_color, role, early_supporter, created_at FROM users WHERE id = ?')
                   .get(req.session.userId);

    return res.json({ message: 'Profilbild aktualisiert!', user: withResolvedRole(user) });
  } catch (err) {
    console.error('[UPDATE AVATAR ERROR]', err);
    return res.status(500).json({ error: 'Serverfehler.' });
  }
});

// ─── UPDATE PROFILE (NAME + USERNAME) ───────────────────────────────────────
router.post('/update-profile', (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert.' });
    }

    const currentUserRecord = db.prepare('SELECT id, is_restricted FROM users WHERE id = ?').get(req.session.userId);
    if (currentUserRecord?.is_restricted === 1) {
      return res.status(403).json({ error: 'Dein Profil ist eingeschränkt und kann nicht modifiziert werden. Du kannst ein Freigabeticket einreichen.' });
    }

    const { full_name, profile_name, pronouns, bio, birth_date, belief, confession, username, accent_color } = req.body;

    if (!full_name || !username) {
      return res.status(400).json({ error: 'Vollständiger Name und Benutzername sind erforderlich.' });
    }

    const trimmedName = full_name.trim();
    const trimmedProfileName = typeof profile_name === 'string' ? profile_name.trim() : '';
    const trimmedPronouns = typeof pronouns === 'string' ? pronouns.trim() : '';
    const rawBio = typeof bio === 'string' ? bio : '';
    const trimmedBirthDate = typeof birth_date === 'string' ? birth_date.trim() : '';
    const trimmedBelief = typeof belief === 'string' ? belief.trim() : '';
    const trimmedConfession = typeof confession === 'string' ? confession.trim() : '';
    const trimmedUsername = username.trim();

    if (!trimmedName) {
      return res.status(400).json({ error: 'Vollständiger Name ist erforderlich.' });
    }

    if (trimmedProfileName.length > 20) {
      return res.status(400).json({ error: 'Der Profilname darf maximal 20 Zeichen lang sein.' });
    }

    if (!USERNAME_REGEX.test(trimmedUsername)) {
      return res.status(400).json({ error: 'Der Benutzername darf nur Buchstaben, Zahlen, Unterstriche und Bindestriche enthalten.' });
    }

    if (isDisallowedUsername(trimmedUsername)) {
      return res.status(400).json({ error: 'Dieser Benutzername ist nicht erlaubt.' });
    }

    if (trimmedUsername.length > 20) {
      return res.status(400).json({ error: 'Der Benutzername darf maximal 20 Zeichen lang sein.' });
    }

    const normalizedAccentColor = normalizeAccentColor(accent_color);
    if (typeof accent_color === 'string' && accent_color.trim() && !normalizedAccentColor) {
      return res.status(400).json({ error: 'Die Profilfarbe muss ein gültiger Hex-Farbwert sein (z. B. #352C59).' });
    }

    const normalizedBirthDate = normalizeBirthDate(trimmedBirthDate);
    if (trimmedBirthDate && !normalizedBirthDate) {
      return res.status(400).json({ error: 'Das Geburtsdatum muss im Format dd/mm/yyyy angegeben werden.' });
    }

    const normalizedBelief = normalizeBelief(trimmedBelief);
    if (trimmedBelief && !normalizedBelief) {
      return res.status(400).json({ error: 'Bitte wähle einen gültigen Glauben aus der Liste aus.' });
    }

    if (!trimmedBelief && trimmedConfession) {
      return res.status(400).json({ error: 'Bitte wähle zuerst eine Religion aus.' });
    }

    const normalizedConfession = normalizeConfession(normalizedBelief, trimmedConfession);
    if (trimmedConfession && !normalizedConfession) {
      return res.status(400).json({ error: 'Bitte wähle eine gültige Konfession passend zur Religion aus.' });
    }

    const normalizedPronouns = normalizePronouns(trimmedPronouns);
    if (trimmedPronouns && !normalizedPronouns) {
      return res.status(400).json({ error: 'Die Pronomen dürfen maximal 30 Zeichen lang sein.' });
    }

    const normalizedBio = normalizeBio(rawBio);
    if (rawBio.trim() && !normalizedBio) {
      return res.status(400).json({ error: 'Die Bio darf maximal 200 Zeichen lang sein.' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?')
                       .get(trimmedUsername, req.session.userId);

    if (existing) {
      return res.status(409).json({ error: 'Dieser Benutzername ist bereits vergeben.' });
    }

    db.prepare("UPDATE users SET full_name = ?, profile_name = ?, pronouns = ?, bio = ?, birth_date = ?, belief = ?, confession = ?, username = ?, accent_color = ?, last_active_at = datetime('now') WHERE id = ?")
      .run(trimmedName, trimmedProfileName || null, normalizedPronouns, normalizedBio, normalizedBirthDate, normalizedBelief, normalizedConfession, trimmedUsername, normalizedAccentColor, req.session.userId);

    const user = db.prepare('SELECT id, username, profile_name, pronouns, bio, full_name, email, avatar, birth_date, belief, confession, accent_color, role, early_supporter, created_at FROM users WHERE id = ?')
                   .get(req.session.userId);

    return res.json({ message: 'Profil aktualisiert!', user: withResolvedRole(user) });
  } catch (err) {
    console.error('[UPDATE PROFILE ERROR]', err);
    return res.status(500).json({ error: 'Serverfehler.' });
  }
});

// ─── DELETE ACCOUNT ───────────────────────────────────────────────────────────
router.delete('/delete-account', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert.' });
    }

    const currentUserRecord = db.prepare('SELECT id, is_restricted FROM users WHERE id = ?').get(req.session.userId);
    if (currentUserRecord?.is_restricted === 1) {
      return res.status(403).json({ error: 'Dein Profil ist eingeschränkt und kann nicht gelöscht werden. Du kannst ein Freigabeticket einreichen.' });
    }

    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Passwort ist erforderlich.' });
    }

    const user = db.prepare('SELECT avatar, password, email FROM users WHERE id = ?')
                   .get(req.session.userId);

    if (!user) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    }

    if (isProtectedEmail(user.email)) {
      return res.status(403).json({ error: 'Dieses Projektkonto ist geschützt und kann nicht gelöscht werden.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Falsches Passwort.' });
    }

    db.prepare('DELETE FROM users WHERE id = ?')
      .run(req.session.userId);

    deleteOldAvatar(user.avatar);

    req.session.destroy((err) => {
      if (err) {
        console.error('[DELETE ACCOUNT SESSION ERROR]', err);
        return res.status(500).json({ error: 'Konto gelöscht, aber Bereinigung der Sitzung fehlgeschlagen.' });
      }

      return res.json({ message: 'Konto erfolgreich gelöscht.' });
    });
  } catch (err) {
    console.error('[DELETE ACCOUNT ERROR]', err);
    return res.status(500).json({ error: 'Serverfehler.' });
  }
});

// ─── RESET PASSWORD ───────────────────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { identifier, verificationCode, newPassword, confirmPassword } = req.body;

    if (!identifier || !verificationCode || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Alle Felder sind erforderlich.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Die Passwörter stimmen nicht überein.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Das Passwort muss mindestens 6 Zeichen lang sein.' });
    }

    // Find user by email or username
    const user = db.prepare(
      'SELECT id, email FROM users WHERE email = ? OR username = ?'
    ).get(normalizeEmail(identifier), identifier.trim());

    if (!user) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    }

    const normalizedEmail = normalizeEmail(user.email);

    const resetVerification = db.prepare(`
      SELECT id FROM password_reset_verifications
      WHERE email = ? AND code = ? AND datetime(expires_at) > datetime('now')
    `).get(normalizedEmail, verificationCode.trim());

    if (!resetVerification) {
      return res.status(400).json({ error: 'Ungültiger oder abgelaufener Verifizierungscode.' });
    }

    // Hash and update password
    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
    db.prepare("UPDATE users SET password = ?, last_active_at = datetime('now') WHERE id = ?")
      .run(hashed, user.id);

    db.prepare('DELETE FROM password_reset_verifications WHERE email = ?').run(normalizedEmail);

    return res.json({ message: 'Passwort erfolgreich zurückgesetzt! Du kannst dich jetzt mit deinem neuen Passwort anmelden.' });
  } catch (err) {
    console.error('[RESET PASSWORD ERROR]', err);
    return res.status(500).json({ error: 'Serverfehler.' });
  }
});

// ─── REPORT USER ──────────────────────────────────────────────────────────────
router.post('/report/:username', (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Du musst angemeldet sein, um zu melden.' });
    }

    const { username } = req.params;
    const { reason } = req.body;

    const reporterUser = db.prepare('SELECT id FROM users WHERE id = ?').get(req.session.userId);
    if (!reporterUser) {
      return res.status(401).json({ error: 'Ungültige Session.' });
    }

    const reportedUser = db.prepare('SELECT id FROM users WHERE username = ?').get((username || '').trim());
    if (!reportedUser) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    }

    if (reportedUser.id === req.session.userId) {
      return res.status(400).json({ error: 'Du kannst dich selbst nicht melden.' });
    }

    const trimmedReason = typeof reason === 'string' ? reason.trim() : '';

    db.prepare(`
      INSERT INTO reports (reported_user_id, reporter_user_id, reason)
      VALUES (?, ?, ?)
    `).run(reportedUser.id, req.session.userId, trimmedReason || null);

    return res.status(201).json({ message: 'Meldung erfolgreich eingereicht.' });
  } catch (err) {
    console.error('[REPORT USER ERROR]', err);
    return res.status(500).json({ error: 'Serverfehler beim Erstellen der Meldung.' });
  }
});

// ─── POST UNBAN REQUEST ───────────────────────────────────────────────────────
router.post('/unban-request', (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Du musst angemeldet sein, um eine Anfrage zu stellen.' });
    }

    const { reason } = req.body;
    const trimmedReason = typeof reason === 'string' ? reason.trim() : '';

    if (!trimmedReason) {
      return res.status(400).json({ error: 'Ein Grund ist erforderlich.' });
    }

    const userRecord = db.prepare('SELECT id, is_restricted FROM users WHERE id = ?').get(req.session.userId);
    if (!userRecord) {
      return res.status(401).json({ error: 'Ungültige Session.' });
    }

    if (userRecord.is_restricted !== 1) {
      return res.status(400).json({ error: 'Du kannst keine Anfrage einreichen, wenn dein Profil nicht eingeschränkt ist.' });
    }

    db.prepare(`
      INSERT INTO restriction_requests (restricted_user_id, reason)
      VALUES (?, ?)
    `).run(userRecord.id, trimmedReason);

    return res.status(201).json({ message: 'Freigabeanfrage erfolgreich eingereicht.' });
  } catch (err) {
    console.error('[UNBAN REQUEST ERROR]', err);
    return res.status(500).json({ error: 'Serverfehler beim Erstellen der Anfrage.' });
  }
});

// ─── GET ADMIN REPORTS FOR USER ───────────────────────────────────────────────
router.get('/admin/reports/:username', (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert.' });
    }

    if (!canAccessAdminPanel(req)) {
      return res.status(403).json({ error: 'Nur Administrator*innen und Moderator*innen können Meldungen sehen.' });
    }

    const username = (req.params.username || '').trim();
    const reportedUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (!reportedUser) {
      return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
    }

    const reports = db.prepare(`
      SELECT
        r.id,
        r.reason,
        r.closed,
        r.created_at,
        u.username AS reporter_username,
        u.full_name AS reporter_full_name
      FROM reports r
      JOIN users u ON u.id = r.reporter_user_id
      WHERE r.reported_user_id = ?
      ORDER BY r.closed ASC, datetime(r.created_at) DESC
    `).all(reportedUser.id);

    return res.json({ reports });
  } catch (err) {
    console.error('[GET ADMIN REPORTS ERROR]', err);
    return res.status(500).json({ error: 'Serverfehler beim Abrufen der Meldungen.' });
  }
});

// ─── CLOSE A REPORT (ADMIN) ───────────────────────────────────────────────────
router.patch('/admin/reports/:reportId/close', (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert.' });
    }

    if (!isAdminSessionUser(req)) {
      return res.status(403).json({ error: 'Nur Administrator*innen können Fälle schließen.' });
    }

    const reportId = parseInt(req.params.reportId, 10);
    if (!Number.isInteger(reportId) || reportId <= 0) {
      return res.status(400).json({ error: 'Ungültige Meldungs-ID.' });
    }

    const report = db.prepare('SELECT id FROM reports WHERE id = ?').get(reportId);
    if (!report) {
      return res.status(404).json({ error: 'Meldung nicht gefunden.' });
    }

    db.prepare('UPDATE reports SET closed = 1 WHERE id = ?').run(reportId);

    return res.json({ message: 'Fall erfolgreich geschlossen.' });
  } catch (err) {
    console.error('[CLOSE REPORT ERROR]', err);
    return res.status(500).json({ error: 'Serverfehler beim Schließen des Falls.' });
  }
});

// ─── GET USERS WITH OPEN REPORTS (ADMIN) ─────────────────────────────────────
router.get('/admin/users/with-open-reports', (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert.' });
    }

    if (!canAccessAdminPanel(req)) {
      return res.status(403).json({ error: 'Nur Administrator*innen und Moderator*innen können Meldungen sehen.' });
    }

    const rawQuery = typeof req.query.q === 'string' ? req.query.q : '';
    const query = rawQuery.trim();

    const users = query
      ? db.prepare(`
          SELECT DISTINCT u.id, u.username, u.profile_name, u.full_name, u.email, u.avatar, u.accent_color, u.role
          FROM users u
          INNER JOIN reports r ON r.reported_user_id = u.id
          WHERE r.closed = 0
            AND u.username LIKE ? COLLATE NOCASE
          ORDER BY u.username COLLATE NOCASE ASC
        `).all(`%${query}%`)
      : db.prepare(`
          SELECT DISTINCT u.id, u.username, u.profile_name, u.full_name, u.email, u.avatar, u.accent_color, u.role
          FROM users u
          INNER JOIN reports r ON r.reported_user_id = u.id
          WHERE r.closed = 0
          ORDER BY u.username COLLATE NOCASE ASC
        `).all();

    const sanitizedUsers = users.map((user) => ({
      id: user.id,
      username: user.username,
      profile_name: user.profile_name,
      full_name: user.full_name,
      avatar: user.avatar,
      accent_color: user.accent_color,
      role: getRoleFromUserRecord(user),
      isProtected: isProtectedEmail(user.email)
    }));

    return res.json({ query, users: sanitizedUsers });
  } catch (err) {
    console.error('[ADMIN USERS WITH OPEN REPORTS ERROR]', err);
    return res.status(500).json({ error: 'Serverfehler beim Abrufen der Nutzer mit Meldungen.' });
  }
});

// ─── GET ADMIN UNBAN REQUESTS ─────────────────────────────────────────────────
router.get('/admin/unban-requests', (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert.' });
    }

    if (!canAccessAdminPanel(req)) {
      return res.status(403).json({ error: 'Nur Administrator*innen und Moderator*innen können Freigaben sehen.' });
    }

    const requests = db.prepare(`
      SELECT rr.id, rr.restricted_user_id, rr.reason, rr.created_at, rr.closed,
             u.id AS user_id, u.username, u.profile_name, u.full_name, u.avatar, u.accent_color
      FROM restriction_requests rr
      INNER JOIN users u ON rr.restricted_user_id = u.id
      WHERE rr.closed = 0
      ORDER BY rr.created_at DESC
    `).all();

    const sanitizedRequests = requests.map((req) => ({
      id: req.id,
      userId: req.user_id,
      username: req.username,
      profile_name: req.profile_name,
      full_name: req.full_name,
      avatar: req.avatar,
      accent_color: req.accent_color,
      reason: req.reason,
      createdAt: req.created_at
    }));

    return res.json({ requests: sanitizedRequests });
  } catch (err) {
    console.error('[ADMIN UNBAN REQUESTS ERROR]', err);
    return res.status(500).json({ error: 'Serverfehler beim Abrufen der Freigabeanfragen.' });
  }
});

// ─── PATCH RESOLVE UNBAN REQUEST ──────────────────────────────────────────────
router.patch('/admin/unban-requests/:id/resolve', (req, res) => {
  try {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert.' });
    }

    if (!canAccessAdminPanel(req)) {
      return res.status(403).json({ error: 'Nur Administrator*innen und Moderator*innen können Anfragen genehmigen.' });
    }

    const requestId = Number(req.params.id);
    if (!Number.isInteger(requestId) || requestId <= 0) {
      return res.status(400).json({ error: 'Ungültige Request-ID.' });
    }

    const unbanRequest = db.prepare('SELECT id, restricted_user_id, closed FROM restriction_requests WHERE id = ?').get(requestId);
    if (!unbanRequest) {
      return res.status(404).json({ error: 'Anfrage nicht gefunden.' });
    }

    if (unbanRequest.closed === 1) {
      return res.status(400).json({ error: 'Diese Anfrage wurde bereits bearbeitet.' });
    }

    // Remove restriction from user
    db.prepare('UPDATE users SET is_restricted = 0 WHERE id = ?').run(unbanRequest.restricted_user_id);

    // Mark request as resolved
    db.prepare('UPDATE restriction_requests SET closed = 1, closed_at = datetime(\'now\'), resolved_by_admin_id = ? WHERE id = ?')
      .run(req.session.userId, requestId);

    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(unbanRequest.restricted_user_id);

    return res.json({
      message: `Freigabeanfrage für @${user.username} genehmigt. Der Nutzer ist nun nicht mehr eingeschränkt.`,
      username: user.username
    });
  } catch (err) {
    console.error('[RESOLVE UNBAN REQUEST ERROR]', err);
    return res.status(500).json({ error: 'Serverfehler beim Genehmigen der Anfrage.' });
  }
});

module.exports = router;



