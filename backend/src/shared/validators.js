const { today } = require("./data");

function nextId(items) {
  return items.length ? Math.max(...items.map((item) => item.id)) + 1 : 1;
}

function validPhone(phone) {
  return /^1[3-9]\d{9}$/.test(String(phone || "").trim());
}

function validEmail(email) {
  const value = String(email || "").trim();
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validBirthday(birthday) {
  const value = String(birthday || "").trim();
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day && value <= today();
}

function validStrongPassword(password) {
  const value = String(password || "");
  return value.length >= 8
    && value.length <= 32
    && /[a-z]/.test(value)
    && /[A-Z]/.test(value)
    && /\d/.test(value)
    && /[^A-Za-z0-9]/.test(value);
}

function validInteger(value, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max;
}

function validNonNegativeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0;
}

function validNonNegativeInteger(value) {
  return validInteger(value, 0);
}

function validPeople(value) {
  return validInteger(value, 1, 20);
}

function asTime(value) {
  return new Date(String(value || "").replace(" ", "T")).getTime();
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function safeImage(image, maxBytes = 1.5 * 1024 * 1024) {
  const value = String(image || "");
  if (!value) return "";
  if (!value.startsWith("data:image/")) throw new Error("仅支持上传图片文件");
  if (value.length > maxBytes) throw new Error("图片过大，请压缩后上传");
  return value;
}

module.exports = {
  asTime,
  currentMonth,
  nextId,
  safeImage,
  validBirthday,
  validEmail,
  validInteger,
  validNonNegativeInteger,
  validNonNegativeNumber,
  validPeople,
  validPhone,
  validStrongPassword
};
