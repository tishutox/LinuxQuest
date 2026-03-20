require('dotenv').config();
const express  = require('express');
const session  = require('express-session');
const cors     = require('cors');
const helmet   = require('helmet');
const rateLimit = require('express-rate-limit');
const path     = require('path');
const createSqliteStore = require('./database/sessionStore');
const { verifyMailTransport, getMailConfig } = require('./services/mailer');

const SqliteStore = createSqliteStore(session);
const authRoutes  = require('./routes/auth');

const app  = express();
const PORT = process.env.PORT || 3000;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function normalizeOrigin(originValue) {
  if (typeof originValue !== 'string') return null;
  const trimmed = originValue.trim();
  if (!trimmed) return null;
  try {
    return new URL(trimmed).origin;
  } catch (_err) {
    return null;
  }
}

function getAllowedOrigins() {
  const configuredValues = [
    process.env.CORS_ORIGIN,
    process.env.CORS_ORIGINS,
    process.env.FRONTEND_ORIGIN,
    process.env.APP_ORIGIN
  ]
    .filter((value) => typeof value === 'string' && value.trim().length > 0)
    .flatMap((value) => value.split(','))
    .map((value) => normalizeOrigin(value))
    .filter(Boolean);

  if (!IS_PRODUCTION) {
    configuredValues.push('http://localhost:3000', 'http://127.0.0.1:3000');
  }

  return new Set(configuredValues);
}

const allowedOrigins = getAllowedOrigins();

const corsOptions = {
  credentials: true,
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  origin(origin, callback) {
    if (!origin) return callback(null, true);

    const normalizedOrigin = normalizeOrigin(origin);
    if (!normalizedOrigin) return callback(null, false);

    if (allowedOrigins.size === 0) {
      return callback(null, !IS_PRODUCTION);
    }

    return callback(null, allowedOrigins.has(normalizedOrigin));
  }
};

function enforceSameOriginWrites(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const originHeader = normalizeOrigin(req.get('origin'));
  const refererOrigin = normalizeOrigin(req.get('referer'));
  const requestOrigin = originHeader || refererOrigin;

  if (!requestOrigin) return next();

  if (allowedOrigins.size === 0) {
    const requestHost = new URL(requestOrigin).host;
    const currentHost = req.get('host');
    if (!currentHost || requestHost !== currentHost) {
      return res.status(403).json({ error: 'Anfrage von dieser Origin ist nicht erlaubt.' });
    }
    return next();
  }

  if (!allowedOrigins.has(requestOrigin)) {
    return res.status(403).json({ error: 'Anfrage von dieser Origin ist nicht erlaubt.' });
  }

  next();
}

function getSessionSecret() {
  const sessionSecret = typeof process.env.SESSION_SECRET === 'string'
    ? process.env.SESSION_SECRET.trim()
    : '';

  if (sessionSecret.length >= 32) {
    return sessionSecret;
  }

  if (IS_PRODUCTION) {
    throw new Error('SESSION_SECRET muss in Produktion gesetzt sein und mindestens 32 Zeichen haben.');
  }

  console.warn('[SECURITY] SESSION_SECRET ist nicht ausreichend gesetzt. Verwende nur lokal ein Development-Secret.');
  return 'dev-only-session-secret-change-me-please-32chars';
}

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.API_RATE_LIMIT_MAX) || 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Zu viele Anfragen. Bitte versuche es in einigen Minuten erneut.' }
});

const authWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_WRITE_RATE_LIMIT_MAX) || 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => SAFE_METHODS.has(req.method),
  message: { error: 'Zu viele Schreibanfragen. Bitte warte kurz und versuche es erneut.' }
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(cors(corsOptions));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ limit: '1mb', extended: true }));
app.use('/api', apiLimiter);

// ─── Session ──────────────────────────────────────────────────────────────────
app.use(session({
  name:              'lq.sid',
  store:             new SqliteStore(),
  secret:            getSessionSecret(),
  resave:            false,
  saveUninitialized: false,
  proxy:             IS_PRODUCTION,
  cookie: {
    secure:   IS_PRODUCTION,
    httpOnly: true,
    sameSite: 'lax',
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
app.use('/api/auth', enforceSameOriginWrites, authWriteLimiter, authRoutes);

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
