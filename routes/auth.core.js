const express = require('express');

function createAuthCoreRouter({
  db,
  bcrypt,
  createMailTransport,
  getMailConfig,
  normalizeEmail,
  THA_REGEX,
  USERNAME_REGEX,
  SALT_ROUNDS,
  upload,
  isDisallowedUsername,
  withResolvedRole,
  touchUserActivity,
  grantEarlySupporterStatus,
  shouldGrantEarlySupporterNow,
  enforceRestrictedUserRole,
  getMailErrorMessage,
  checkIpVerificationRateLimit
}) {
  const router = express.Router();

  const MAX_DISTRO_REVIEW_LENGTH = 1000;
  const MAX_SAVED_DISTROS = 3;

  function normalizeDistroKey(value) {
    if (typeof value !== 'string') return '';
    return value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s_-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 80);
  }

  function normalizeDistroName(value, fallback) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim().slice(0, 120);
    }
    return fallback || '';
  }

  function trimReviewMessage(message) {
    if (typeof message !== 'string') return '';
    return message.trim().slice(0, MAX_DISTRO_REVIEW_LENGTH);
  }

  function getDistroRatingsPayload(distroKey, currentUserId = null) {
    const aggregate = db.prepare(`
      SELECT COUNT(*) AS count, AVG(rating) AS average
      FROM distro_reviews
      WHERE distro_key = ?
    `).get(distroKey) || { count: 0, average: null };

    const reviews = db.prepare(`
      SELECT dr.rating, dr.message, dr.created_at, u.username, u.profile_name, u.full_name, u.avatar
      FROM distro_reviews dr
      JOIN users u ON dr.user_id = u.id
      WHERE dr.distro_key = ?
      ORDER BY dr.created_at DESC
      LIMIT 3
    `).all(distroKey);

    let userReview = null;
    if (currentUserId) {
      userReview = db.prepare(`
        SELECT rating, message
        FROM distro_reviews
        WHERE distro_key = ? AND user_id = ?
      `).get(distroKey, currentUserId) || null;
    }

    return {
      distroKey,
      average: aggregate?.average ? Number(aggregate.average) : 0,
      count: aggregate?.count ? Number(aggregate.count) : 0,
      reviews: Array.isArray(reviews) ? reviews : [],
      userReview
    };
  }

  async function sendVerificationCodeEmail(email, code, subject) {
    const mailConfig = getMailConfig();

    if (!mailConfig.isConfigured && !mailConfig.allowConsoleFallback) {
      return {
        ok: false,
        status: 503,
        error: 'Der E-Mail-Versand ist auf dem Server nicht konfiguriert. Bitte kontaktiere den Support.'
      };
    }

    const transport = createMailTransport();
    const info = await transport.sendMail({
      from: mailConfig.from,
      to: email,
      subject,
      text: `Dein Verifizierungscode lautet: ${code}\n\nDieser Code läuft in 15 Minuten ab.\nFalls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.`,
      html: `<p>Dein Verifizierungscode lautet:</p><p style="font-size:1.6em;font-weight:bold;letter-spacing:6px">${code}</p><p>Dieser Code läuft in 15 Minuten ab.</p><p style="color:#999;font-size:.85em">Falls du diese Anfrage nicht gestellt hast, kannst du diese E-Mail ignorieren.</p>`
    });

    if (!mailConfig.isConfigured) {
      console.log(`[EMAIL VERIFICATION] No SMTP configured - code for ${email}: ${code}`);
      return { ok: true };
    }

    const accepted = Array.isArray(info.accepted) ? info.accepted : [];
    const rejected = Array.isArray(info.rejected) ? info.rejected : [];

    console.log('[EMAIL VERIFICATION SENT]', {
      to: email,
      messageId: info.messageId,
      accepted,
      rejected,
      response: info.response || null
    });

    if (!accepted.length) {
      throw new Error('Der Mail-Anbieter hat keine Empfänger für die Verifizierungs-E-Mail akzeptiert.');
    }

    return { ok: true };
  }

  router.post('/send-verification', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email || !THA_REGEX.test(email.trim())) {
        return res.status(400).json({ error: 'Nur @tha.de-E-Mail-Adressen sind erlaubt.' });
      }

      const normalizedEmail = normalizeEmail(email);

      const ipLimit = checkIpVerificationRateLimit(req);
      if (ipLimit.limited) {
        return res.status(429).json({
          error: `Zu viele Verifizierungsanfragen aus deinem Netzwerk. Bitte versuche es in etwa ${ipLimit.retryAfterSeconds} Sekunden erneut.`
        });
      }

      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizedEmail);
      if (existing) {
        return res.status(409).json({ error: 'Diese E-Mail-Adresse ist bereits registriert.' });
      }

      const recent = db.prepare(`
      SELECT id FROM email_verifications
      WHERE email = ? AND datetime(created_at) > datetime('now', '-60 seconds')
    `).get(normalizedEmail);

      if (recent) {
        return res.status(429).json({ error: 'Bitte warte einen Moment, bevor du einen neuen Code anforderst.' });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();

      const mailResult = await sendVerificationCodeEmail(normalizedEmail, code, 'Dein Verifizierungscode');
      if (!mailResult.ok) {
        return res.status(mailResult.status).json({ error: mailResult.error });
      }

      db.prepare('DELETE FROM email_verifications WHERE email = ?').run(normalizedEmail);
      db.prepare(`
      INSERT INTO email_verifications (email, code, expires_at)
      VALUES (?, ?, datetime('now', '+15 minutes'))
    `).run(normalizedEmail, code);

      return res.json({ message: 'Verifizierungscode gesendet! Bitte prüfe dein Postfach.' });
    } catch (err) {
      console.error('[SEND VERIFICATION ERROR]', {
        code: err?.code || err?.responseCode || null,
        message: err?.message || 'Unknown error',
        response: err?.response || null,
        command: err?.command || null
      });
      return res.status(500).json({ error: getMailErrorMessage(err) });
    }
  });

  router.post('/send-password-reset-verification', async (req, res) => {
    try {
      const { identifier } = req.body;

      if (!identifier || !identifier.trim()) {
        return res.status(400).json({ error: 'Bitte gib deine E-Mail-Adresse oder deinen Benutzernamen ein.' });
      }

      const trimmedIdentifier = identifier.trim();

      const ipLimit = checkIpVerificationRateLimit(req);
      if (ipLimit.limited) {
        return res.status(429).json({
          error: `Zu viele Verifizierungsanfragen aus deinem Netzwerk. Bitte versuche es in etwa ${ipLimit.retryAfterSeconds} Sekunden erneut.`
        });
      }

      const user = db.prepare(
        'SELECT email FROM users WHERE email = ? OR username = ?'
      ).get(normalizeEmail(trimmedIdentifier), trimmedIdentifier);

      if (!user) {
        return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
      }

      const normalizedEmail = normalizeEmail(user.email);

      const recent = db.prepare(`
      SELECT id FROM password_reset_verifications
      WHERE email = ? AND datetime(created_at) > datetime('now', '-60 seconds')
    `).get(normalizedEmail);

      if (recent) {
        return res.status(429).json({ error: 'Bitte warte einen Moment, bevor du einen neuen Code anforderst.' });
      }

      const code = Math.floor(100000 + Math.random() * 900000).toString();

      const mailResult = await sendVerificationCodeEmail(normalizedEmail, code, 'Dein Code zum Zurücksetzen des Passworts');
      if (!mailResult.ok) {
        return res.status(mailResult.status).json({ error: mailResult.error });
      }

      db.prepare('DELETE FROM password_reset_verifications WHERE email = ?').run(normalizedEmail);
      db.prepare(`
      INSERT INTO password_reset_verifications (email, code, expires_at)
      VALUES (?, ?, datetime('now', '+15 minutes'))
    `).run(normalizedEmail, code);

      return res.json({ message: 'Verifizierungscode gesendet! Bitte prüfe dein Postfach.' });
    } catch (err) {
      console.error('[SEND RESET VERIFICATION ERROR]', {
        code: err?.code || err?.responseCode || null,
        message: err?.message || 'Unknown error',
        response: err?.response || null,
        command: err?.command || null
      });
      return res.status(500).json({ error: getMailErrorMessage(err) });
    }
  });

  router.post('/register', upload.single('avatar'), async (req, res) => {
    try {
      const { username, profile_name, full_name, email, password, confirm_password, verificationCode } = req.body;

      if (!username || !full_name || !email || !password || !confirm_password) {
        return res.status(400).json({ error: 'Alle Felder sind erforderlich.' });
      }

      if (!verificationCode) {
        return res.status(400).json({ error: 'Bitte verifiziere zuerst deine E-Mail-Adresse.' });
      }

      if (!USERNAME_REGEX.test(username)) {
        return res.status(400).json({ error: 'Der Benutzername darf nur Buchstaben, Zahlen, Unterstriche und Bindestriche enthalten.' });
      }

      if (isDisallowedUsername(username)) {
        return res.status(400).json({ error: 'Dieser Benutzername ist nicht erlaubt.' });
      }

      if (username.length > 20) {
        return res.status(400).json({ error: 'Der Benutzername darf maximal 20 Zeichen lang sein.' });
      }

      if (!THA_REGEX.test(email)) {
        return res.status(400).json({ error: 'Nur @tha.de-E-Mail-Adressen sind erlaubt.' });
      }

      const emailVerification = db.prepare(`
      SELECT id FROM email_verifications
      WHERE email = ? AND code = ? AND datetime(expires_at) > datetime('now')
    `).get(normalizeEmail(email), verificationCode.trim());

      if (!emailVerification) {
        return res.status(400).json({ error: 'Ungültiger oder abgelaufener Verifizierungscode.' });
      }

      if (password !== confirm_password) {
        return res.status(400).json({ error: 'Die Passwörter stimmen nicht überein.' });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: 'Das Passwort muss mindestens 6 Zeichen lang sein.' });
      }

      const existingEmail = db.prepare('SELECT id FROM users WHERE email = ?').get(normalizeEmail(email));
      const existingUsername = db.prepare('SELECT id FROM users WHERE username = ?').get(username);

      if (existingEmail) return res.status(409).json({ error: 'Diese E-Mail-Adresse ist bereits registriert.' });
      if (existingUsername) return res.status(409).json({ error: 'Dieser Benutzername ist bereits vergeben.' });

      const trimmedProfileName = typeof profile_name === 'string' ? profile_name.trim() : '';
      if (trimmedProfileName.length > 20) {
        return res.status(400).json({ error: 'Der Profilname darf maximal 20 Zeichen lang sein.' });
      }

      const normalizedProfileName = trimmedProfileName || null;
      const avatarPath = req.file ? 'uploads/' + req.file.filename : null;

      const hashed = await bcrypt.hash(password, SALT_ROUNDS);

      const info = db.prepare(`
      INSERT INTO users (username, profile_name, full_name, email, password, avatar, last_active_at, early_supporter)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), ?)
    `).run(username.trim(), normalizedProfileName, full_name.trim(), normalizeEmail(email), hashed, avatarPath, shouldGrantEarlySupporterNow() ? 1 : 0);

      req.session.userId = info.lastInsertRowid;

      db.prepare('DELETE FROM email_verifications WHERE email = ?').run(normalizeEmail(email));

      const user = db.prepare('SELECT id, username, profile_name, pronouns, bio, full_name, email, avatar, avatar_artist_url, birth_date, belief, confession, accent_color, role, early_supporter, is_developer, created_at FROM users WHERE id = ?')
        .get(info.lastInsertRowid);

      return res.status(201).json({ message: 'Konto erfolgreich erstellt!', user: withResolvedRole(user) });
    } catch (err) {
      console.error('[REGISTER ERROR]', err);
      return res.status(500).json({ error: 'Serverfehler. Bitte versuche es erneut.' });
    }
  });

  router.post('/login', async (req, res) => {
    try {
      const { identifier, password } = req.body;

      if (!identifier || !password) {
        return res.status(400).json({ error: 'Bitte fülle alle Felder aus.' });
      }

      const user = db.prepare(
        'SELECT * FROM users WHERE email = ? OR username = ?'
      ).get(identifier.trim(), identifier.trim());

      if (!user) {
        return res.status(401).json({ error: 'Ungültige Anmeldedaten.' });
      }

      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ error: 'Ungültige Anmeldedaten.' });
      }

      touchUserActivity(user.id);
      grantEarlySupporterStatus(user.id);

      const refreshedUser = db.prepare(`
      SELECT id, username, profile_name, pronouns, bio, full_name, email, avatar, avatar_artist_url, birth_date, belief, confession, accent_color, role, early_supporter, is_developer, created_at, is_restricted
      FROM users
      WHERE id = ?
    `).get(user.id);

      const resolvedRole = enforceRestrictedUserRole(refreshedUser);

      req.session.userId = user.id;

      return res.json({
        message: 'Erfolgreich angemeldet!',
        user: {
          ...withResolvedRole(refreshedUser),
          role: resolvedRole
        }
      });
    } catch (err) {
      console.error('[LOGIN ERROR]', err);
      return res.status(500).json({ error: 'Serverfehler. Bitte versuche es erneut.' });
    }
  });

  router.post('/logout', (req, res) => {
    req.session.destroy(() => res.json({ message: 'Abgemeldet.' }));
  });

  router.get('/me', (req, res) => {
    if (!req.session.userId) return res.status(401).json({ error: 'Nicht authentifiziert.' });

    const user = db.prepare(
      'SELECT id, username, profile_name, pronouns, bio, full_name, email, avatar, avatar_artist_url, birth_date, belief, confession, accent_color, role, early_supporter, is_developer, created_at, is_restricted FROM users WHERE id = ?'
    ).get(req.session.userId);

    if (!user) return res.status(401).json({ error: 'Benutzer nicht gefunden.' });

    touchUserActivity(req.session.userId);

    const isValidUsername = USERNAME_REGEX.test(user.username);
    const resolvedRole = enforceRestrictedUserRole(user);

    return res.json({
      user: {
        ...withResolvedRole(user),
        role: resolvedRole
      },
      needsUsernameUpdate: !isValidUsername
    });
  });

  router.post('/reset-password', async (req, res) => {
    try {
      const { identifier, verificationCode, newPassword, confirmPassword } = req.body;

      if (!identifier || !verificationCode || !newPassword || !confirmPassword) {
        return res.status(400).json({ error: 'Alle Felder sind erforderlich.' });
      }

      if (newPassword !== confirmPassword) {
        return res.status(400).json({ error: 'Die Passwörter stimmen nicht überein.' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: 'Das Passwort muss mindestens 6 Zeichen lang sein.' });
      }

      const user = db.prepare(
        'SELECT id, email FROM users WHERE email = ? OR username = ?'
      ).get(normalizeEmail(identifier), identifier.trim());

      if (!user) {
        return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
      }

      const normalizedEmail = normalizeEmail(user.email);

      const resetVerification = db.prepare(`
      SELECT id FROM password_reset_verifications
      WHERE email = ? AND code = ? AND datetime(expires_at) > datetime('now')
    `).get(normalizedEmail, verificationCode.trim());

      if (!resetVerification) {
        return res.status(400).json({ error: 'Ungültiger oder abgelaufener Verifizierungscode.' });
      }

      const hashed = await bcrypt.hash(newPassword, SALT_ROUNDS);
      db.prepare("UPDATE users SET password = ?, last_active_at = datetime('now') WHERE id = ?")
        .run(hashed, user.id);

      db.prepare('DELETE FROM password_reset_verifications WHERE email = ?').run(normalizedEmail);

      return res.json({ message: 'Passwort erfolgreich zurückgesetzt! Du kannst dich jetzt mit deinem neuen Passwort anmelden.' });
    } catch (err) {
      console.error('[RESET PASSWORD ERROR]', err);
      return res.status(500).json({ error: 'Serverfehler.' });
    }
  });

  router.post('/report/:username', (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: 'Du musst angemeldet sein, um zu melden.' });
      }

      const { username } = req.params;
      const { reason } = req.body;

      const reporterUser = db.prepare('SELECT id FROM users WHERE id = ?').get(req.session.userId);
      if (!reporterUser) {
        return res.status(401).json({ error: 'Ungültige Session.' });
      }

      const reportedUser = db.prepare('SELECT id FROM users WHERE username = ?').get((username || '').trim());
      if (!reportedUser) {
        return res.status(404).json({ error: 'Benutzer nicht gefunden.' });
      }

      if (reportedUser.id === req.session.userId) {
        return res.status(400).json({ error: 'Du kannst dich selbst nicht melden.' });
      }

      const trimmedReason = typeof reason === 'string' ? reason.trim() : '';

      db.prepare(`
      INSERT INTO reports (reported_user_id, reporter_user_id, reason)
      VALUES (?, ?, ?)
    `).run(reportedUser.id, req.session.userId, trimmedReason || null);

      return res.status(201).json({ message: 'Meldung erfolgreich eingereicht.' });
    } catch (err) {
      console.error('[REPORT USER ERROR]', err);
      return res.status(500).json({ error: 'Serverfehler beim Erstellen der Meldung.' });
    }
  });

  router.post('/unban-request', (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: 'Du musst angemeldet sein, um eine Anfrage zu stellen.' });
      }

      const { reason } = req.body;
      const trimmedReason = typeof reason === 'string' ? reason.trim() : '';

      if (!trimmedReason) {
        return res.status(400).json({ error: 'Ein Grund ist erforderlich.' });
      }

      const userRecord = db.prepare('SELECT id, is_restricted FROM users WHERE id = ?').get(req.session.userId);
      if (!userRecord) {
        return res.status(401).json({ error: 'Ungültige Session.' });
      }

      if (userRecord.is_restricted !== 1) {
        return res.status(400).json({ error: 'Du kannst keine Anfrage einreichen, wenn dein Profil nicht eingeschränkt ist.' });
      }

      db.prepare(`
      INSERT INTO restriction_requests (restricted_user_id, reason)
      VALUES (?, ?)
    `).run(userRecord.id, trimmedReason);

      return res.status(201).json({ message: 'Freigabeanfrage erfolgreich eingereicht.' });
    } catch (err) {
      console.error('[UNBAN REQUEST ERROR]', err);
      return res.status(500).json({ error: 'Serverfehler beim Erstellen der Anfrage.' });
    }
  });

  router.post('/report-bug', (req, res) => {
    try {
      if (!req.session?.userId) {
        return res.status(401).json({ error: 'Du musst angemeldet sein, um einen Bug zu melden.' });
      }

      const { description } = req.body;
      const trimmedDescription = typeof description === 'string' ? description.trim() : '';

      if (!trimmedDescription) {
        return res.status(400).json({ error: 'Bitte beschreibe den Bug.' });
      }

      if (trimmedDescription.length > 1000) {
        return res.status(400).json({ error: 'Die Beschreibung darf maximal 1000 Zeichen lang sein.' });
      }

      const user = db.prepare('SELECT id FROM users WHERE id = ?').get(req.session.userId);
      if (!user) {
        return res.status(401).json({ error: 'Ungültige Session.' });
      }

      db.prepare(`
      INSERT INTO bug_reports (reported_user_id, description)
      VALUES (?, ?)
    `).run(req.session.userId, trimmedDescription);

      return res.status(201).json({ message: 'Bug erfolgreich gemeldet.' });
    } catch (err) {
      console.error('[REPORT BUG ERROR]', err);
      return res.status(500).json({ error: 'Serverfehler beim Melden des Bugs.' });
    }
  });

  router.get('/distros/:distroKey/ratings', (req, res) => {
    const distroKey = normalizeDistroKey(req.params.distroKey);

    if (!distroKey) {
      return res.status(400).json({ error: 'Ungültige Distro.' });
    }

    try {
      const payload = getDistroRatingsPayload(distroKey, req.session?.userId || null);
      return res.json(payload);
    } catch (err) {
      console.error('[GET DISTRO RATINGS ERROR]', err);
      return res.status(500).json({ error: 'Bewertungen konnten nicht geladen werden.' });
    }
  });

  router.post('/distros/:distroKey/ratings', (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Du musst angemeldet sein, um zu bewerten.' });
    }

    const distroKey = normalizeDistroKey(req.params.distroKey);
    const rawRating = Number(req.body?.rating);
    const distroName = normalizeDistroName(req.body?.distroName, req.body?.fallbackName || req.params.distroKey);
    const message = trimReviewMessage(req.body?.message);

    if (!distroKey) {
      return res.status(400).json({ error: 'Ungültige Distro.' });
    }

    if (!Number.isFinite(rawRating) || rawRating < 1 || rawRating > 5) {
      return res.status(400).json({ error: 'Bewertung muss zwischen 1 und 5 Sternen liegen.' });
    }

    if (message.length > MAX_DISTRO_REVIEW_LENGTH) {
      return res.status(400).json({ error: 'Die Nachricht ist zu lang.' });
    }

    const userRecord = db.prepare('SELECT id, is_restricted FROM users WHERE id = ?').get(req.session.userId);
    if (!userRecord) {
      return res.status(401).json({ error: 'Ungültige Session.' });
    }

    if (userRecord.is_restricted === 1) {
      return res.status(403).json({ error: 'Eingeschränkte Konten können keine Bewertungen abgeben.' });
    }

    try {
      db.prepare(`
        INSERT INTO distro_reviews (distro_key, distro_name, rating, message, user_id, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))
        ON CONFLICT(distro_key, user_id) DO UPDATE SET
          rating = excluded.rating,
          message = excluded.message,
          distro_name = excluded.distro_name,
          updated_at = datetime('now')
      `).run(distroKey, distroName || distroKey, rawRating, message || null, userRecord.id);

      touchUserActivity(userRecord.id);

      const payload = getDistroRatingsPayload(distroKey, userRecord.id);
      return res.status(201).json({ message: 'Bewertung gespeichert.', ...payload });
    } catch (err) {
      console.error('[CREATE DISTRO RATING ERROR]', err);
      return res.status(500).json({ error: 'Bewertung konnte nicht gespeichert werden.' });
    }
  });

  router.get('/distros/saved', (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Du musst angemeldet sein, um gespeicherte Distros zu sehen.' });
    }

    try {
      const userRecord = db.prepare('SELECT id FROM users WHERE id = ?').get(req.session.userId);
      if (!userRecord) {
        return res.status(401).json({ error: 'Ungültige Session.' });
      }

      const savedDistros = db.prepare(`
        SELECT distro_key, distro_name, created_at
        FROM saved_distros
        WHERE user_id = ?
        ORDER BY distro_name COLLATE NOCASE ASC, created_at DESC
      `).all(userRecord.id);

      return res.json({
        maxSaved: MAX_SAVED_DISTROS,
        count: Array.isArray(savedDistros) ? savedDistros.length : 0,
        savedDistros: Array.isArray(savedDistros) ? savedDistros : []
      });
    } catch (err) {
      console.error('[GET SAVED DISTROS ERROR]', err);
      return res.status(500).json({ error: 'Gespeicherte Distros konnten nicht geladen werden.' });
    }
  });

  router.post('/distros/:distroKey/saved', (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Du musst angemeldet sein, um Distros zu speichern.' });
    }

    const distroKey = normalizeDistroKey(req.params.distroKey);
    const distroName = normalizeDistroName(req.body?.distroName, req.body?.fallbackName || req.params.distroKey);

    if (!distroKey) {
      return res.status(400).json({ error: 'Ungültige Distro.' });
    }

    try {
      const userRecord = db.prepare('SELECT id, is_restricted FROM users WHERE id = ?').get(req.session.userId);
      if (!userRecord) {
        return res.status(401).json({ error: 'Ungültige Session.' });
      }

      if (userRecord.is_restricted === 1) {
        return res.status(403).json({ error: 'Eingeschränkte Konten können keine Distros speichern.' });
      }

      const existing = db.prepare(`
        SELECT id
        FROM saved_distros
        WHERE user_id = ? AND distro_key = ?
      `).get(userRecord.id, distroKey);

      if (existing) {
        return res.json({
          message: 'Distro ist bereits gespeichert.',
          saved: true,
          maxSaved: MAX_SAVED_DISTROS
        });
      }

      const savedCountRow = db.prepare(`
        SELECT COUNT(*) AS count
        FROM saved_distros
        WHERE user_id = ?
      `).get(userRecord.id);

      const savedCount = Number(savedCountRow?.count || 0);
      if (savedCount >= MAX_SAVED_DISTROS) {
        return res.status(400).json({
          error: `Du kannst maximal ${MAX_SAVED_DISTROS} Distros gleichzeitig speichern.`,
          maxSaved: MAX_SAVED_DISTROS
        });
      }

      db.prepare(`
        INSERT INTO saved_distros (user_id, distro_key, distro_name, created_at)
        VALUES (?, ?, ?, datetime('now'))
      `).run(userRecord.id, distroKey, distroName || distroKey);

      touchUserActivity(userRecord.id);

      return res.status(201).json({
        message: 'Distro gespeichert.',
        saved: true,
        maxSaved: MAX_SAVED_DISTROS
      });
    } catch (err) {
      console.error('[SAVE DISTRO ERROR]', err);
      return res.status(500).json({ error: 'Distro konnte nicht gespeichert werden.' });
    }
  });

  router.delete('/distros/:distroKey/saved', (req, res) => {
    if (!req.session?.userId) {
      return res.status(401).json({ error: 'Du musst angemeldet sein, um Distros zu entfernen.' });
    }

    const distroKey = normalizeDistroKey(req.params.distroKey);
    if (!distroKey) {
      return res.status(400).json({ error: 'Ungültige Distro.' });
    }

    try {
      const userRecord = db.prepare('SELECT id FROM users WHERE id = ?').get(req.session.userId);
      if (!userRecord) {
        return res.status(401).json({ error: 'Ungültige Session.' });
      }

      db.prepare(`
        DELETE FROM saved_distros
        WHERE user_id = ? AND distro_key = ?
      `).run(userRecord.id, distroKey);

      touchUserActivity(userRecord.id);

      return res.json({
        message: 'Distro entfernt.',
        saved: false,
        maxSaved: MAX_SAVED_DISTROS
      });
    } catch (err) {
      console.error('[REMOVE SAVED DISTRO ERROR]', err);
      return res.status(500).json({ error: 'Distro konnte nicht entfernt werden.' });
    }
  });

  return router;
}

module.exports = createAuthCoreRouter;
