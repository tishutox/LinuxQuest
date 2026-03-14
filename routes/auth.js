const express    = require('express');
const bcrypt     = require('bcryptjs');
const multer     = require('multer');
const path       = require('path');
const fs         = require('fs');
const db         = require('../database/db');
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

// ─── Helper ───────────────────────────────────────────────────────────────────
const THA_REGEX      = /^[^\s@]+@tha\.de$/i;
const USERNAME_REGEX = /^[a-zA-Z0-9_-]+$/;  // Only letters, numbers, underscore, hyphen
const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;
const SALT_ROUNDS    = 12;
const VERIFY_IP_WINDOW_MS = 10 * 60 * 1000;
const VERIFY_IP_MAX_REQUESTS = 6;
const verificationIpRequests = new Map();

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
    SELECT id, username, profile_name, full_name, email, avatar, accent_color, created_at
    FROM users
    WHERE email = ?
  `).get(normalizeEmail(email));
}

function normalizeAccentColor(colorValue) {
  if (typeof colorValue !== 'string') return null;
  const trimmedColor = colorValue.trim();
  if (!trimmedColor) return null;
  if (!HEX_COLOR_REGEX.test(trimmedColor)) return null;
  return trimmedColor.toUpperCase();
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
    if (trimmedProfileName.length > 60) {
      return res.status(400).json({ error: 'Der Profilname darf maximal 60 Zeichen lang sein.' });
    }

    const normalizedProfileName = trimmedProfileName || null;

    // ── Store avatar path (relative) or null ──────────────────────────────────
    const avatarPath = req.file ? 'uploads/' + req.file.filename : null;

    // ── Hash & insert ─────────────────────────────────────────────────────────
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    const info = db.prepare(`
      INSERT INTO users (username, profile_name, full_name, email, password, avatar, last_active_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `).run(username.trim(), normalizedProfileName, full_name.trim(), normalizeEmail(email), hashed, avatarPath);

    // ── Start session ─────────────────────────────────────────────────────────
    req.session.userId = info.lastInsertRowid;

    db.prepare('DELETE FROM email_verifications WHERE email = ?').run(normalizeEmail(email));

    const user = db.prepare('SELECT id, username, profile_name, full_name, email, avatar, accent_color, created_at FROM users WHERE id = ?')
                   .get(info.lastInsertRowid);

    return res.status(201).json({ message: 'Konto erfolgreich erstellt!', user });

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

    req.session.userId = user.id;

    return res.json({
      message: 'Erfolgreich angemeldet!',
      user: {
        id:         user.id,
        username:   user.username,
        profile_name: user.profile_name,
        full_name:  user.full_name,
        email:      user.email,
        avatar:     user.avatar,
        accent_color: user.accent_color,
        created_at: user.created_at
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
    'SELECT id, username, profile_name, full_name, email, avatar, accent_color, created_at FROM users WHERE id = ?'
  ).get(req.session.userId);

  if (!user) return res.status(401).json({ error: 'Benutzer nicht gefunden.' });

  touchUserActivity(req.session.userId);

  // Check if username is valid; if not, frontend should show change modal
  const isValidUsername = USERNAME_REGEX.test(user.username);

  return res.json({ user, needsUsernameUpdate: !isValidUsername });
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

router.get('/public/:username', (req, res) => {
  try {
    const username = req.params.username?.trim();

    if (!username || !USERNAME_REGEX.test(username)) {
      return res.status(400).json({ error: 'Ungültiger Benutzername.' });
    }

    const user = db.prepare(`
      SELECT id, username, profile_name, full_name, email, avatar, accent_color, created_at
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
      user,
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

    // Check if username is already taken
    const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?')
                       .get(newUsername, req.session.userId);
    if (existing) {
      return res.status(409).json({ error: 'Dieser Benutzername ist bereits vergeben.' });
    }

    db.prepare("UPDATE users SET username = ?, last_active_at = datetime('now') WHERE id = ?")
      .run(newUsername, req.session.userId);

    const user = db.prepare('SELECT id, username, profile_name, full_name, email, avatar, accent_color, created_at FROM users WHERE id = ?')
                   .get(req.session.userId);

    return res.json({ message: 'Benutzername aktualisiert!', user });
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

    const user = db.prepare('SELECT id, username, profile_name, full_name, email, avatar, accent_color, created_at FROM users WHERE id = ?')
                   .get(req.session.userId);

    return res.json({ message: 'Profilbild aktualisiert!', user });
  } catch (err) {
    console.error('[UPDATE AVATAR ERROR]', err);
    return res.status(500).json({ error: 'Serverfehler.' });
  }
});

// ─── UPDATE PROFILE (NAME + USERNAME) ───────────────────────────────────────
router.post('/update-profile', (req, res) => {
  try {
    const { full_name, profile_name, username, accent_color } = req.body;

    if (!req.session.userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert.' });
    }

    if (!full_name || !username) {
      return res.status(400).json({ error: 'Vollständiger Name und Benutzername sind erforderlich.' });
    }

    const trimmedName = full_name.trim();
    const trimmedProfileName = typeof profile_name === 'string' ? profile_name.trim() : '';
    const trimmedUsername = username.trim();

    if (!trimmedName) {
      return res.status(400).json({ error: 'Vollständiger Name ist erforderlich.' });
    }

    if (trimmedProfileName.length > 60) {
      return res.status(400).json({ error: 'Der Profilname darf maximal 60 Zeichen lang sein.' });
    }

    if (!USERNAME_REGEX.test(trimmedUsername)) {
      return res.status(400).json({ error: 'Der Benutzername darf nur Buchstaben, Zahlen, Unterstriche und Bindestriche enthalten.' });
    }

    const normalizedAccentColor = normalizeAccentColor(accent_color);
    if (typeof accent_color === 'string' && accent_color.trim() && !normalizedAccentColor) {
      return res.status(400).json({ error: 'Die Profilfarbe muss ein gültiger Hex-Farbwert sein (z. B. #352C59).' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?')
                       .get(trimmedUsername, req.session.userId);

    if (existing) {
      return res.status(409).json({ error: 'Dieser Benutzername ist bereits vergeben.' });
    }

    db.prepare("UPDATE users SET full_name = ?, profile_name = ?, username = ?, accent_color = ?, last_active_at = datetime('now') WHERE id = ?")
      .run(trimmedName, trimmedProfileName || null, trimmedUsername, normalizedAccentColor, req.session.userId);

    const user = db.prepare('SELECT id, username, profile_name, full_name, email, avatar, accent_color, created_at FROM users WHERE id = ?')
                   .get(req.session.userId);

    return res.json({ message: 'Profil aktualisiert!', user });
  } catch (err) {
    console.error('[UPDATE PROFILE ERROR]', err);
    return res.status(500).json({ error: 'Serverfehler.' });
  }
});

// ─── DELETE ACCOUNT ───────────────────────────────────────────────────────────
router.delete('/delete-account', async (req, res) => {
  try {
    const { password } = req.body;

    if (!req.session.userId) {
      return res.status(401).json({ error: 'Nicht authentifiziert.' });
    }

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

module.exports = router;



