# LinuxQuest – Auth, Profile & Suche

Diese Anwendung ist eine responsive Web-App mit Authentifizierung, Profilverwaltung und öffentlicher Profilansicht.

## Aktueller Funktionsumfang

### Authentifizierung
- Registrierung mit Verifizierungscode per E-Mail (`@tha.de`)
- Login mit E-Mail oder Benutzername
- Passwort-Reset mit Verifizierungscode
- Session-basierter Login (express-session)

### Profil
- Profilbild hochladen/aktualisieren
- Vollständigen Namen und Benutzernamen bearbeiten
- Profilname (Anzeigename) setzen
	- Frei wählbar (inkl. Sonderzeichen/Emoji)
	- Maximal 20 Zeichen
	- Optional (leer = keine Anzeige)
- Akzentfarbe fürs Profil auswählen
- Konto löschen (mit Passwort-Bestätigung)
- Geschützte Projektkonten können nicht gelöscht werden

### Öffentliche Profile & Social
- Öffentliche Profilansicht für alle Accounts
- Profil-Link teilen/kopieren
- Follower/Folge ich-System
- Listenansicht für Follower und gefolgte Profile

### Suche
- Live-Suche im Such-Modal
- Ergebnisse in getrennten Listen:
	- Anzeigename
	- Username
	- Echter Name
- Klick auf Treffer öffnet direkt das jeweilige Profil

### Lokaler Custom-Background
- Nur für eingeloggte Nutzer im Profil konfigurierbar
- Wird ausschließlich lokal im Browser gespeichert (nicht serverseitig synchronisiert)
- Upload-Limit: bis zu 25 MB

### System/Backend
- Express-Server mit SQLite (Node.js built-in SQLite)
- Avatar-Uploads über Multer
- Inaktive Accounts werden serverseitig periodisch bereinigt
- Mailversand über SMTP oder Resend

## Tech-Stack
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- Datenbank: SQLite
- Auth/Sessions: express-session
- Uploads: Multer

## Voraussetzungen
- Node.js 22+

## Installation & Start

```bash
npm install
npm start
```

Danach im Browser öffnen:

`http://localhost:3000`

Für Entwicklung mit Auto-Reload:

```bash
npm run dev
```

## Konfiguration (Umgebungsvariablen)

Lege eine `.env` im Projektverzeichnis an.

### Mindest-Setup

```env
SESSION_SECRET=replace-this-in-production
```

### SMTP (z. B. lokal mit Gmail App-Passwort)

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-account@gmail.com
SMTP_PASS=your16digitapppassword
SMTP_FROM=your-account@gmail.com
SESSION_SECRET=replace-this-in-production
```

### Resend (empfohlen für Railway)

```env
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
RESEND_FROM=noreply@deine-verifizierte-domain.de
SESSION_SECRET=dein-langer-geheimer-wert
```

Hinweis: Wenn `RESEND_API_KEY` gesetzt ist, werden `SMTP_*`-Variablen ignoriert.

## Deployment-Hinweise
- Auf Railway sollte für persistente Daten ein `DATA_DIR` gesetzt werden.
- Server-Logs zeigen beim Start, ob Mailversand korrekt konfiguriert ist.

## Roadmap (kurz)
- Weitere Suchkategorien/Objekttypen
- Ausbau der Ergebnisse und Relevanzlogik
- Zusätzliche Profil- und Community-Features
