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
