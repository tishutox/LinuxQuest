const express = require('express');
const bcrypt  = require('bcryptjs');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');
const db      = require('../database/db');

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
const SALT_ROUNDS    = 12;

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

// ─── REGISTER ─────────────────────────────────────────────────────────────────
router.post('/register', upload.single('avatar'), async (req, res) => {
  try {
    const { username, full_name, email, password, confirm_password } = req.body;

    // ── Validation ────────────────────────────────────────────────────────────
    if (!username || !full_name || !email || !password || !confirm_password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    if (!USERNAME_REGEX.test(username)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, underscores, and hyphens.' });
    }

    if (!THA_REGEX.test(email)) {
      return res.status(400).json({ error: 'Only @tha.de email addresses are allowed.' });
    }

    if (password !== confirm_password) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // ── Uniqueness checks ─────────────────────────────────────────────────────
    const existingEmail    = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
    const existingUsername = db.prepare('SELECT id FROM users WHERE username = ?').get(username);

    if (existingEmail)    return res.status(409).json({ error: 'This email is already registered.' });
    if (existingUsername) return res.status(409).json({ error: 'This username is already taken.' });

    // ── Store avatar path (relative) or null ──────────────────────────────────
    const avatarPath = req.file ? 'uploads/' + req.file.filename : null;

    // ── Hash & insert ─────────────────────────────────────────────────────────
    const hashed = await bcrypt.hash(password, SALT_ROUNDS);

    const info = db.prepare(`
      INSERT INTO users (username, full_name, email, password, avatar, last_active_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `).run(username.trim(), full_name.trim(), email.toLowerCase().trim(), hashed, avatarPath);

    // ── Start session ─────────────────────────────────────────────────────────
    req.session.userId = info.lastInsertRowid;

    const user = db.prepare('SELECT id, username, full_name, email, avatar, created_at FROM users WHERE id = ?')
                   .get(info.lastInsertRowid);

    return res.status(201).json({ message: 'Account created successfully!', user });

  } catch (err) {
    console.error('[REGISTER ERROR]', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ─── LOGIN ────────────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { identifier, password } = req.body;   // identifier = email OR username

    if (!identifier || !password) {
      return res.status(400).json({ error: 'Please fill in all fields.' });
    }

    // Try to find by email first, then by username
    const user = db.prepare(
      'SELECT * FROM users WHERE email = ? OR username = ?'
    ).get(identifier.trim(), identifier.trim());

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ error: 'Invalid credentials.' });
    }

    touchUserActivity(user.id);

    req.session.userId = user.id;

    return res.json({
      message: 'Logged in successfully!',
      user: {
        id:         user.id,
        username:   user.username,
        full_name:  user.full_name,
        email:      user.email,
        avatar:     user.avatar,
        created_at: user.created_at
      }
    });

  } catch (err) {
    console.error('[LOGIN ERROR]', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ─── LOGOUT ───────────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ message: 'Logged out.' }));
});

// ─── SESSION CHECK ────────────────────────────────────────────────────────────
router.get('/me', (req, res) => {
  if (!req.session.userId) return res.status(401).json({ error: 'Not authenticated.' });

  const user = db.prepare(
    'SELECT id, username, full_name, email, avatar, created_at FROM users WHERE id = ?'
  ).get(req.session.userId);

  if (!user) return res.status(401).json({ error: 'User not found.' });

  touchUserActivity(req.session.userId);

  // Check if username is valid; if not, frontend should show change modal
  const isValidUsername = USERNAME_REGEX.test(user.username);

  return res.json({ user, needsUsernameUpdate: !isValidUsername });
});

