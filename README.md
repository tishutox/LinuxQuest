# Responsive Navbar With Search & Login
## [Watch it on youtube](https://youtu.be/kviVE1t06Rg)
### Responsive Navbar With Search & Login

- Responsive Navbar Using HTML CSS & JavaScript
- It contains a search box & a login form
- Developed first with the Mobile First methodology, then for desktop.
- Compatible with all mobile devices and with a beautiful and pleasant user interface.

💙 Join the channel to see more videos like this. [Bedimcode](https://www.youtube.com/@Bedimcode)

![preview img](/preview.png)

## SMTP setup

Create a `.env` file in the project root before starting the server:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-account@gmail.com
SMTP_PASS=your16digitapppassword
SMTP_FROM=your-account@gmail.com
SESSION_SECRET=replace-this-in-production
```

For Gmail, use an App Password with 2-factor authentication enabled. If you copy the password from Google with spaces, the server now normalizes it automatically.

Start the app with `npm start` and open `http://localhost:3000`. The server prints SMTP verification details on startup and logs whether a verification email was accepted by the SMTP server.

In deployments, `.env` is usually not present because it is ignored by Git. Set the `SMTP_*` variables in your hosting provider dashboard. Without them, the app now returns an explicit error instead of pretending the email was sent.

If sending times out on Railway, try these values first for Gmail:

```env
SMTP_SERVICE=gmail
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_CONNECTION_TIMEOUT=10000
SMTP_GREETING_TIMEOUT=10000
SMTP_SOCKET_TIMEOUT=15000
```
