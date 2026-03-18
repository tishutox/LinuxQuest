require('dotenv').config();
const express  = require('express');
const session  = require('express-session');
const cors     = require('cors');
const path     = require('path');
const createSqliteStore = require('./database/sessionStore');
const { verifyMailTransport, getMailConfig } = require('./services/mailer');

const SqliteStore = createSqliteStore(session);
const authRoutes  = require('./routes/auth');

const app  = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ limit: '25mb', extended: true }));

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

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

app.get('/@:username', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

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
