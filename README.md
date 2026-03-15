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
- Optionale Pronomen speichern (max. 30 Zeichen)
	- Live-Zeichenzähler (`0/30`) direkt unter dem Eingabefeld
- Optionale Bio speichern (max. 200 Zeichen, Zeilenumbrüche erlaubt)
	- Live-Zeichenzähler (`0/200`) direkt unter dem Eingabefeld
- Optionales Geburtsdatum speichern (`dd/mm/yyyy`)
- Sternzeichen-Icon im öffentlichen Profil anzeigen (wenn Geburtsdatum gesetzt ist)
	- Klick auf das Sternzeichen-Icon öffnet den passenden Wikipedia-Artikel
- Im öffentlichen Usermodal stehen Profilname und Pronomen zentriert nebeneinander, Pronomen in hellerer Darstellung
- Im öffentlichen Usermodal erscheint die Bio in einer Box unter „Follower | Folge ich“
- Akzentfarbe fürs Profil auswählen
- Konto löschen (mit Passwort-Bestätigung)
- Geschützte Projektkonten können nicht gelöscht werden

#### Schnelltest: Geburtsdatum & Sternzeichen
1. Einloggen und Profil öffnen.
2. Im Feld „Geburtsdatum“ einen Wert im Format `dd/mm/yyyy` eintragen (z. B. `21/03/2000`) und speichern.
3. Das öffentliche Profil des Accounts öffnen.
4. In der Username-Zeile prüfen: Direkt nach dem Link-Icon erscheint das Sternzeichen-Icon passend zum Datum.
5. Negativtest: Ungültiges Datum wie `31/02/2000` oder falsches Format wie `2000-03-21` speichern → Validierungsfehler sollte angezeigt werden.

#### QA-Beispiele (Datum → Sternzeichen)
| Geburtsdatum | Erwartetes Sternzeichen |
|---|---|
| `21/03/2000` | Widder |
| `15/08/1999` | Löwe |
| `05/12/2001` | Schütze |
| `10/01/1998` | Steinbock |

#### Sternzeichen-Grenzwerte (dd/mm)
- Wassermann: `20/01`–`18/02`
- Fische: `19/02`–`20/03`
- Widder: `21/03`–`19/04`
- Stier: `20/04`–`20/05`
- Zwillinge: `21/05`–`20/06`
- Krebs: `21/06`–`22/07`
- Löwe: `23/07`–`22/08`
- Jungfrau: `23/08`–`22/09`
- Waage: `23/09`–`22/10`
- Skorpion: `23/10`–`21/11`
- Schütze: `22/11`–`21/12`
- Steinbock: `22/12`–`19/01`

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
