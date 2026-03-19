const express = require('express');

function createAuthProfileRouter({
  db,
  bcrypt,
  isProtectedEmail,
  USERNAME_REGEX,
  getPublicUserProfileByEmail,
  filterDisallowedUsers,
  isDisallowedUsername,
  getFollowCounts,
  isFollowingUser,
  withResolvedRole,
  deleteOldAvatar,
  upload,
  normalizeAccentColor,
  normalizeBirthDate,
  normalizeBelief,
  normalizeConfession,
  normalizePronouns,
  normalizeBio
}) {
  const router = express.Router();

  router.get('/project-contacts', (_req, res) => {
    try {
      const contacts = {
        armand: getPublicUserProfileByEmail('armand.patrick.asztalos@tha.de') || null,
        jost: getPublicUserProfileByEmail('jost.witthauer@tha.de') || null
      };

      return res.json({ contacts });
    } catch (err) {
      console.error('[PROJECT CONTACTS ERROR]', err);
      return res.status(500).json({ error: 'Projektkontakte konnten nicht geladen werden.' });
    }
  });

  router.get('/search-users', (req, res) => {
    try {
      const rawQuery = typeof req.query.q === 'string' ? req.query.q : '';
      const query = rawQuery.trim();

      if (!query) {
        return res.json({
          query: '',
          results: {
            displayNames: [],
            usernames: []
          }
        });
      }

      const likeQuery = `%${query}%`;
      const limitPerGroup = 6;

      const displayNames = db.prepare(`
        SELECT id, username, profile_name, full_name, avatar, accent_color
        FROM users
        WHERE profile_name IS NOT NULL
          AND TRIM(profile_name) != ''
          AND profile_name LIKE ? COLLATE NOCASE
        ORDER BY username COLLATE NOCASE ASC
        LIMIT ?
      `).all(likeQuery, limitPerGroup);

      const usernames = db.prepare(`
        SELECT id, username, profile_name, full_name, avatar, accent_color
        FROM users
        WHERE username LIKE ? COLLATE NOCASE
        ORDER BY username COLLATE NOCASE ASC
        LIMIT ?
      `).all(likeQuery, limitPerGroup);

      const filteredDisplayNames = filterDisallowedUsers(displayNames);
      const filteredUsernames = filterDisallowedUsers(usernames);

      return res.json({
        query,
        results: {
          displayNames: filteredDisplayNames,
          usernames: filteredUsernames
        }
      });
    } catch (err) {
      console.error('[SEARCH USERS ERROR]', err);
      return res.status(500).json({ error: 'Suche konnte nicht geladen werden.' });
    }
  });

  router.get('/public/:username', (req, res) => {
    try {
      const username = req.params.username?.trim();

      if (!username || !USERNAME_REGEX.test(username)) {
        return res.status(400).json({ error: 'Ungültiger Benutzername.' });
      }

      if (isDisallowedUsername(username)) {
        return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
      }

      const user = db.prepare(`
        SELECT id, username, profile_name, pronouns, bio, full_name, email, avatar, birth_date, belief, confession, accent_color, role, early_supporter, is_developer, created_at, is_restricted
        FROM users
        WHERE username = ?
      `).get(username);

      if (!user) {
        return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
      }

      const { followersCount, followingCount } = getFollowCounts(user.id);
      const viewerId = req.session.userId || null;
      const isOwnProfile = Boolean(viewerId && viewerId === user.id);
      const isFollowing = isOwnProfile ? false : isFollowingUser(viewerId, user.id);

      return res.json({
        user: withResolvedRole(user),
        follow: {
          followersCount,
          followingCount,
          isFollowing,
          isOwnProfile,
          canFollow: Boolean(viewerId) && !isOwnProfile
        }
      });
    } catch (err) {
      console.error('[PUBLIC PROFILE ERROR]', err);
      return res.status(500).json({ error: 'Öffentliches Profil konnte nicht geladen werden.' });
    }
  });

  router.get('/public/:username/followers', (req, res) => {
    try {
      const username = req.params.username?.trim();

      if (!username || !USERNAME_REGEX.test(username)) {
        return res.status(400).json({ error: 'Ungültiger Benutzername.' });
      }

      if (isDisallowedUsername(username)) {
        return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
      }

      const user = db.prepare('SELECT id, username FROM users WHERE username = ?').get(username);
      if (!user) {
        return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
      }

      const users = db.prepare(`
        SELECT u.id, u.username, u.full_name, u.avatar, u.accent_color
        FROM follows f
        INNER JOIN users u ON u.id = f.follower_id
        WHERE f.following_id = ?
        ORDER BY datetime(f.created_at) DESC, u.username COLLATE NOCASE ASC
      `).all(user.id);

      return res.json({ users });
    } catch (err) {
      console.error('[PUBLIC FOLLOWERS ERROR]', err);
      return res.status(500).json({ error: 'Follower konnten nicht geladen werden.' });
    }
  });

  router.get('/public/:username/following', (req, res) => {
    try {
      const username = req.params.username?.trim();

      if (!username || !USERNAME_REGEX.test(username)) {
        return res.status(400).json({ error: 'Ungültiger Benutzername.' });
      }

      if (isDisallowedUsername(username)) {
        return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
      }

      const user = db.prepare('SELECT id, username FROM users WHERE username = ?').get(username);
      if (!user) {
        return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
      }

      const users = db.prepare(`
        SELECT u.id, u.username, u.full_name, u.avatar, u.accent_color
        FROM follows f
        INNER JOIN users u ON u.id = f.following_id
        WHERE f.follower_id = ?
        ORDER BY datetime(f.created_at) DESC, u.username COLLATE NOCASE ASC
      `).all(user.id);

      return res.json({ users });
    } catch (err) {
      console.error('[PUBLIC FOLLOWING ERROR]', err);
      return res.status(500).json({ error: 'Gefolgte Profile konnten nicht geladen werden.' });
    }
  });

  router.post('/follow/:username', (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Bitte melde dich an, um zu folgen.' });
      }

      const username = req.params.username?.trim();
      if (!username || !USERNAME_REGEX.test(username)) {
        return res.status(400).json({ error: 'Ungültiger Benutzername.' });
      }

      if (isDisallowedUsername(username)) {
        return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
      }

      const targetUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
      if (!targetUser) {
        return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
      }

      if (targetUser.id === req.session.userId) {
        return res.status(400).json({ error: 'Du kannst dir nicht selbst folgen.' });
      }

      const existing = db.prepare(
        'SELECT id FROM follows WHERE follower_id = ? AND following_id = ?'
      ).get(req.session.userId, targetUser.id);

      if (existing) {
        return res.status(409).json({ error: 'Du folgst diesem Profil bereits.' });
      }

      db.prepare(
        'INSERT INTO follows (follower_id, following_id) VALUES (?, ?)'
      ).run(req.session.userId, targetUser.id);

      const counts = getFollowCounts(targetUser.id);
      return res.json({ message: 'Du folgst diesem Profil jetzt.', follow: counts });
    } catch (err) {
      console.error('[FOLLOW USER ERROR]', err);
      return res.status(500).json({ error: 'Profil konnte nicht gefolgt werden.' });
    }
  });

  router.delete('/follow/:username', (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Bitte melde dich an, um zu entfolgen.' });
      }

      const username = req.params.username?.trim();
      if (!username || !USERNAME_REGEX.test(username)) {
        return res.status(400).json({ error: 'Ungültiger Benutzername.' });
      }

      if (isDisallowedUsername(username)) {
        return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
      }

      const targetUser = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
      if (!targetUser) {
        return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
      }

      db.prepare(
        'DELETE FROM follows WHERE follower_id = ? AND following_id = ?'
      ).run(req.session.userId, targetUser.id);

      const counts = getFollowCounts(targetUser.id);
      return res.json({ message: 'Du folgst diesem Profil nicht mehr.', follow: counts });
    } catch (err) {
      console.error('[UNFOLLOW USER ERROR]', err);
      return res.status(500).json({ error: 'Profil konnte nicht entfolgt werden.' });
    }
  });

  router.post('/update-username', (req, res) => {
    try {
      const { newUsername } = req.body;

      if (!req.session.userId) {
        return res.status(401).json({ error: 'Nicht authentifiziert.' });
      }

      if (!newUsername || !USERNAME_REGEX.test(newUsername)) {
        return res.status(400).json({ error: 'Der Benutzername darf nur Buchstaben, Zahlen, Unterstriche und Bindestriche enthalten.' });
      }

      if (isDisallowedUsername(newUsername)) {
        return res.status(400).json({ error: 'Dieser Benutzername ist nicht erlaubt.' });
      }

      if (newUsername.length > 20) {
        return res.status(400).json({ error: 'Der Benutzername darf maximal 20 Zeichen lang sein.' });
      }

      const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?')
        .get(newUsername, req.session.userId);
      if (existing) {
        return res.status(409).json({ error: 'Dieser Benutzername ist bereits vergeben.' });
      }

      db.prepare("UPDATE users SET username = ?, last_active_at = datetime('now') WHERE id = ?")
        .run(newUsername, req.session.userId);

      const user = db.prepare('SELECT id, username, profile_name, pronouns, bio, full_name, email, avatar, birth_date, belief, confession, accent_color, role, early_supporter, is_developer, created_at FROM users WHERE id = ?')
        .get(req.session.userId);

      return res.json({ message: 'Benutzername aktualisiert!', user: withResolvedRole(user) });
    } catch (err) {
      console.error('[UPDATE USERNAME ERROR]', err);
      return res.status(500).json({ error: 'Serverfehler.' });
    }
  });

  router.post('/update-avatar', upload.single('avatar'), (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Nicht authentifiziert.' });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'Bitte wähle eine Bilddatei aus.' });
      }

      const currentUser = db.prepare('SELECT avatar FROM users WHERE id = ?')
        .get(req.session.userId);

      if (!currentUser) {
        deleteOldAvatar('uploads/' + req.file.filename);
        return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
      }

      const newAvatarPath = 'uploads/' + req.file.filename;

      db.prepare("UPDATE users SET avatar = ?, last_active_at = datetime('now') WHERE id = ?")
        .run(newAvatarPath, req.session.userId);

      deleteOldAvatar(currentUser.avatar);

      const user = db.prepare('SELECT id, username, profile_name, pronouns, bio, full_name, email, avatar, birth_date, belief, confession, accent_color, role, early_supporter, is_developer, created_at FROM users WHERE id = ?')
        .get(req.session.userId);

      return res.json({ message: 'Profilbild aktualisiert!', user: withResolvedRole(user) });
    } catch (err) {
      console.error('[UPDATE AVATAR ERROR]', err);
      return res.status(500).json({ error: 'Serverfehler.' });
    }
  });

  router.post('/update-profile', (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Nicht authentifiziert.' });
      }

      const currentUserRecord = db.prepare('SELECT id, is_restricted FROM users WHERE id = ?').get(req.session.userId);
      if (currentUserRecord?.is_restricted === 1) {
        return res.status(403).json({ error: 'Dein Profil ist eingeschränkt und kann nicht modifiziert werden. Du kannst ein Freigabeticket einreichen.' });
      }

      const { full_name, profile_name, pronouns, bio, birth_date, belief, confession, username, accent_color } = req.body;

      if (!full_name || !username) {
        return res.status(400).json({ error: 'Vollständiger Name und Benutzername sind erforderlich.' });
      }

      const trimmedName = full_name.trim();
      const trimmedProfileName = typeof profile_name === 'string' ? profile_name.trim() : '';
      const trimmedPronouns = typeof pronouns === 'string' ? pronouns.trim() : '';
      const rawBio = typeof bio === 'string' ? bio : '';
      const trimmedBirthDate = typeof birth_date === 'string' ? birth_date.trim() : '';
      const trimmedBelief = typeof belief === 'string' ? belief.trim() : '';
      const trimmedConfession = typeof confession === 'string' ? confession.trim() : '';
      const trimmedUsername = username.trim();

      if (!trimmedName) {
        return res.status(400).json({ error: 'Vollständiger Name ist erforderlich.' });
      }

      if (trimmedProfileName.length > 20) {
        return res.status(400).json({ error: 'Der Profilname darf maximal 20 Zeichen lang sein.' });
      }

      if (!USERNAME_REGEX.test(trimmedUsername)) {
        return res.status(400).json({ error: 'Der Benutzername darf nur Buchstaben, Zahlen, Unterstriche und Bindestriche enthalten.' });
      }

      if (isDisallowedUsername(trimmedUsername)) {
        return res.status(400).json({ error: 'Dieser Benutzername ist nicht erlaubt.' });
      }

      if (trimmedUsername.length > 20) {
        return res.status(400).json({ error: 'Der Benutzername darf maximal 20 Zeichen lang sein.' });
      }

      const normalizedAccentColor = normalizeAccentColor(accent_color);
      if (typeof accent_color === 'string' && accent_color.trim() && !normalizedAccentColor) {
        return res.status(400).json({ error: 'Die Profilfarbe muss ein gültiger Hex-Farbwert sein (z. B. #352C59).' });
      }

      const normalizedBirthDate = normalizeBirthDate(trimmedBirthDate);
      if (trimmedBirthDate && !normalizedBirthDate) {
        return res.status(400).json({ error: 'Das Geburtsdatum muss im Format dd/mm/yyyy angegeben werden.' });
      }

      const normalizedBelief = normalizeBelief(trimmedBelief);
      if (trimmedBelief && !normalizedBelief) {
        return res.status(400).json({ error: 'Bitte wähle einen gültigen Glauben aus der Liste aus.' });
      }

      if (!trimmedBelief && trimmedConfession) {
        return res.status(400).json({ error: 'Bitte wähle zuerst eine Religion aus.' });
      }

      const normalizedConfession = normalizeConfession(normalizedBelief, trimmedConfession);
      if (trimmedConfession && !normalizedConfession) {
        return res.status(400).json({ error: 'Bitte wähle eine gültige Konfession passend zur Religion aus.' });
      }

      const normalizedPronouns = normalizePronouns(trimmedPronouns);
      if (trimmedPronouns && !normalizedPronouns) {
        return res.status(400).json({ error: 'Die Pronomen dürfen maximal 30 Zeichen lang sein.' });
      }

      const normalizedBio = normalizeBio(rawBio);
      if (rawBio.trim() && !normalizedBio) {
        return res.status(400).json({ error: 'Die Bio darf maximal 200 Zeichen lang sein.' });
      }

      const existing = db.prepare('SELECT id FROM users WHERE username = ? AND id != ?')
        .get(trimmedUsername, req.session.userId);

      if (existing) {
        return res.status(409).json({ error: 'Dieser Benutzername ist bereits vergeben.' });
      }

      db.prepare("UPDATE users SET full_name = ?, profile_name = ?, pronouns = ?, bio = ?, birth_date = ?, belief = ?, confession = ?, username = ?, accent_color = ?, last_active_at = datetime('now') WHERE id = ?")
        .run(trimmedName, trimmedProfileName || null, normalizedPronouns, normalizedBio, normalizedBirthDate, normalizedBelief, normalizedConfession, trimmedUsername, normalizedAccentColor, req.session.userId);

      const user = db.prepare('SELECT id, username, profile_name, pronouns, bio, full_name, email, avatar, birth_date, belief, confession, accent_color, role, early_supporter, is_developer, created_at FROM users WHERE id = ?')
        .get(req.session.userId);

      return res.json({ message: 'Profil aktualisiert!', user: withResolvedRole(user) });
    } catch (err) {
      console.error('[UPDATE PROFILE ERROR]', err);
      return res.status(500).json({ error: 'Serverfehler.' });
    }
  });

  router.delete('/delete-account', async (req, res) => {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Nicht authentifiziert.' });
      }

      const currentUserRecord = db.prepare('SELECT id, is_restricted FROM users WHERE id = ?').get(req.session.userId);
      if (currentUserRecord?.is_restricted === 1) {
        return res.status(403).json({ error: 'Dein Profil ist eingeschränkt und kann nicht gelöscht werden. Du kannst ein Freigabeticket einreichen.' });
      }

      const { password } = req.body;

      if (!password) {
        return res.status(400).json({ error: 'Passwort ist erforderlich.' });
      }

      const user = db.prepare('SELECT avatar, password, email FROM users WHERE id = ?')
        .get(req.session.userId);

      if (!user) {
        return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
      }

      if (isProtectedEmail(user.email)) {
        return res.status(403).json({ error: 'Dieses Projektkonto ist geschützt und kann nicht gelöscht werden.' });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return res.status(401).json({ error: 'Falsches Passwort.' });
      }

      db.prepare('DELETE FROM users WHERE id = ?')
        .run(req.session.userId);

      deleteOldAvatar(user.avatar);

      req.session.destroy((err) => {
        if (err) {
          console.error('[DELETE ACCOUNT SESSION ERROR]', err);
          return res.status(500).json({ error: 'Konto gelöscht, aber Bereinigung der Sitzung fehlgeschlagen.' });
        }

        return res.json({ message: 'Konto erfolgreich gelöscht.' });
      });
    } catch (err) {
      console.error('[DELETE ACCOUNT ERROR]', err);
      return res.status(500).json({ error: 'Serverfehler.' });
    }
  });

  return router;
}

module.exports = createAuthProfileRouter;
