const crypto = require("crypto");

const PREFIX = "scrypt";

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const digest = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return `${PREFIX}$${salt}$${digest}`;
}

function verifyPassword(password, stored) {
  if (!stored) return false;
  if (!String(stored).startsWith(`${PREFIX}$`)) return String(password) === String(stored);
  const [, salt, expected] = String(stored).split("$");
  const digest = crypto.scryptSync(String(password), salt, 64).toString("hex");
  return expected.length === digest.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(digest));
}

function needsUpgrade(stored) {
  return !String(stored || "").startsWith(`${PREFIX}$`);
}

module.exports = { hashPassword, needsUpgrade, verifyPassword };
