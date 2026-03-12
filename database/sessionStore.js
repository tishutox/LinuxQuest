const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs   = require('fs');

module.exports = function createSqliteSessionStore(session) {
  const Store = session.Store;

  class SqliteStore extends Store {
    constructor(options = {}) {
      super(options);
      this.ttl = options.ttl || 7 * 24 * 60 * 60; // 7 days in seconds

      const dbDir = process.env.DATA_DIR
        ? path.join(process.env.DATA_DIR, 'database')
        : path.join(__dirname);

      if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

      this.db = new DatabaseSync(path.join(dbDir, 'sessions.db'));
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS sessions (
          sid     TEXT PRIMARY KEY,
          data    TEXT NOT NULL,
          expires INTEGER NOT NULL
        )
      `);

      // Clean up expired sessions every 15 minutes
      setInterval(() => this._cleanup(), 15 * 60 * 1000).unref();
    }

    _cleanup() {
      this.db.prepare('DELETE FROM sessions WHERE expires <= ?').run(Math.floor(Date.now() / 1000));
    }

    get(sid, cb) {
      try {
        const row = this.db.prepare('SELECT data, expires FROM sessions WHERE sid = ?').get(sid);
        if (!row) return cb(null, null);
        if (row.expires <= Math.floor(Date.now() / 1000)) {
          this.destroy(sid, () => {});
          return cb(null, null);
        }
        cb(null, JSON.parse(row.data));
      } catch (e) { cb(e); }
    }

    set(sid, session, cb) {
      try {
        const ttl     = session.cookie?.maxAge ? Math.floor(session.cookie.maxAge / 1000) : this.ttl;
        const expires = Math.floor(Date.now() / 1000) + ttl;
        const data    = JSON.stringify(session);
        this.db.prepare(
          'INSERT INTO sessions (sid, data, expires) VALUES (?, ?, ?) ON CONFLICT(sid) DO UPDATE SET data=excluded.data, expires=excluded.expires'
        ).run(sid, data, expires);
        cb(null);
      } catch (e) { cb(e); }
    }

    destroy(sid, cb) {
      try {
        this.db.prepare('DELETE FROM sessions WHERE sid = ?').run(sid);
        cb(null);
      } catch (e) { cb(e); }
    }

    touch(sid, session, cb) {
      this.set(sid, session, cb);
    }
  }

  return SqliteStore;
};
