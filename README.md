# TuxoraQuest – Auth, Profile & Suche

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
	- Interaktiver Kalender-Picker für einfache Navigation
- Sternzeichen-Icon im öffentlichen Profil anzeigen (wenn Geburtsdatum gesetzt ist)
	- Klick auf das Sternzeichen-Icon öffnet den passenden Wikipedia-Artikel
- Optionalen Glauben speichern (Atheismus, Christentum, Islam, Judentum, Hinduismus, Buddhismus, Daoismus, Shintoismus)
	- Optional: Bekenntnis/Subkategorie hinzufügen
	- Im öffentlichen Profil erscheint ein passendes Glaubens-Icon
	- Klick auf das Glaubens-Icon öffnet den passenden Wikipedia-Artikel
- Im öffentlichen Usermodal stehen Profilname und Pronomen zentriert nebeneinander, Pronomen in hellerer Darstellung
- Im öffentlichen Usermodal erscheint die Bio in einer Box unter „Follower | Folge ich"
- Akzentfarbe fürs Profil auswählen
	- Interaktiver Farbwähler (HSL + Hex-Input)
- Avatar-Künstler-Attribution (optionale URL zum Urheber)
- Konto löschen (mit Passwort-Bestätigung)
- Geschützte Projektkonten können nicht gelöscht werden

#### Schnelltest: Geburtsdatum & Sternzeichen
1. Einloggen und Profil öffnen.
2. Im Feld „Geburtsdatum“ einen Wert im Format `dd/mm/yyyy` eintragen (z. B. `21/03/2000`) und speichern.
3. Das öffentliche Profil des Accounts öffnen.
4. In der Username-Zeile prüfen: Direkt nach dem Link-Icon erscheint das Sternzeichen-Icon passend zum Datum.
5. Optional im Feld „Glaube“ einen Eintrag auswählen und speichern.
6. Im öffentlichen Profil prüfen: Das Glaubens-Icon erscheint nach dem Sternzeichen-Icon (oder nach dem Link-Icon, falls kein Geburtsdatum gesetzt ist) und öffnet beim Klick Wikipedia.
7. Negativtest: Ungültiges Datum wie `31/02/2000` oder falsches Format wie `2000-03-21` speichern → Validierungsfehler sollte angezeigt werden.

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
- Klick auf Treffer öffnet direkt das jeweilige Profil

### Distro Finder & Bewertungen
- Kuratierte Distro-Liste mit Logos, Codebase, Länder-Herkunft, Tags und ISO-Größe
- Filter: Tags (Multi-Select), Codebase-Dropdown, Länder-Picker mit Flaggen (Multi-Select), ISO-Größen-Slider (Min/Max)
- Detail-Modal mit Beschreibung, Doku-Link, Download-Link und optionalem Video-Trailer (YouTube-nocookie, erst beim Klick geladen)
- Bewertungen: 1–5 Sterne pro Nutzer*in und Distro, optionaler Review-Text
- Aggregierte Anzeige (Durchschnitt, Sterne, Anzahl), Review-Liste, „Bewertung bearbeiten“-Flow

### Lokaler Custom-Background
- Nur für eingeloggte Nutzer im Profil konfigurierbar
- Wird ausschließlich lokal im Browser gespeichert (nicht serverseitig synchronisiert)
- Avatar-Upload-Limit: standardmäßig 8 MB (konfigurierbar via `.env`)
- Custom-Cursor (lokal im Browser)
- Custom-Pointer (lokal im Browser)

### System/Backend
- Express-Server mit SQLite (Node.js built-in)
- Avatar-Uploads über Multer
- Mailversand über SMTP oder Resend
- Rollenbasiertes Zugriffssystem (User, Moderator, Administrator, Developer)
- Early-Supporter-Status für Account (automatisch für Accounts vor 2026-06-18)
- Benutzer-Einschränkungen und Sperrungen mit Freigabeanfragen

### Admin & Moderations-Funktionen
- Benutzer-Verwaltung (Liste, Suche, Löschen)
- Moderator/Developer-Rollen verwalten (Toggle)
- Benutzer-Sperrung (Restriction)
- Benutzer-Meldungssystem
  - Nutzer können Profile melden (mit Grund)
  - Admin/Moderator können alle Meldungen zu einem Nutzer sehen
  - Meldungen können geschlossen werden
  - Reporter-Informationen werden erfasst (Nutzername, Vollname, Zeitstempel)
