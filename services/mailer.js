const nodemailer = require('nodemailer');

function cleanEnvValue(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function getMailConfig() {
  const host = cleanEnvValue(process.env.SMTP_HOST);
  const service = cleanEnvValue(process.env.SMTP_SERVICE);
  const user = cleanEnvValue(process.env.SMTP_USER);
  const from = cleanEnvValue(process.env.SMTP_FROM) || user || 'noreply@tha.de';
  const rawPass = typeof process.env.SMTP_PASS === 'string' ? process.env.SMTP_PASS.trim() : '';
  const isGmail = service.toLowerCase() === 'gmail' || host.toLowerCase() === 'smtp.gmail.com';
  const pass = isGmail ? rawPass.replace(/\s+/g, '') : rawPass;

  let port = parseInt(cleanEnvValue(process.env.SMTP_PORT) || '587', 10);
  if (!Number.isInteger(port) || port <= 0) {
    port = 587;
  }

  return {
    host,
    port,
    service,
    user,
    pass,
    from,
    isConfigured: Boolean((service || host) && user && pass)
  };
}

function createMailTransport() {
  const config = getMailConfig();

  if (!config.isConfigured) {
    return nodemailer.createTransport({ jsonTransport: true });
  }

  const transportConfig = {
    port: config.port,
    secure: config.port === 465,
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
    return { ok: false, skipped: true, reason: 'missing-config' };
  }

  try {
    const transport = createMailTransport();
    await transport.verify();
    return { ok: true, skipped: false };
  } catch (error) {
    return { ok: false, skipped: false, error };
  }
}

module.exports = {
  createMailTransport,
  getMailConfig,
  verifyMailTransport
};