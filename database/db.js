// Uses Node.js built-in SQLite (available from Node 22+, no build tools needed)
const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs   = require('fs');

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

module.exports = db;
