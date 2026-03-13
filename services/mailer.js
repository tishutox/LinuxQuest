const nodemailer = require('nodemailer');

function cleanEnvValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function parsePositiveInt(value, fallback) {
  const parsed = parseInt(cleanEnvValue(value), 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getMailConfig() {
  const resendApiKey = cleanEnvValue(process.env.RESEND_API_KEY);
  const resendFrom = cleanEnvValue(process.env.RESEND_FROM) || cleanEnvValue(process.env.SMTP_FROM);
  const resendApiUrl = cleanEnvValue(process.env.RESEND_API_URL) || 'https://api.resend.com/emails';
  const resendApiTimeout = parsePositiveInt(process.env.RESEND_API_TIMEOUT, 15000);

  const host = cleanEnvValue(process.env.SMTP_HOST);
  const service = cleanEnvValue(process.env.SMTP_SERVICE);
  const user = cleanEnvValue(process.env.SMTP_USER);
  const rawPass = typeof process.env.SMTP_PASS === 'string' ? process.env.SMTP_PASS.trim() : '';
  const isGmail = service.toLowerCase() === 'gmail' || host.toLowerCase() === 'smtp.gmail.com';
  const pass = isGmail ? rawPass.replace(/\s+/g, '') : rawPass;
  const nodeEnv = cleanEnvValue(process.env.NODE_ENV).toLowerCase();
  const allowConsoleFallback = cleanEnvValue(process.env.MAIL_ALLOW_CONSOLE_FALLBACK).toLowerCase() === 'true'
    || (!nodeEnv || nodeEnv === 'development');

  const port = parsePositiveInt(process.env.SMTP_PORT, 587);
  const connectionTimeout = parsePositiveInt(process.env.SMTP_CONNECTION_TIMEOUT, 10000);
  const greetingTimeout = parsePositiveInt(process.env.SMTP_GREETING_TIMEOUT, 10000);
  const socketTimeout = parsePositiveInt(process.env.SMTP_SOCKET_TIMEOUT, 15000);

  if (resendApiKey) {
    return {
      provider: 'resend',
      resendApiKey,
      resendApiUrl,
      resendApiTimeout,
      from: resendFrom,
      allowConsoleFallback,
      isConfigured: Boolean(resendFrom)
    };
  }

  const from = cleanEnvValue(process.env.SMTP_FROM) || user || 'noreply@tha.de';

  return {
    provider: 'smtp',
    host,
    port,
    service,
    user,
    pass,
    from,
    connectionTimeout,
    greetingTimeout,
    socketTimeout,
    allowConsoleFallback,
    isConfigured: Boolean((service || host) && user && pass)
  };
}

function createResendTransport(config) {
  return {
    async verify() {
      if (!config.resendApiKey || !config.from) {
        throw new Error('Resend is not configured for this environment.');
      }
      return true;
    },
    async sendMail(message) {
      const recipients = Array.isArray(message.to) ? message.to : [message.to];

      try {
        const response = await fetch(config.resendApiUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${config.resendApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            from: message.from || config.from,
            to: recipients,
            subject: message.subject,
            html: message.html,
            text: message.text
          }),
          signal: AbortSignal.timeout(config.resendApiTimeout)
        });

        let payload = {};
        try {
          payload = await response.json();
        } catch (_error) {
          payload = {};
        }

        if (!response.ok) {
          const error = new Error(
            payload.message || payload.error || `Resend API request failed with status ${response.status}.`
          );
          error.code = response.status === 401 ? 'EAUTH' : response.status === 403 ? 'EFORBIDDEN' : 'ERESEND';
          error.responseCode = response.status;
          error.response = JSON.stringify(payload);
          throw error;
        }

        return {
          messageId: payload.id || null,
          accepted: recipients,
          rejected: [],
          response: payload.id || null
        };
      } catch (error) {
        if (error?.name === 'AbortError' || error?.name === 'TimeoutError') {
          error.code = 'ETIMEDOUT';
        }
        throw error;
      }
    }
  };
}

function createSmtpTransport(config) {
  const transportConfig = {
    port: config.port,
    secure: config.port === 465,
    connectionTimeout: config.connectionTimeout,
    greetingTimeout: config.greetingTimeout,
    socketTimeout: config.socketTimeout,
    auth: {
      user: config.user,
      pass: config.pass
    }
  };

  if (config.service) {
    transportConfig.service = config.service;
  } else {
    transportConfig.host = config.host;
  }

  return nodemailer.createTransport(transportConfig);
}

function createMailTransport() {
  const config = getMailConfig();

  if (!config.isConfigured) {
    if (!config.allowConsoleFallback) {
      throw new Error('Email delivery is not configured for this environment.');
    }
    return nodemailer.createTransport({ jsonTransport: true });
  }

  if (config.provider === 'resend') {
    return createResendTransport(config);
  }

  return createSmtpTransport(config);
}

async function verifyMailTransport() {
  const config = getMailConfig();

  if (!config.isConfigured) {
    return {
      ok: false,
      skipped: true,
      reason: 'missing-config',
      allowConsoleFallback: config.allowConsoleFallback,
      provider: config.provider || 'smtp'
    };
  }

  try {
    const transport = createMailTransport();
    await transport.verify();
    return { ok: true, skipped: false, provider: config.provider || 'smtp' };
  } catch (error) {
    return { ok: false, skipped: false, provider: config.provider || 'smtp', error };
  }
}

module.exports = {
  createMailTransport,
  getMailConfig,
  verifyMailTransport
};
