const crypto = require("crypto");
const { db } = require("./data");

if (process.env.NODE_ENV === "production" && String(process.env.JWT_SECRET || "").length < 32) {
  throw new Error("生产环境必须配置至少 32 位的 JWT_SECRET");
}

const SECRET = process.env.JWT_SECRET || "coffee-book-dev-secret";
const TOKEN_TTL_SECONDS = 24 * 60 * 60;
const attempts = new Map();

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function sign(payload, ttlSeconds = TOKEN_TTL_SECONDS) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = base64url(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + ttlSeconds }));
  const signature = crypto.createHmac("sha256", SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  try {
    if (!token) return null;
    const [header, body, signature] = token.split(".");
    if (!header || !body || !signature) return null;
    const expected = crypto.createHmac("sha256", SECRET).update(`${header}.${body}`).digest("base64url");
    if (signature.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

function bearer(req) {
  return String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
}

function currentUser(req) {
  const payload = verifyToken(bearer(req));
  if (!payload || payload.type !== "user") return null;
  return db.users.find((user) => user.id === payload.id) || null;
}

function currentAdmin(req) {
  const payload = verifyToken(bearer(req));
  if (!payload || payload.type !== "admin") return null;
  return db.admins.find((admin) => admin.id === payload.id) || null;
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    level: user.level,
    points: user.points,
    avatar: user.avatar || "",
    levelProgress: user.levelProgress || 0,
    lastCheckIn: user.lastCheckIn || "",
    showProfile: user.showProfile !== false
  };
}

function loginAllowed(key) {
  const item = attempts.get(key);
  if (!item || item.until < Date.now()) return true;
  return item.count < 5;
}

function recordLoginFailure(key) {
  const current = attempts.get(key);
  const count = current && current.until > Date.now() ? current.count + 1 : 1;
  attempts.set(key, { count, until: Date.now() + 10 * 60 * 1000 });
}

function clearLoginFailures(key) {
  attempts.delete(key);
}

module.exports = {
  clearLoginFailures,
  currentAdmin,
  currentUser,
  loginAllowed,
  publicUser,
  recordLoginFailure,
  sign
};
