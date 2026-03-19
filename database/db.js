// Uses Node.js built-in SQLite (available from Node 22+, no build tools needed)
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs   = require('fs');
const { PROTECTED_EMAILS } = require('../protectedUsers');

// DATA_DIR can be set to a Railway persistent volume path (e.g. /data)
const dbDir = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'database')
  : path.join(__dirname);

if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const db = new DatabaseSync(path.join(dbDir, 'users.db'));

// Enable WAL mode for better performance
db.exec("PRAGMA journal_mode = WAL");
db.exec("PRAGMA foreign_keys = ON");

// Create users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    profile_name TEXT   DEFAULT NULL,
    pronouns    TEXT    DEFAULT NULL,
    bio         TEXT    DEFAULT NULL,
    full_name   TEXT    NOT NULL,
    email       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    password    TEXT    NOT NULL,
    avatar      TEXT    DEFAULT NULL,
    birth_date  TEXT    DEFAULT NULL,
    belief      TEXT    DEFAULT NULL,
    confession  TEXT    DEFAULT NULL,
    accent_color TEXT   DEFAULT NULL,
    early_supporter INTEGER DEFAULT 0,
    created_at  TEXT    DEFAULT (datetime('now')),
    last_active_at TEXT DEFAULT (datetime('now'))
  )
`);

const userColumns = db.prepare("PRAGMA table_info(users)").all();
const hasLastActiveColumn = userColumns.some((column) => column.name === 'last_active_at');
const hasAccentColorColumn = userColumns.some((column) => column.name === 'accent_color');
const hasProfileNameColumn = userColumns.some((column) => column.name === 'profile_name');
const hasPronounsColumn = userColumns.some((column) => column.name === 'pronouns');
const hasBioColumn = userColumns.some((column) => column.name === 'bio');
const hasBirthDateColumn = userColumns.some((column) => column.name === 'birth_date');
const hasBeliefColumn = userColumns.some((column) => column.name === 'belief');
const hasConfessionColumn = userColumns.some((column) => column.name === 'confession');
const hasEarlySupporterColumn = userColumns.some((column) => column.name === 'early_supporter');
const hasRoleColumn = userColumns.some((column) => column.name === 'role');
const hasIsRestrictedColumn = userColumns.some((column) => column.name === 'is_restricted');
const hasIsDeveloperColumn = userColumns.some((column) => column.name === 'is_developer');

if (!hasLastActiveColumn) {
  db.exec('ALTER TABLE users ADD COLUMN last_active_at TEXT');
}

if (!hasAccentColorColumn) {
  db.exec('ALTER TABLE users ADD COLUMN accent_color TEXT');
}

if (!hasProfileNameColumn) {
  db.exec('ALTER TABLE users ADD COLUMN profile_name TEXT');
}

if (!hasPronounsColumn) {
  db.exec('ALTER TABLE users ADD COLUMN pronouns TEXT');
}

if (!hasBioColumn) {
  db.exec('ALTER TABLE users ADD COLUMN bio TEXT');
}

if (!hasBirthDateColumn) {
  db.exec('ALTER TABLE users ADD COLUMN birth_date TEXT');
}

if (!hasBeliefColumn) {
  db.exec('ALTER TABLE users ADD COLUMN belief TEXT');
}

if (!hasConfessionColumn) {
  db.exec('ALTER TABLE users ADD COLUMN confession TEXT');
}

if (!hasEarlySupporterColumn) {
  db.exec('ALTER TABLE users ADD COLUMN early_supporter INTEGER DEFAULT 0');
}

if (!hasRoleColumn) {
  db.exec("ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'user'");
}

if (!hasIsRestrictedColumn) {
  db.exec('ALTER TABLE users ADD COLUMN is_restricted INTEGER NOT NULL DEFAULT 0');
}

if (!hasIsDeveloperColumn) {
  db.exec('ALTER TABLE users ADD COLUMN is_developer INTEGER NOT NULL DEFAULT 0');
}

db.exec(`
  UPDATE users
  SET role = CASE
    WHEN LOWER(COALESCE(role, '')) IN ('user', 'moderator', 'administrator') THEN LOWER(role)
    ELSE 'user'
  END
