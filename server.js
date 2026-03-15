require('dotenv').config();
const express  = require('express');
const session  = require('express-session');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');
const createSqliteStore = require('./database/sessionStore');
const db       = require('./database/db');
const { verifyMailTransport, getMailConfig } = require('./services/mailer');
const { PROTECTED_EMAILS } = require('./protectedUsers');

const SqliteStore = createSqliteStore(session);
const authRoutes  = require('./routes/auth');

const app  = express();
const PORT = process.env.PORT || 3000;
const INACTIVE_DAYS = 0;
const CLEANUP_INTERVAL_MS = 30 * 1000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ─── Session ──────────────────────────────────────────────────────────────────
app.use(session({
  store:             new SqliteStore(),
  secret:            process.env.SESSION_SECRET || 'tha-secret-key-change-in-production',
  resave:            false,
  saveUninitialized: false,
  cookie: {
    secure:   false,      // set true if using HTTPS
    httpOnly: true,
    maxAge:   7 * 24 * 60 * 60 * 1000  // 7 days
  }
}));

// ─── Static files ─────────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname)));          // serves index.html, assets/

// Uploads: use persistent volume path if set (Railway), else local folder
const uploadsDir = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'uploads')
  : path.join(__dirname, 'uploads');
app.use('/uploads', express.static(uploadsDir));

function deleteAvatarFile(avatarPath) {
  if (!avatarPath || !avatarPath.startsWith('uploads/')) return;

  const avatarFileName = path.basename(avatarPath);
  const avatarFilePath = path.join(uploadsDir, avatarFileName);

  try {
    if (fs.existsSync(avatarFilePath)) {
      fs.unlinkSync(avatarFilePath);
    }
  } catch (err) {
    console.error('[CLEANUP AVATAR DELETE ERROR]', err);
  }
}

function cleanupInactiveAccounts() {
  try {
    db.exec(`DELETE FROM email_verifications WHERE datetime(expires_at) < datetime('now')`);
    db.exec(`DELETE FROM password_reset_verifications WHERE datetime(expires_at) < datetime('now')`);

    const inactiveUsers = INACTIVE_DAYS === 0
      ? db.prepare(`
          SELECT id, avatar FROM users
          WHERE email NOT IN (${PROTECTED_EMAILS.map(() => '?').join(', ')})
        `).all(...PROTECTED_EMAILS)
      : db.prepare(`
          SELECT id, avatar FROM users
          WHERE datetime(COALESCE(last_active_at, created_at)) <= datetime('now', ?)
            AND email NOT IN (${PROTECTED_EMAILS.map(() => '?').join(', ')})
        `).all(`-${INACTIVE_DAYS} days`, ...PROTECTED_EMAILS);

    if (!inactiveUsers.length) return;

    const deleteUserById = db.prepare('DELETE FROM users WHERE id = ?');
    const deleteUsersTransaction = db.transaction((users) => {
      for (const user of users) {
        deleteUserById.run(user.id);
        deleteAvatarFile(user.avatar);
      }
    });

    deleteUsersTransaction(inactiveUsers);
    console.log(`[CLEANUP] Deleted ${inactiveUsers.length} inactive account(s).`);
  } catch (err) {
    console.error('[INACTIVE ACCOUNT CLEANUP ERROR]', err);
  }
}

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

app.get('/@:username', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

cleanupInactiveAccounts();
const cleanupTimer = setInterval(cleanupInactiveAccounts, CLEANUP_INTERVAL_MS);
cleanupTimer.unref();

async function logMailStatus() {
  const mailConfig = getMailConfig();

  if (!mailConfig.isConfigured) {
    if (mailConfig.allowConsoleFallback) {
      console.warn('[MAILER] Email delivery is not fully configured. Verification codes will only be logged on the server.');
    } else {
      console.error('[MAILER] Email delivery is not configured for this deployment. Email verification will fail until RESEND_* or SMTP_* variables are set.');
    }
    return;
  }

  const result = await verifyMailTransport();
  if (result.ok) {
    console.log(`[MAILER] ${result.provider === 'resend' ? 'Resend' : 'SMTP'} connection verified successfully.`);
    return;
  }

  const error = result.error;
  console.error('[MAILER] Email provider verification failed.', {
    code: error?.code || error?.responseCode || null,
    message: error?.message || 'Unknown email provider error',
    response: error?.response || null
  });
}

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  logMailStatus().catch((error) => {
    console.error('[MAILER] Unexpected verification error.', error);
  });
});
