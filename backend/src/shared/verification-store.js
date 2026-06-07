const crypto = require("crypto");
const { createClient } = require("redis");

const isProduction = process.env.NODE_ENV === "production";
const redisUrl = process.env.REDIS_URL || "";

const CAPTCHA_TTL_SECONDS = 180;
const SMS_TTL_SECONDS = 300;
const SMS_COOLDOWN_SECONDS = 60;
const SLIDER_TTL_SECONDS = 180;
const MAX_VERIFY_ATTEMPTS = 5;
const MAX_VERIFY_FAILURES = 5;
const SLIDER_TOLERANCE = 3;
const SLIDER_MIN_ELAPSED_MS = 250;
const SLIDER_MAX_ELAPSED_MS = SLIDER_TTL_SECONDS * 1000;
const CLOCK_SKEW_MS = 5000;

let redisClient = null;
const memoryStore = new Map();

async function initVerificationStore() {
  if (isProduction && !redisUrl) {
    throw new Error("生产环境必须配置 REDIS_URL，用 Redis 存储验证码和滑块 challenge");
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

function now() {
  return Date.now();
}

function withMeta(payload, ttlSeconds, limits = {}) {
  const issuedAt = now();
  return {
    ...payload,
    issuedAt,
    expiresAt: issuedAt + ttlSeconds * 1000,
    attempts: 0,
    failures: 0,
    maxAttempts: limits.maxAttempts || MAX_VERIFY_ATTEMPTS,
    maxFailures: limits.maxFailures || MAX_VERIFY_FAILURES
  };
}

function ttlLeftSeconds(item) {
  return Math.max(1, Math.ceil((Number(item?.expiresAt || 0) - now()) / 1000));
}

function cleanupMemoryStore() {
  const current = now();
  for (const [key, item] of memoryStore.entries()) {
    if (item.expiresAt < current) memoryStore.delete(key);
  }
}

// 存储抽象：开发环境用内存 Map，生产环境配置 REDIS_URL 后自动切换到 Redis。
// 这样课程设计答辩时可以说明：接口逻辑不依赖具体存储，部署时只换环境变量。
async function setValue(key, value, ttlSeconds) {
  if (redisClient) {
    await redisClient.set(key, JSON.stringify(value), { EX: ttlSeconds });
    return;
  }
  cleanupMemoryStore();
  memoryStore.set(key, { value, expiresAt: now() + ttlSeconds * 1000 });
}

async function getValue(key) {
  if (redisClient) {
    const value = await redisClient.get(key);
    const parsed = value ? JSON.parse(value) : null;
    if (parsed?.expiresAt && parsed.expiresAt < now()) {
      await redisClient.del(key);
      return null;
    }
    return parsed;
  }
  const item = memoryStore.get(key);
  if (!item) return null;
  if (item.expiresAt < now()) {
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

async function saveChallenge(key, item) {
  await setValue(key, item, ttlLeftSeconds(item));
}

async function failChallenge(key, item) {
  item.attempts = Number(item.attempts || 0) + 1;
  item.failures = Number(item.failures || 0) + 1;
  if (item.attempts >= Number(item.maxAttempts || MAX_VERIFY_ATTEMPTS)
    || item.failures >= Number(item.maxFailures || MAX_VERIFY_FAILURES)
    || Number(item.expiresAt || 0) <= now()) {
    await deleteValue(key);
    return false;
  }
  await saveChallenge(key, item);
  return false;
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
  await setValue(`captcha:${token}`, withMeta({ answer }, CAPTCHA_TTL_SECONDS), CAPTCHA_TTL_SECONDS);
  return { token, image: createCaptchaSvg(answer), expiresIn: CAPTCHA_TTL_SECONDS };
}

async function createSliderChallenge() {
  const token = randomToken();
  const target = 58 + Math.floor(Math.random() * 30);
  const y = 20 + Math.floor(Math.random() * 36);
  const challenge = withMeta({ target, y }, SLIDER_TTL_SECONDS);
  await setValue(`slider:${token}`, challenge, SLIDER_TTL_SECONDS);
  return { token, target, y, issuedAt: challenge.issuedAt, expiresIn: SLIDER_TTL_SECONDS };
}

async function verifyCaptcha(token, answer) {
  if (!token || !answer) return false;
  const key = `captcha:${token}`;
  const item = await getValue(key);
  if (!item) return false;
  const matched = String(item.answer).toLowerCase() === String(answer).trim().toLowerCase();
  if (!matched) return failChallenge(key, item);
  await deleteValue(key);
  return true;
}

function parseSliderTimes(options = {}) {
  const startedAt = Number(options.startedAt ?? options.sliderStartedAt ?? 0);
  const endedAt = Number(options.endedAt ?? options.sliderEndedAt ?? 0);
  return { startedAt, endedAt };
}

function sliderTimingLooksHuman(item, options) {
  const current = now();
  const { startedAt, endedAt } = parseSliderTimes(options);
  if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt)) return false;
  if (startedAt <= 0 || endedAt <= 0 || endedAt < startedAt) return false;
  if (startedAt < Number(item.issuedAt || 0) - CLOCK_SKEW_MS) return false;
  if (endedAt > current + CLOCK_SKEW_MS) return false;
  const clientElapsed = endedAt - startedAt;
  const serverElapsed = current - Number(item.issuedAt || current);
  return clientElapsed >= SLIDER_MIN_ELAPSED_MS
    && clientElapsed <= SLIDER_MAX_ELAPSED_MS
    && serverElapsed >= SLIDER_MIN_ELAPSED_MS
    && Number(item.expiresAt || 0) > current;
}

async function verifySliderChallenge(token, value, options = {}) {
  if (!token) return false;
  const key = `slider:${token}`;
  const item = await getValue(key);
  if (!item) return false;
  const number = Number(value);
  const valueMatched = Number.isFinite(number)
    && number >= 0
    && number <= 100
    && Math.abs(number - Number(item.target)) <= SLIDER_TOLERANCE;
  const timingMatched = sliderTimingLooksHuman(item, options);
  if (!valueMatched || !timingMatched) return failChallenge(key, item);
  await deleteValue(key);
  return true;
}

async function createSmsCode(phone) {
  const cooldownKey = `sms-cooldown:${phone}`;
  if (await getValue(cooldownKey)) {
    throw new Error("验证码发送过于频繁，请稍后再试");
  }
  const code = randomDigits(6);
  await setValue(`sms:${phone}`, withMeta({ code }, SMS_TTL_SECONDS), SMS_TTL_SECONDS);
  await setValue(cooldownKey, { active: true, expiresAt: now() + SMS_COOLDOWN_SECONDS * 1000 }, SMS_COOLDOWN_SECONDS);
  if (!isProduction) {
    console.log(`[dev sms] ${phone}: ${code}`);
  }
  return { expiresIn: SMS_TTL_SECONDS, cooldown: SMS_COOLDOWN_SECONDS };
}

async function verifySmsCode(phone, code) {
  if (!phone || !code) return false;
  const key = `sms:${phone}`;
  const item = await getValue(key);
  if (!item) return false;
  const matched = String(item.code) === String(code).trim();
  if (!matched) return failChallenge(key, item);
  await deleteValue(key);
  return true;
}

module.exports = {
  createCaptcha,
  createSliderChallenge,
  createSmsCode,
  initVerificationStore,
  verifyCaptcha,
  verifySliderChallenge,
  verifySmsCode
};
