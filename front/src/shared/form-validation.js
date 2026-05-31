export function phoneError(value) {
  return /^\d{11}$/.test(String(value || "").trim()) ? "" : "请输入 11 位手机号";
}

export function strongPasswordError(value) {
  const password = String(value || "");
  if (password.length < 8 || password.length > 32) return "密码长度需为 8 到 32 位";
  if (!/[a-z]/.test(password)) return "密码需包含小写字母";
  if (!/[A-Z]/.test(password)) return "密码需包含大写字母";
  if (!/\d/.test(password)) return "密码需包含数字";
  if (!/[^A-Za-z0-9]/.test(password)) return "密码需包含特殊字符";
  return "";
}

export function setFieldError(form, name, message = "") {
  const input = form.querySelector(`[name="${name}"]`);
  const box = form.querySelector(`[data-error-for="${name}"]`);
  input?.classList.toggle("invalid", Boolean(message));
  if (box) box.textContent = message;
  return !message;
}

export function validateField(form, name, mode = "register") {
  const value = form.elements[name]?.value || "";
  if (name === "name") return setFieldError(form, name, String(value).trim().length >= 2 && String(value).trim().length <= 30 ? "" : "昵称需为 2 到 30 个字符");
  if (name === "phone") return setFieldError(form, name, phoneError(value));
  if (name === "password" && mode === "register") return setFieldError(form, name, strongPasswordError(value));
  if (name === "password") return setFieldError(form, name, value ? "" : "请输入密码");
  if (name === "captchaAnswer") return setFieldError(form, name, /^\d{4}$/.test(String(value).trim()) ? "" : "请输入 4 位图形验证码");
  if (name === "smsCode") return setFieldError(form, name, /^\d{6}$/.test(String(value).trim()) ? "" : "请输入 6 位短信验证码");
  return true;
}

export function validateFields(form, names, mode = "register") {
  return names.map((name) => validateField(form, name, mode)).every(Boolean);
}

export function bindFieldValidation(form, names, mode = "register") {
  names.forEach((name) => {
    form.elements[name]?.addEventListener("input", () => validateField(form, name, mode));
    form.elements[name]?.addEventListener("blur", () => validateField(form, name, mode));
  });
}

export function showApiFieldError(form, message) {
  const mappings = [
    ["昵称", "name"],
    ["手机号", "phone"],
    ["密码", "password"],
    ["图形验证码", "captchaAnswer"],
    ["短信验证码", "smsCode"],
    ["验证码", "smsCode"]
  ];
  const matched = mappings.find(([keyword, name]) => message.includes(keyword) && form.elements[name]);
  if (matched) setFieldError(form, matched[1], message);
  return Boolean(matched);
}
