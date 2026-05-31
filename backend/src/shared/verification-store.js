const crypto = require("crypto");
const { createClient } = require("redis");

const isProduction = process.env.NODE_ENV === "production";
const redisUrl = process.env.REDIS_URL || "";

let redisClient = null;
const memoryStore = new Map();

async function initVerificationStore() {
  if (isProduction && !redisUrl) {
    throw new Error("生产环境必须配置 REDIS_URL，用 Redis 存储验证码");
  }

  if (!redisUrl) return;

  redisClient = createClient({ url: redisUrl });
  redisClient.on("error", (error) => {
    console.error("Redis error:", error.message);
  });
  await redisClient.connect();
  console.log("Redis connected for verification codes");
}

function randomToken() {
  return crypto.randomBytes(18).toString("hex");
}

function randomDigits(length = 6) {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return String(Math.floor(min + Math.random() * (max - min)));
}

async function setValue(key, value, ttlSeconds) {
  if (redisClient) {
    await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
    return;
  }
  memoryStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
}

async function getValue(key) {
  if (redisClient) {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  }
  const item = memoryStore.get(key);
  if (!item) return null;
  if (item.expiresAt < Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  return item.value;
}

async function deleteValue(key) {
  if (redisClient) {
    await redisClient.del(key);
    return;
  }
  memoryStore.delete(key);
}

function createCaptchaSvg(text) {
  const jitter = Array.from(text).map((char, index) => {
    const x = 24 + index * 24;
    const y = 38 + Math.floor(Math.random() * 8);
    const rotate = Math.floor(Math.random() * 24) - 12;
    return `<text x="${x}" y="${y}" transform="rotate(${rotate} ${x} ${y})">${char}</text>`;
  }).join("");

  const lines = Array.from({ length: 5 }).map(() => {
    const x1 = Math.floor(Math.random() * 150);
    const y1 = Math.floor(Math.random() * 54);
    const x2 = Math.floor(Math.random() * 150);
    const y2 = Math.floor(Math.random() * 54);
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" />`;
  }).join("");

  return `data:image/svg+xml;base64,${Buffer.from(`
    <svg xmlns="http://www.w3.org/2000/svg" width="150" height="54" viewBox="0 0 150 54">
      <rect width="150" height="54" rx="10" fill="#fffaf5"/>
      <g stroke="#c58a3b" stroke-width="1.2" opacity="0.55">${lines}</g>
      <g font-family="Arial, sans-serif" font-size="26" font-weight="700" fill="#326a5d">${jitter}</g>
    </svg>
  `).toString("base64")}`;
}

async function createCaptcha() {
  const token = randomToken();
  const answer = randomDigits(4);
  await setValue(`captcha:${token}`, { answer }, 180);
  return { token, image: createCaptchaSvg(answer), expiresIn: 180 };
}

async function verifyCaptcha(token, answer) {
  if (!token || !answer) return false;
  const item = await getValue(`captcha:${token}`);
  if (!item) return false;
  await deleteValue(`captcha:${token}`);
  return String(item.answer).toLowerCase() === String(answer).trim().toLowerCase();
}

async function createSmsCode(phone) {
  const cooldownKey = `sms-cooldown:${phone}`;
  if (await getValue(cooldownKey)) {
    throw new Error("验证码发送过于频繁，请稍后再试");
  }
  const code = randomDigits(6);
  await setValue(`sms:${phone}`, { code }, 300);
  await setValue(cooldownKey, { active: true }, 60);
  if (!isProduction) {
    console.log(`[dev sms] ${phone}: ${code}`);
  }
  return { expiresIn: 300 };
}

async function verifySmsCode(phone, code) {
  if (!phone || !code) return false;
  const item = await getValue(`sms:${phone}`);
  if (!item) return false;
  const matched = String(item.code) === String(code).trim();
  if (matched) {
    await deleteValue(`sms:${phone}`);
    await deleteValue(`sms-fail:${phone}`);
    return true;
  }
  const failureKey = `sms-fail:${phone}`;
  const failure = await getValue(failureKey);
  const count = Number(failure?.count || 0) + 1;
  if (count >= 5) {
    await deleteValue(`sms:${phone}`);
    await deleteValue(failureKey);
    return false;
  }
  await setValue(failureKey, { count }, 300);
  return matched;
}

module.exports = {
  createCaptcha,
  createSmsCode,
  initVerificationStore,
  verifyCaptcha,
  verifySmsCode
};
