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
    full_name   TEXT    NOT NULL,
    email       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    password    TEXT    NOT NULL,
    avatar      TEXT    DEFAULT NULL,
    accent_color TEXT   DEFAULT NULL,
    created_at  TEXT    DEFAULT (datetime('now')),
    last_active_at TEXT DEFAULT (datetime('now'))
  )
`);

const userColumns = db.prepare("PRAGMA table_info(users)").all();
const hasLastActiveColumn = userColumns.some((column) => column.name === 'last_active_at');
const hasAccentColorColumn = userColumns.some((column) => column.name === 'accent_color');

if (!hasLastActiveColumn) {
  db.exec('ALTER TABLE users ADD COLUMN last_active_at TEXT');
}

if (!hasAccentColorColumn) {
  db.exec('ALTER TABLE users ADD COLUMN accent_color TEXT');
}

db.exec(`
  UPDATE users
  SET last_active_at = COALESCE(last_active_at, created_at, datetime('now'))
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

module.exports = db;
