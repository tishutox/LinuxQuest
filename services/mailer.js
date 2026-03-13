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
  const resendFrom = cleanEnvValue(process.env.RESEND_FROM);

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

  // Resend takes priority over raw SMTP when RESEND_API_KEY is set
  if (resendApiKey) {
    return {
      provider: 'resend',
      resendApiKey,
      from: resendFrom || cleanEnvValue(process.env.SMTP_FROM) || user || 'noreply@tha.de',
      allowConsoleFallback,
      isConfigured: true
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

function createMailTransport() {
  const config = getMailConfig();

  if (!config.isConfigured) {
    if (!config.allowConsoleFallback) {
      throw new Error('Email delivery is not configured for this environment.');
    }
    return nodemailer.createTransport({ jsonTransport: true });
  }

  // Resend: uses their SMTP relay over HTTPS-backed infrastructure
  // Works on cloud providers (Railway, Render, …) that block raw SMTP
  if (config.provider === 'resend') {
    return nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: config.resendApiKey
      }
    });
  }

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

async function verifyMailTransport() {
  const config = getMailConfig();

  if (!config.isConfigured) {
    return {
      ok: false,
      skipped: true,
      reason: 'missing-config',
      allowConsoleFallback: config.allowConsoleFallback
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