`);

db.exec(`
  UPDATE users
  SET is_developer = CASE
    WHEN COALESCE(is_developer, 0) = 1 THEN 1
    ELSE 0
  END
`);

if (Array.isArray(PROTECTED_EMAILS) && PROTECTED_EMAILS.length) {
  const normalizedProtectedEmails = PROTECTED_EMAILS.map((email) => String(email).trim().toLowerCase());
  const placeholders = normalizedProtectedEmails.map(() => '?').join(', ');
  db.prepare(`
    UPDATE users
    SET role = 'administrator'
    WHERE LOWER(email) IN (${placeholders})
  `).run(...normalizedProtectedEmails);
}

db.exec(`
  UPDATE users
  SET last_active_at = COALESCE(last_active_at, created_at, datetime('now'))
`);

db.exec(`
  UPDATE users
  SET early_supporter = 1
  WHERE COALESCE(early_supporter, 0) = 0
    AND datetime(created_at) < datetime('2026-06-18 00:00:00')
`);

// Email verification codes (for registration)
db.exec(`
  CREATE TABLE IF NOT EXISTS email_verifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    email      TEXT    NOT NULL,
    code       TEXT    NOT NULL,
    expires_at TEXT    NOT NULL,
    created_at TEXT    DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS password_reset_verifications (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    email      TEXT    NOT NULL,
    code       TEXT    NOT NULL,
    expires_at TEXT    NOT NULL,
    created_at TEXT    DEFAULT (datetime('now'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS follows (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    follower_id   INTEGER NOT NULL,
    following_id  INTEGER NOT NULL,
    created_at    TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (follower_id, following_id),
    CHECK (follower_id <> following_id)
  )
`);

db.exec('CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id)');
db.exec('CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id)');

db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    reported_user_id INTEGER NOT NULL,
    reporter_user_id INTEGER NOT NULL,
    reason           TEXT DEFAULT NULL,
    created_at       TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reporter_user_id) REFERENCES users(id) ON DELETE CASCADE,
    CHECK (reported_user_id <> reporter_user_id)
  )
`);

db.exec('CREATE INDEX IF NOT EXISTS idx_reports_reported_user_id ON reports(reported_user_id)');
db.exec('CREATE INDEX IF NOT EXISTS idx_reports_reporter_user_id ON reports(reporter_user_id)');

// Migration: add closed column if it does not exist yet
try {
  db.exec('ALTER TABLE reports ADD COLUMN closed INTEGER NOT NULL DEFAULT 0');
} catch (_) { /* column already exists */ }

db.exec(`
  CREATE TABLE IF NOT EXISTS restriction_requests (
    id                   INTEGER PRIMARY KEY AUTOINCREMENT,
    restricted_user_id   INTEGER NOT NULL,
    reason               TEXT DEFAULT NULL,
    created_at           TEXT DEFAULT (datetime('now')),
    closed               INTEGER NOT NULL DEFAULT 0,
    closed_at            TEXT DEFAULT NULL,
    resolved_by_admin_id INTEGER DEFAULT NULL,
    FOREIGN KEY (restricted_user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (resolved_by_admin_id) REFERENCES users(id) ON DELETE SET NULL
  )
`);

db.exec('CREATE INDEX IF NOT EXISTS idx_restriction_requests_user_id ON restriction_requests(restricted_user_id)');
db.exec('CREATE INDEX IF NOT EXISTS idx_restriction_requests_closed ON restriction_requests(closed)');

db.exec(`
  CREATE TABLE IF NOT EXISTS bug_reports (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    reported_user_id INTEGER NOT NULL,
    description      TEXT NOT NULL,
    closed           INTEGER NOT NULL DEFAULT 0,
    created_at       TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE CASCADE
  )
`);

db.exec('CREATE INDEX IF NOT EXISTS idx_bug_reports_user_id ON bug_reports(reported_user_id)');
db.exec('CREATE INDEX IF NOT EXISTS idx_bug_reports_closed ON bug_reports(closed)');

module.exports = db;
