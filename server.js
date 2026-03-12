const express  = require('express');
const session  = require('express-session');
const cors     = require('cors');
const path     = require('path');
const createSqliteStore = require('./database/sessionStore');

const SqliteStore = createSqliteStore(session);
const authRoutes  = require('./routes/auth');

const app  = express();
const PORT = process.env.PORT || 3000;

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

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
