const express = require('express');

function createAuthAdminRouter({
  db,
  isProtectedEmail,
  filterDisallowedUsers,
  getRoleFromUserRecord,
  getSessionUserRole,
  isAdminSessionUser,
  canAccessAdminPanel,
  USER_ROLES,
  deleteOldAvatar
}) {
  const router = express.Router();

  router.get('/users', (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Nicht authentifiziert.' });
      }

      if (!canAccessAdminPanel(req)) {
        return res.status(403).json({ error: 'Kein Zugriff auf den Admin-Bereich.' });
      }

      const rawQuery = typeof req.query.q === 'string' ? req.query.q : '';
      const query = rawQuery.trim();

      const users = query
        ? db.prepare(`
            SELECT id, username, profile_name, full_name, email, avatar, accent_color, role, is_restricted, is_developer
            FROM users
            WHERE username LIKE ? COLLATE NOCASE
            ORDER BY username COLLATE NOCASE ASC
          `).all(`%${query}%`)
        : db.prepare(`
            SELECT id, username, profile_name, full_name, email, avatar, accent_color, role, is_restricted, is_developer
            FROM users
            ORDER BY username COLLATE NOCASE ASC
          `).all();

      const visibleUsers = filterDisallowedUsers(users);

      const sanitizedUsers = visibleUsers.map((user) => ({
        id: user.id,
        username: user.username,
        profile_name: user.profile_name,
        full_name: user.full_name,
        avatar: user.avatar,
        accent_color: user.accent_color,
        role: getRoleFromUserRecord(user),
        isProtected: isProtectedEmail(user.email),
        isRestricted: user.is_restricted === 1,
        isDeveloper: user.is_developer === 1
      }));

      return res.json({ query, users: sanitizedUsers });
    } catch (err) {
      console.error('[ADMIN USER LIST ERROR]', err);
      return res.status(500).json({ error: 'Admin-Userliste konnte nicht geladen werden.' });
    }
  });

  router.delete('/users/:username', (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Nicht authentifiziert.' });
      }

      if (!isAdminSessionUser(req)) {
        return res.status(403).json({ error: 'Kein Zugriff auf den Admin-Bereich.' });
      }

      const username = typeof req.params.username === 'string' ? req.params.username.trim() : '';
      if (!username) {
        return res.status(400).json({ error: 'Ungültiger Benutzername.' });
      }

      const usersToDelete = db.prepare(`
        SELECT id, username, email, avatar
        FROM users
        WHERE username = ? COLLATE NOCASE
      `).all(username);

      const hasProtectedUser = usersToDelete.some((user) => isProtectedEmail(user.email));
      if (hasProtectedUser) {
        return res.status(403).json({ error: 'Dieser Nutzer ist geschützt und kann nicht gelöscht werden.' });
      }

      if (!usersToDelete.length) {
        return res.json({ message: `Nutzer @${username} war bereits entfernt.` });
      }

      const deleteEmailVerificationsByEmail = db.prepare('DELETE FROM email_verifications WHERE LOWER(email) = LOWER(?)');
      const deletePasswordResetByEmail = db.prepare('DELETE FROM password_reset_verifications WHERE LOWER(email) = LOWER(?)');
      const deleteUserFollows = db.prepare('DELETE FROM follows WHERE follower_id = ? OR following_id = ?');
      const deleteUserById = db.prepare('DELETE FROM users WHERE id = ?');

      db.exec('BEGIN');
      try {
        usersToDelete.forEach((user) => {
          if (user.email) {
            deleteEmailVerificationsByEmail.run(user.email);
            deletePasswordResetByEmail.run(user.email);
          }
          deleteUserFollows.run(user.id, user.id);
          deleteUserById.run(user.id);
        });
        db.exec('COMMIT');
      } catch (txErr) {
        db.exec('ROLLBACK');
        throw txErr;
      }
      usersToDelete.forEach((user) => deleteOldAvatar(user.avatar));

      return res.json({ message: `Nutzer @${usersToDelete[0].username} wurde gelöscht.` });
    } catch (err) {
      console.error('[ADMIN DELETE USER ERROR]', err);
      return res.status(500).json({ error: 'Nutzer konnte nicht gelöscht werden.' });
    }
  });

  router.patch('/users/:username/moderator-toggle', (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Nicht authentifiziert.' });
      }

      if (!isAdminSessionUser(req)) {
        return res.status(403).json({ error: 'Nur Administrator*innen können Rollen ändern.' });
      }

      const username = typeof req.params.username === 'string' ? req.params.username.trim() : '';
      if (!username) {
        return res.status(400).json({ error: 'Ungültiger Benutzername.' });
      }

      const targetUser = db.prepare(`
        SELECT id, username, email, role
        FROM users
        WHERE username = ? COLLATE NOCASE
      `).get(username);

      if (!targetUser) {
        return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
      }

      const targetRole = getRoleFromUserRecord(targetUser);
      if (targetRole === USER_ROLES.ADMINISTRATOR) {
        return res.status(403).json({ error: 'Administrator*innen können nicht zur Moderatorrolle geändert werden.' });
      }

      const nextRole = targetRole === USER_ROLES.MODERATOR ? USER_ROLES.USER : USER_ROLES.MODERATOR;

      db.prepare('UPDATE users SET role = ? WHERE id = ?').run(nextRole, targetUser.id);

      return res.json({
        message: nextRole === USER_ROLES.MODERATOR
          ? `@${targetUser.username} wurde zu Moderator*in befördert.`
          : `@${targetUser.username} wurde zur Nutzerrolle zurückgestuft.`,
        role: nextRole,
        username: targetUser.username
      });
    } catch (err) {
      console.error('[ADMIN TOGGLE MODERATOR ERROR]', err);
      return res.status(500).json({ error: 'Rolle konnte nicht geändert werden.' });
    }
  });

  router.patch('/users/:username/developer-toggle', (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Nicht authentifiziert.' });
      }

      if (!isAdminSessionUser(req)) {
        return res.status(403).json({ error: 'Nur Administrator*innen können den Entwicklerstatus ändern.' });
      }

      const username = typeof req.params.username === 'string' ? req.params.username.trim() : '';
      if (!username) {
        return res.status(400).json({ error: 'Ungültiger Benutzername.' });
      }

      const targetUser = db.prepare(`
        SELECT id, username, is_developer
        FROM users
        WHERE username = ? COLLATE NOCASE
      `).get(username);

      if (!targetUser) {
        return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
      }

      const nextDeveloperStatus = targetUser.is_developer === 1 ? 0 : 1;

      db.prepare('UPDATE users SET is_developer = ? WHERE id = ?').run(nextDeveloperStatus, targetUser.id);

      return res.json({
        message: nextDeveloperStatus === 1
          ? `@${targetUser.username} wurde zum Entwickler befördert.`
          : `@${targetUser.username} wurde vom Entwicklerstatus zurückgestuft.`,
        isDeveloper: nextDeveloperStatus === 1,
        username: targetUser.username
      });
    } catch (err) {
      console.error('[ADMIN TOGGLE DEVELOPER ERROR]', err);
      return res.status(500).json({ error: 'Entwicklerstatus konnte nicht geändert werden.' });
    }
  });

  router.patch('/users/:username/restrict', (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Nicht authentifiziert.' });
      }

      if (!canAccessAdminPanel(req)) {
        return res.status(403).json({ error: 'Nur Administrator*innen und Moderator*innen können Nutzer einschränken.' });
      }

      const username = typeof req.params.username === 'string' ? req.params.username.trim() : '';
      if (!username) {
        return res.status(400).json({ error: 'Ungültiger Benutzername.' });
      }

      const targetUser = db.prepare(`
        SELECT id, username, email, role, is_restricted
        FROM users
        WHERE username = ? COLLATE NOCASE
      `).get(username);

      if (!targetUser) {
        return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
      }

      if (targetUser.id === req.session.userId) {
        return res.status(403).json({ error: 'Du kannst dich selbst nicht einschränken.' });
      }

      const viewerRole = getSessionUserRole(req);
      const targetRole = getRoleFromUserRecord(targetUser);

      if (viewerRole === USER_ROLES.MODERATOR) {
        if (targetRole !== USER_ROLES.USER) {
          return res.status(403).json({ error: 'Moderator*innen können nur normale Nutzer einschränken.' });
        }
      }

      if (viewerRole === USER_ROLES.ADMINISTRATOR) {
        if (targetRole === USER_ROLES.ADMINISTRATOR) {
          return res.status(403).json({ error: 'Administrator*innen können nicht eingeschränkt werden.' });
        }
      }

      const isProtected = isProtectedEmail(targetUser.email);
      if (isProtected) {
        return res.status(403).json({ error: 'Geschützte Nutzer können nicht eingeschränkt werden.' });
      }

      const nextRestrictionStatus = targetUser.is_restricted === 1 ? 0 : 1;

      let downgradedRole = null;
      if (nextRestrictionStatus === 1 && (targetRole === USER_ROLES.MODERATOR || targetRole === USER_ROLES.ADMINISTRATOR)) {
        db.prepare('UPDATE users SET is_restricted = ?, role = ? WHERE id = ?').run(nextRestrictionStatus, USER_ROLES.USER, targetUser.id);
        downgradedRole = targetRole;
      } else {
        db.prepare('UPDATE users SET is_restricted = ? WHERE id = ?').run(nextRestrictionStatus, targetUser.id);
      }

      let message = nextRestrictionStatus === 1
        ? `@${targetUser.username} wurde eingeschränkt.`
        : `@${targetUser.username} wurde freigegeben.`;

      if (downgradedRole === USER_ROLES.MODERATOR) {
        message += ' Rolle wurde von Moderator*in zu Nutzer degradiert.';
      } else if (downgradedRole === USER_ROLES.ADMINISTRATOR) {
        message += ' Rolle wurde von Administrator*in zu Nutzer degradiert.';
      }

      return res.json({
        message,
        restricted: nextRestrictionStatus === 1,
        username: targetUser.username
      });
    } catch (err) {
      console.error('[ADMIN TOGGLE RESTRICT ERROR]', err);
      return res.status(500).json({ error: 'Einschränkung konnte nicht geändert werden.' });
    }
  });

  router.get('/reports/:username', (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: 'Nicht authentifiziert.' });
      }

      if (!canAccessAdminPanel(req)) {
        return res.status(403).json({ error: 'Nur Administrator*innen und Moderator*innen können Meldungen sehen.' });
      }

      const username = (req.params.username || '').trim();
      const reportedUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
      if (!reportedUser) {
        return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
      }

      const reports = db.prepare(`
        SELECT
          r.id,
          r.reason,
          r.closed,
          r.created_at,
          u.username AS reporter_username,
          u.full_name AS reporter_full_name
        FROM reports r
        JOIN users u ON u.id = r.reporter_user_id
        WHERE r.reported_user_id = ?
        ORDER BY r.closed ASC, datetime(r.created_at) DESC
      `).all(reportedUser.id);

      return res.json({ reports });
    } catch (err) {
      console.error('[GET ADMIN REPORTS ERROR]', err);
      return res.status(500).json({ error: 'Serverfehler beim Abrufen der Meldungen.' });
    }
  });

  router.patch('/reports/:reportId/close', (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: 'Nicht authentifiziert.' });
      }

      if (!isAdminSessionUser(req)) {
        return res.status(403).json({ error: 'Nur Administrator*innen können Fälle schließen.' });
      }

      const reportId = parseInt(req.params.reportId, 10);
      if (!Number.isInteger(reportId) || reportId <= 0) {
        return res.status(400).json({ error: 'Ungültige Meldungs-ID.' });
      }

      const report = db.prepare('SELECT id FROM reports WHERE id = ?').get(reportId);
      if (!report) {
        return res.status(404).json({ error: 'Meldung nicht gefunden.' });
      }

      db.prepare('UPDATE reports SET closed = 1 WHERE id = ?').run(reportId);

      return res.json({ message: 'Fall erfolgreich geschlossen.' });
    } catch (err) {
      console.error('[CLOSE REPORT ERROR]', err);
      return res.status(500).json({ error: 'Serverfehler beim Schließen des Falls.' });
    }
  });

  router.get('/users/with-open-reports', (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: 'Nicht authentifiziert.' });
      }

      if (!canAccessAdminPanel(req)) {
        return res.status(403).json({ error: 'Nur Administrator*innen und Moderator*innen können Meldungen sehen.' });
      }

      const rawQuery = typeof req.query.q === 'string' ? req.query.q : '';
      const query = rawQuery.trim();

      const users = query
        ? db.prepare(`
            SELECT DISTINCT u.id, u.username, u.profile_name, u.full_name, u.email, u.avatar, u.accent_color, u.role, u.is_developer
            FROM users u
            INNER JOIN reports r ON r.reported_user_id = u.id
            WHERE r.closed = 0
              AND u.username LIKE ? COLLATE NOCASE
            ORDER BY u.username COLLATE NOCASE ASC
          `).all(`%${query}%`)
        : db.prepare(`
            SELECT DISTINCT u.id, u.username, u.profile_name, u.full_name, u.email, u.avatar, u.accent_color, u.role, u.is_developer
            FROM users u
            INNER JOIN reports r ON r.reported_user_id = u.id
            WHERE r.closed = 0
            ORDER BY u.username COLLATE NOCASE ASC
          `).all();

      const sanitizedUsers = users.map((user) => ({
        id: user.id,
        username: user.username,
        profile_name: user.profile_name,
        full_name: user.full_name,
        avatar: user.avatar,
        accent_color: user.accent_color,
        role: getRoleFromUserRecord(user),
        isProtected: isProtectedEmail(user.email),
        isDeveloper: user.is_developer === 1
      }));

      return res.json({ query, users: sanitizedUsers });
    } catch (err) {
      console.error('[ADMIN USERS WITH OPEN REPORTS ERROR]', err);
      return res.status(500).json({ error: 'Serverfehler beim Abrufen der Nutzer mit Meldungen.' });
    }
  });

  router.get('/unban-requests', (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: 'Nicht authentifiziert.' });
      }

      if (!canAccessAdminPanel(req)) {
        return res.status(403).json({ error: 'Nur Administrator*innen und Moderator*innen können Freigaben sehen.' });
      }

      const requests = db.prepare(`
        SELECT rr.id, rr.restricted_user_id, rr.reason, rr.created_at, rr.closed,
               u.id AS user_id, u.username, u.profile_name, u.full_name, u.avatar, u.accent_color
        FROM restriction_requests rr
        INNER JOIN users u ON rr.restricted_user_id = u.id
        WHERE rr.closed = 0
        ORDER BY rr.created_at DESC
      `).all();

      const sanitizedRequests = requests.map((req) => ({
        id: req.id,
        userId: req.user_id,
        username: req.username,
        profile_name: req.profile_name,
        full_name: req.full_name,
        avatar: req.avatar,
        accent_color: req.accent_color,
        reason: req.reason,
        createdAt: req.created_at
      }));

      return res.json({ requests: sanitizedRequests });
    } catch (err) {
      console.error('[ADMIN UNBAN REQUESTS ERROR]', err);
      return res.status(500).json({ error: 'Serverfehler beim Abrufen der Freigabeanfragen.' });
    }
  });

  router.patch('/unban-requests/:id/resolve', (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: 'Nicht authentifiziert.' });
      }

      if (!canAccessAdminPanel(req)) {
        return res.status(403).json({ error: 'Nur Administrator*innen und Moderator*innen können Anfragen genehmigen.' });
      }

      const requestId = Number(req.params.id);
      if (!Number.isInteger(requestId) || requestId <= 0) {
        return res.status(400).json({ error: 'Ungültige Request-ID.' });
      }

      const unbanRequest = db.prepare('SELECT id, restricted_user_id, closed FROM restriction_requests WHERE id = ?').get(requestId);
      if (!unbanRequest) {
        return res.status(404).json({ error: 'Anfrage nicht gefunden.' });
      }

      if (unbanRequest.closed === 1) {
        return res.status(400).json({ error: 'Diese Anfrage wurde bereits bearbeitet.' });
      }

      db.prepare('UPDATE users SET is_restricted = 0 WHERE id = ?').run(unbanRequest.restricted_user_id);

      db.prepare('UPDATE restriction_requests SET closed = 1, closed_at = datetime(\'now\'), resolved_by_admin_id = ? WHERE id = ?')
        .run(req.session.userId, requestId);

      const user = db.prepare('SELECT username FROM users WHERE id = ?').get(unbanRequest.restricted_user_id);

      return res.json({
        message: `Freigabeanfrage für @${user.username} genehmigt. Der Nutzer ist nun nicht mehr eingeschränkt.`,
        username: user.username
      });
    } catch (err) {
      console.error('[RESOLVE UNBAN REQUEST ERROR]', err);
      return res.status(500).json({ error: 'Serverfehler beim Genehmigen der Anfrage.' });
    }
  });

  router.get('/bug-reports', (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: 'Nicht authentifiziert.' });
      }

      if (!canAccessAdminPanel(req)) {
        return res.status(403).json({ error: 'Kein Zugriff auf den Admin-Bereich.' });
      }

      const reports = db.prepare(`
        SELECT
          b.id,
          b.description,
          b.closed,
          b.created_at,
          u.username,
          u.full_name
        FROM bug_reports b
        JOIN users u ON u.id = b.reported_user_id
        ORDER BY b.closed ASC, datetime(b.created_at) DESC
      `).all();

      return res.json({ reports });
    } catch (err) {
      console.error('[GET ADMIN BUG REPORTS ERROR]', err);
      return res.status(500).json({ error: 'Serverfehler beim Abrufen der Bug Reports.' });
    }
  });

  router.patch('/bug-reports/:bugId/close', (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: 'Nicht authentifiziert.' });
      }

      if (!isAdminSessionUser(req)) {
        return res.status(403).json({ error: 'Nur Administrator*innen können Bug Reports schließen.' });
      }

      const bugId = parseInt(req.params.bugId, 10);
      if (!Number.isInteger(bugId) || bugId <= 0) {
        return res.status(400).json({ error: 'Ungültige Bug ID.' });
      }

      const bugReport = db.prepare('SELECT id FROM bug_reports WHERE id = ?').get(bugId);
      if (!bugReport) {
        return res.status(404).json({ error: 'Bug Report nicht gefunden.' });
      }

      db.prepare('UPDATE bug_reports SET closed = 1 WHERE id = ?').run(bugId);

      return res.json({ message: 'Bug Report geschlossen.' });
    } catch (err) {
      console.error('[CLOSE BUG REPORT ERROR]', err);
      return res.status(500).json({ error: 'Serverfehler beim Schließen des Bug Reports.' });
    }
  });

  return router;
}

module.exports = createAuthAdminRouter;
