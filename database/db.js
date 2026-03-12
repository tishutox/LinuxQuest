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

// Create users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    username    TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    full_name   TEXT    NOT NULL,
    email       TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    password    TEXT    NOT NULL,
    avatar      TEXT    DEFAULT NULL,
    created_at  TEXT    DEFAULT (datetime('now'))
  )
`);

module.exports = db;
