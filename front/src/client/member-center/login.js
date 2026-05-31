import { loginUser } from "../../shared/state.js";
import { bindFieldValidation, showApiFieldError, validateFields } from "../../shared/form-validation.js";

let loginMode = "password";
let captchaToken = "";
let smsCooldown = 0;
let timer = null;

export function renderUserLogin() {
  return `
    <section class="section auth-page">
      <div class="auth-panel">
        <div class="auth-copy">
          <h2>用户登录</h2>
          <p>登录后可以使用购物车、下单支付、活动快速报名、社区互动和会员中心。</p>
        </div>
        <form class="card login-card" id="login-form" novalidate>
          <div class="section-head"><div><h3>会员登录</h3></div></div>
          <div class="segmented-control">
            <button class="${loginMode === "password" ? "active" : ""}" type="button" data-login-mode="password">密码登录</button>
            <button class="${loginMode === "sms" ? "active" : ""}" type="button" data-login-mode="sms">验证码登录</button>
          </div>
          <label class="field"><span>手机号</span><input name="phone" inputmode="numeric" maxlength="11" placeholder="请输入 11 位手机号" autocomplete="tel" required /><small class="field-error" data-error-for="phone"></small></label>
          ${loginMode === "password" ? `
            <label class="field"><span>密码</span><input type="password" name="password" placeholder="请输入密码" autocomplete="current-password" required /><small class="field-error" data-error-for="password"></small></label>
          ` : `
            <div class="captcha-row">
              <label class="field"><span>图形验证码</span><input name="captchaAnswer" inputmode="numeric" maxlength="4" placeholder="输入图片数字" required /><small class="field-error" data-error-for="captchaAnswer"></small></label>
              <button class="captcha-image" type="button" id="refresh-login-captcha" aria-label="刷新图形验证码"><img id="login-captcha-img" alt="图形验证码" /></button>
            </div>
            <div class="sms-row">
              <label class="field"><span>短信验证码</span><input name="smsCode" inputmode="numeric" maxlength="6" placeholder="6 位验证码" required /><small class="field-error" data-error-for="smsCode"></small></label>
              <button class="btn ghost" type="button" id="send-login-sms">获取验证码</button>
            </div>
          `}
          <p class="form-error" id="login-error" hidden></p>
          <button class="btn" type="submit">登录</button>
          <button class="link-button auth-switch" type="button" data-page="userRegister">还没有账号？去注册</button>
        </form>
      </div>
    </section>
  `;
}

async function loadCaptcha(ctx) {
  if (loginMode !== "sms") return;
  const data = await ctx.request("/api/auth/captcha");
  captchaToken = data.token;
  document.querySelector("#login-captcha-img").src = data.image;
  const input = document.querySelector("#login-form [name='captchaAnswer']");
  if (input) input.value = "";
}

function startCooldown() {
  const button = document.querySelector("#send-login-sms");
  smsCooldown = 60;
  button.disabled = true;
  button.textContent = `${smsCooldown}s 后重试`;
  clearInterval(timer);
  timer = setInterval(() => {
    smsCooldown -= 1;
    if (smsCooldown <= 0) {
      clearInterval(timer);
      button.disabled = false;
      button.textContent = "获取验证码";
      return;
    }
    button.textContent = `${smsCooldown}s 后重试`;
  }, 1000);
}

function showLoginError(message) {
  const box = document.querySelector("#login-error");
  box.textContent = message;
  box.hidden = false;
}

export function bindUserLogin(ctx) {
  loadCaptcha(ctx).catch((error) => ctx.toast(error.message));
  const form = document.querySelector("#login-form");
  bindFieldValidation(form, loginMode === "sms" ? ["phone", "captchaAnswer", "smsCode"] : ["phone", "password"], "login");

  document.querySelectorAll("[data-login-mode]").forEach((button) => button.addEventListener("click", () => {
    loginMode = button.dataset.loginMode;
    ctx.render();
  }));

  document.querySelector("#refresh-login-captcha")?.addEventListener("click", () => loadCaptcha(ctx).catch((error) => ctx.toast(error.message)));

  document.querySelector("#send-login-sms")?.addEventListener("click", async () => {
    const data = ctx.formData(form);
    if (!validateFields(form, ["phone", "captchaAnswer"], "login")) return;
    try {
      await ctx.request("/api/auth/sms-code", { method: "POST", body: JSON.stringify({ phone: data.phone, captchaToken, captchaAnswer: data.captchaAnswer }) });
      ctx.toast("短信验证码已发送，请查看短信");
      startCooldown();
    } catch (error) {
      if (!showApiFieldError(form, error.message)) showLoginError(error.message);
      if (error.message.includes("图形验证码")) await loadCaptcha(ctx);
    }
  });

  document.querySelector("#login-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const names = loginMode === "sms" ? ["phone", "smsCode"] : ["phone", "password"];
    if (!validateFields(event.currentTarget, names, "login")) return;
    try {
      const path = loginMode === "sms" ? "/api/auth/sms-login" : "/api/auth/login";
      const data = await ctx.request(path, { method: "POST", body: JSON.stringify(ctx.formData(event.currentTarget)) });
      loginUser(data);
      ctx.toast("登录成功，已解锁购物车、活动报名和社区互动");
      ctx.setPage("home");
    } catch (error) {
      if (!showApiFieldError(event.currentTarget, error.message)) showLoginError(error.message);
    }
  });
}
