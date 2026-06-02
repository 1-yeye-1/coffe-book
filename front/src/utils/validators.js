export function isPhone(value) {
  return /^1[3-9]\d{9}$/.test(String(value || "").trim());
}

export function phoneMessage(value) {
  return isPhone(value) ? "" : "请输入正确的 11 位手机号";
}

export function nicknameMessage(value) {
  const length = String(value || "").trim().length;
  return length >= 2 && length <= 30 ? "" : "昵称需为 2 到 30 个字符";
}

export function strongPasswordMessage(value) {
  const password = String(value || "");
  if (password.length < 8 || password.length > 32) return "密码长度需为 8 到 32 位";
  if (!/[a-z]/.test(password)) return "密码需包含小写字母";
  if (!/[A-Z]/.test(password)) return "密码需包含大写字母";
  if (!/\d/.test(password)) return "密码需包含数字";
  if (!/[^A-Za-z0-9]/.test(password)) return "密码需包含特殊字符";
  return "";
}

export function integerRangeMessage(value, min, max, label = "数量") {
  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    return `${label}必须是 ${min} 到 ${max} 之间的整数`;
  }
  return "";
}

export function lengthMessage(value, max, label = "内容") {
  return String(value || "").length <= max ? "" : `${label}不能超过 ${max} 个字符`;
}
