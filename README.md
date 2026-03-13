# Responsive Navbar With Search & Login
## [Watch it on youtube](https://youtu.be/kviVE1t06Rg)
### Responsive Navbar With Search & Login

- Responsive Navbar Using HTML CSS & JavaScript
- It contains a search box & a login form
- Developed first with the Mobile First methodology, then for desktop.
- Compatible with all mobile devices and with a beautiful and pleasant user interface.

💙 Join the channel to see more videos like this. [Bedimcode](https://www.youtube.com/@Bedimcode)

![preview img](/preview.png)

## Mail setup

### Lokal (`.env`-Datei im Projektordner)

Gmail mit App-Passwort funktioniert lokal:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-account@gmail.com
SMTP_PASS=your16digitapppassword
SMTP_FROM=your-account@gmail.com
SESSION_SECRET=replace-this-in-production
```

Bei Gmail ein App-Passwort unter Google-Konto → Sicherheit → 2-Schritt-Verifizierung → App-Passwörter erstellen.

### Railway (und andere Cloud-Hoster)

Railway blockiert ausgehende SMTP-Verbindungen (Ports 25, 465, 587). Deshalb muss auf **Resend** als Mail-Dienst gewechselt werden.

1. Kostenlosen Account auf [resend.com](https://resend.com) erstellen (3.000 Mails/Monat gratis).
2. Eine Domain verifizieren **oder** `onboarding@resend.dev` als Absender nutzen (nur zum Testen, sendet nur an die eigene Resend-Account-Adresse).
3. Einen API-Key unter *API Keys* erstellen.
4. In Railway unter *Variables* setzen:

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM=noreply@deine-verifizierte-domain.de
SESSION_SECRET=dein-langer-geheimer-wert
```

Wenn `RESEND_API_KEY` gesetzt ist, ignoriert die App die `SMTP_*`-Variablen vollständig.

Start the app with `npm start` and open `http://localhost:3000`. The server logs which mail provider is active on startup.
