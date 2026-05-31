import { loginUser } from "../../shared/state.js";
import { bindFieldValidation, showApiFieldError, validateFields } from "../../shared/form-validation.js";

let captchaToken = "";
let smsCooldown = 0;
let timer = null;

export function renderUserRegister() {
  return `
    <section class="section auth-page">
      <div class="auth-panel">
        <div class="auth-copy">
          <h2>用户注册</h2>
          <p>用手机号完成安全验证，加入后即可预约座位、参与活动并积累会员积分。</p>
        </div>
        <form class="card login-card" id="register-form" novalidate>
          <h3>手机号注册</h3>
          <label class="field"><span>昵称</span><input name="name" placeholder="请输入 2 到 30 个字符" required /><small class="field-error" data-error-for="name"></small></label>
          <label class="field"><span>手机号</span><input name="phone" inputmode="numeric" maxlength="11" placeholder="请输入 11 位手机号" required /><small class="field-error" data-error-for="phone"></small></label>
          <label class="field"><span>密码</span><input type="password" name="password" placeholder="8-32 位，包含大小写字母、数字和特殊字符" required /><small class="field-error" data-error-for="password"></small></label>
          <div class="captcha-row">
            <label class="field"><span>图形验证码</span><input name="captchaAnswer" inputmode="numeric" maxlength="4" placeholder="输入图片数字" required /><small class="field-error" data-error-for="captchaAnswer"></small></label>
            <button class="captcha-image" type="button" id="refresh-captcha" aria-label="刷新图形验证码">
              <img id="captcha-img" alt="图形验证码" />
            </button>
          </div>
          <div class="sms-row">
            <label class="field"><span>短信验证码</span><input name="smsCode" inputmode="numeric" maxlength="6" placeholder="6 位验证码" required /><small class="field-error" data-error-for="smsCode"></small></label>
            <button class="btn ghost" type="button" id="send-sms">获取验证码</button>
          </div>
          <button class="btn" type="submit">注册并登录</button>
          <button class="link-button auth-switch" type="button" data-page="userLogin">已有账号？去登录</button>
        </form>
      </div>
    </section>
  `;
}

async function loadCaptcha(ctx) {
  const data = await ctx.request("/api/auth/captcha");
  captchaToken = data.token;
  document.querySelector("#captcha-img").src = data.image;
  const input = document.querySelector("#register-form [name='captchaAnswer']");
  if (input) input.value = "";
}

function startCooldown() {
  const button = document.querySelector("#send-sms");
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

export function bindUserRegister(ctx) {
  loadCaptcha(ctx).catch((error) => ctx.toast(error.message));
  const form = document.querySelector("#register-form");
  bindFieldValidation(form, ["name", "phone", "password", "captchaAnswer", "smsCode"]);

  document.querySelector("#refresh-captcha")?.addEventListener("click", () => {
    loadCaptcha(ctx).catch((error) => ctx.toast(error.message));
  });

  document.querySelector("#send-sms")?.addEventListener("click", async () => {
    const data = ctx.formData(form);
    if (!validateFields(form, ["phone", "captchaAnswer"])) return;
    try {
      await ctx.request("/api/auth/sms-code", {
        method: "POST",
        body: JSON.stringify({
          phone: data.phone,
          captchaToken,
          captchaAnswer: data.captchaAnswer
        })
      });
      ctx.toast("短信验证码已发送，请查看短信");
      startCooldown();
    } catch (error) {
      if (!showApiFieldError(form, error.message)) ctx.toast(error.message);
      if (error.message.includes("图形验证码")) await loadCaptcha(ctx);
    }
  });

  document.querySelector("#register-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!validateFields(event.currentTarget, ["name", "phone", "password", "smsCode"])) return;
    try {
      const data = await ctx.request("/api/auth/register", {
        method: "POST",
        body: JSON.stringify(ctx.formData(event.currentTarget))
      });
      loginUser(data);
      ctx.toast("注册成功，已自动登录");
      ctx.setPage("home");
    } catch (error) {
      if (!showApiFieldError(event.currentTarget, error.message)) ctx.toast(error.message);
    }
  });
}
