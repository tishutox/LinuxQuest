const PROTECTED_EMAILS = Object.freeze([
  'armand.patrick.asztalos@tha.de',
  'jost.witthauer@tha.de'
]);

const PROTECTED_KEYWORDS = Object.freeze([
  'armand',
  'jost'
]);

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function isProtectedEmail(email) {
  return PROTECTED_EMAILS.includes(normalizeEmail(email));
}

module.exports = {
  PROTECTED_EMAILS,
  PROTECTED_KEYWORDS,
  isProtectedEmail,
  normalizeEmail
};