// ─── UPDATE USERNAME ──────────────────────────────────────────────────────────
router.post('/update-username', (req, res) => {
  try {
    const { newUsername } = req.body;

    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    if (!newUsername || !USERNAME_REGEX.test(newUsername)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, underscores, and hyphens.' });
    }

    // Check if username is already taken
    const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?')
                       .get(newUsername, req.session.userId);
    if (existing) {
      return res.status(409).json({ error: 'This username is already taken.' });
    }

    db.prepare("UPDATE users SET username = ?, last_active_at = datetime('now') WHERE id = ?")
      .run(newUsername, req.session.userId);

    const user = db.prepare('SELECT id, username, full_name, email, avatar, created_at FROM users WHERE id = ?')
                   .get(req.session.userId);

    return res.json({ message: 'Username updated!', user });
  } catch (err) {
    console.error('[UPDATE USERNAME ERROR]', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─── UPDATE AVATAR ────────────────────────────────────────────────────────────
router.post('/update-avatar', upload.single('avatar'), (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Please choose an image file.' });
    }

    const currentUser = db.prepare('SELECT avatar FROM users WHERE id = ?')
                          .get(req.session.userId);

    if (!currentUser) {
      deleteOldAvatar('uploads/' + req.file.filename);
      return res.status(404).json({ error: 'User not found.' });
    }

    const newAvatarPath = 'uploads/' + req.file.filename;

    db.prepare("UPDATE users SET avatar = ?, last_active_at = datetime('now') WHERE id = ?")
      .run(newAvatarPath, req.session.userId);

    deleteOldAvatar(currentUser.avatar);

    const user = db.prepare('SELECT id, username, full_name, email, avatar, created_at FROM users WHERE id = ?')
                   .get(req.session.userId);

    return res.json({ message: 'Profile picture updated!', user });
  } catch (err) {
    console.error('[UPDATE AVATAR ERROR]', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─── UPDATE PROFILE (NAME + USERNAME) ───────────────────────────────────────
router.post('/update-profile', (req, res) => {
  try {
    const { full_name, username } = req.body;

    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    if (!full_name || !username) {
      return res.status(400).json({ error: 'Full name and username are required.' });
    }

    const trimmedName = full_name.trim();
    const trimmedUsername = username.trim();

    if (!trimmedName) {
      return res.status(400).json({ error: 'Full name is required.' });
    }

    if (!USERNAME_REGEX.test(trimmedUsername)) {
      return res.status(400).json({ error: 'Username can only contain letters, numbers, underscores, and hyphens.' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?')
                       .get(trimmedUsername, req.session.userId);

    if (existing) {
      return res.status(409).json({ error: 'This username is already taken.' });
    }

    db.prepare("UPDATE users SET full_name = ?, username = ?, last_active_at = datetime('now') WHERE id = ?")
      .run(trimmedName, trimmedUsername, req.session.userId);

    const user = db.prepare('SELECT id, username, full_name, email, avatar, created_at FROM users WHERE id = ?')
                   .get(req.session.userId);

    return res.json({ message: 'Profile updated!', user });
  } catch (err) {
    console.error('[UPDATE PROFILE ERROR]', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─── DELETE ACCOUNT ───────────────────────────────────────────────────────────
router.delete('/delete-account', async (req, res) => {
  try {
    const { password } = req.body;

    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated.' });
    }

    if (!password) {
      return res.status(400).json({ error: 'Password is required.' });
    }

    const user = db.prepare('SELECT avatar, password FROM users WHERE id = ?')
                   .get(req.session.userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Incorrect password.' });
    }

    db.prepare('DELETE FROM users WHERE id = ?')
      .run(req.session.userId);

    deleteOldAvatar(user.avatar);

    req.session.destroy((err) => {
      if (err) {
        console.error('[DELETE ACCOUNT SESSION ERROR]', err);
        return res.status(500).json({ error: 'Account deleted, but session cleanup failed.' });
      }

      return res.json({ message: 'Account deleted successfully.' });
    });
  } catch (err) {
    console.error('[DELETE ACCOUNT ERROR]', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─── RESET PASSWORD ───────────────────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { identifier, newPassword, confirmPassword } = req.body;

    if (!identifier || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Find user by email or username
    const user = db.prepare(
      'SELECT id FROM users WHERE email = ? OR username = ?'
    ).get(identifier.toLowerCase().trim(), identifier.trim());

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Hash and update password
    const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
    db.prepare("UPDATE users SET password = ?, last_active_at = datetime('now') WHERE id = ?")
      .run(hashed, user.id);

    return res.json({ message: 'Password reset successfully! You can now log in with your new password.' });
  } catch (err) {
    console.error('[RESET PASSWORD ERROR]', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