- Benutzer-Freigabeanfragen
  - Gesperrte Benutzer können um Freigabe ersuchen
  - Admin/Moderator können Anfragen genehmigen oder ablehnen

### Developer-Funktionen
- Bug/Fehler-Meldungssystem
  - Nutzer können Bugs durch Klick auf Logo melden
  - Basis-Informationen werden erfasst (Benutzername, Nachricht, Zeitstempel)
- Bug-Report-Panel
  - Alle eingereichten Bugs ansehen
  - Bugs mit Statusanzeige (offen/geschlossen)
  - Einzelne Bugs schließen

### Weitere Funktionen
- PWA (Progressive Web App)
  - Service Worker für Offline-Unterstützung
  - Installationsprompt
  - Auto-Update bei Controller-Wechsel
- Projekt-Kontakt-Modal (zeigt Kontaktinfo von Armand & Jost)
- Sicherheitsheader via Helmet
- CORS mit konfigurierbaren Origins
- Rate-Limiting für API und Auth-Endpunkte

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
SESSION_SECRET=replace-this-with-at-least-32-characters
CORS_ORIGIN=http://localhost:3000
```

### Security-relevante optionale Variablen

```env
# Mehrere Origins per Komma möglich
CORS_ORIGINS=http://localhost:3000,https://deine-domain.de

# API-Ratenbegrenzung
API_RATE_LIMIT_MAX=500
AUTH_WRITE_RATE_LIMIT_MAX=60

# Max. Avatar-Dateigröße in MB (1-10)
MAX_AVATAR_SIZE_MB=8
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

## Smoke-Test

Diese Checkliste prüft die wichtigsten Funktionen manuell im Browser.

### Vorbereitung
1. Server starten: `npm run dev` (oder `npm start`).
2. App öffnen: `http://localhost:3000`.
3. Test-Accounts vorbereiten:
	- Normaler Benutzer (Registration/Login)
	- Admin/Moderator-Account (für Admin-Panel)

### Authentifizierung & Profil
1. **Registrierung** mit `@tha.de`-E-Mail testen.
	- Verifikationscode per Mail sollte ankommen.
	- Account sollte aktiviert werden nach Code-Eingabe.
2. **Login** mit E-Mail oder Benutzername.
	- Session sollte bestehen bleiben nach Reload.
3. **Profil bearbeiten**:
	- Avatar hochladen (< 8 MB).
	- Pronomen, Bio, Geburtsdatum, Glaube setzen.
	- Akzentfarbe ändern.
	- Alle Änderungen sollten gespeichert werden.

### Öffentliche Profile & Social
1. Eigenes öffentliches Profil ansehen.
	- Alle Daten sollten korrekt angezeigt werden.
	- Sternzeichen-Icon sollte beim Geburtsdatum angezeigt werden.
2. Anderes Profil aufrufen und **folgen/entfolgen** testen.
	- Follower-Zähler sollte sich aktualisieren.

### Suche
1. Live-Suche modal öffnen.
2. Nach Benutzernamen & Anzeigenamen suchen.
	- Ergebnisse sollten in separaten Listen erscheinen.
	- Klick auf Treffer sollte Profil öffnen.

### Bug-Report
1. Logo klicken → Bug-Report-Modal öffnen.
2. Bug-Text eingeben und absenden.
	- Erfolgsmeldung sollte angezeigt werden.

### Admin-Panel (als Moderator/Admin)
Über Navigationsverweis zugänglich:
1. **Benutzer-Liste** ansehen und durchsuchen.
2. **Person-Tickets** öffnen:
	- **Meldungen** Tab: Benutzer-Meldungen ansehen/schließen.
	- **Bugs** Tab: Bug-Reports ansehen/schließen.
	- **Freigaben** Tab: Entbannungs-Anfragen genehmigen/ablehnen.

## Roadmap
- Erweiterte Filterung in Admin-Panel
- Statistik-Dashboard (Nutzer-Aktivität, Reports, etc.)
- Weitere Social-Features (Direct Messages, etc.)
- Mobile App Optimization
