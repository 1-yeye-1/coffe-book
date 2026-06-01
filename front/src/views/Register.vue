<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { request } from "@/api";
import { useUserStore } from "@/stores/user";

const router = useRouter();
const userStore = useUserStore();
const loading = ref(false);
const sending = ref(false);
const error = ref("");
const notice = ref("");
const captchaImage = ref("");
const captchaToken = ref("");
const cooldown = ref(0);
let cooldownTimer = null;

const form = reactive({
  name: "",
  phone: "",
  password: "",
  captchaAnswer: "",
  smsCode: ""
});

const fieldErrors = reactive({
  name: "",
  phone: "",
  password: "",
  captchaAnswer: "",
  smsCode: ""
});

onMounted(loadCaptcha);

onBeforeUnmount(() => {
  if (cooldownTimer) clearInterval(cooldownTimer);
});

function validPhone(phone) {
  return /^1[3-9]\d{9}$/.test(String(phone || "").trim());
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

function clearField(name) {
  fieldErrors[name] = "";
  error.value = "";
}

function validateBaseFields(includeSms = false) {
  let passed = true;
  const name = String(form.name || "").trim();

  if (name.length < 2 || name.length > 30) {
    fieldErrors.name = "昵称需为 2 到 30 个字符";
    passed = false;
  } else {
    fieldErrors.name = "";
  }

  if (!validPhone(form.phone)) {
    fieldErrors.phone = "请输入 11 位中国大陆手机号";
    passed = false;
  } else {
    fieldErrors.phone = "";
  }

  if (!validStrongPassword(form.password)) {
    fieldErrors.password = "密码需为 8 到 32 位，并包含大小写字母、数字和特殊字符";
    passed = false;
  } else {
    fieldErrors.password = "";
  }

  if (!/^\d{4}$/.test(String(form.captchaAnswer || ""))) {
    fieldErrors.captchaAnswer = "请输入 4 位图形验证码";
    passed = false;
  } else {
    fieldErrors.captchaAnswer = "";
  }

  if (includeSms) {
    if (!/^\d{6}$/.test(String(form.smsCode || ""))) {
      fieldErrors.smsCode = "请输入 6 位短信验证码";
      passed = false;
    } else {
      fieldErrors.smsCode = "";
    }
  }

  return passed;
}

async function loadCaptcha() {
  const data = await request("/api/auth/captcha");
  captchaToken.value = data.token;
  captchaImage.value = data.image;
  form.captchaAnswer = "";
}

function startCooldown() {
  cooldown.value = 60;
  if (cooldownTimer) clearInterval(cooldownTimer);
  cooldownTimer = setInterval(() => {
    cooldown.value -= 1;
    if (cooldown.value <= 0) clearInterval(cooldownTimer);
  }, 1000);
}

async function sendSms() {
  error.value = "";
  notice.value = "";
  if (!validateBaseFields(false)) return;

  sending.value = true;
  try {
    await request("/api/auth/sms-code", {
      method: "POST",
      body: JSON.stringify({
        phone: form.phone,
        captchaToken: captchaToken.value,
        captchaAnswer: form.captchaAnswer
      })
    });
    notice.value = "验证码已发送，请查看后端终端里的开发环境验证码";
    startCooldown();
  } catch (err) {
    error.value = err.message;
    await loadCaptcha().catch(() => null);
  } finally {
    sending.value = false;
  }
}

async function submit() {
  error.value = "";
  notice.value = "";
  if (!validateBaseFields(true)) return;

  loading.value = true;
  try {
    const data = await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(form)
    });
    userStore.saveSession(data);
    await userStore.fetchMember();
    router.push("/");
  } catch (err) {
    error.value = err.message;
    await loadCaptcha().catch(() => null);
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="section auth-page">
    <form class="card login-card vue-login" @submit.prevent="submit" novalidate>
      <p class="eyebrow">Member Register</p>
      <h2>用户注册</h2>
      <p class="muted">用手机号完成安全验证，加入后即可预约座位、参与活动并积累会员积分。</p>

      <label class="field">
        <span>昵称</span>
        <input
          v-model.trim="form.name"
          :class="{ invalid: fieldErrors.name }"
          placeholder="请输入 2 到 30 个字符"
          autocomplete="nickname"
          :aria-invalid="Boolean(fieldErrors.name)"
          @input="clearField('name')"
        />
        <small v-if="fieldErrors.name" class="field-error">{{ fieldErrors.name }}</small>
      </label>

      <label class="field">
        <span>手机号</span>
        <input
          v-model.trim="form.phone"
          :class="{ invalid: fieldErrors.phone }"
          inputmode="numeric"
          maxlength="11"
          placeholder="请输入 11 位手机号"
          autocomplete="tel"
          :aria-invalid="Boolean(fieldErrors.phone)"
          @input="clearField('phone')"
        />
        <small v-if="fieldErrors.phone" class="field-error">{{ fieldErrors.phone }}</small>
      </label>

      <label class="field">
        <span>密码</span>
        <input
          v-model="form.password"
          :class="{ invalid: fieldErrors.password }"
          type="password"
          placeholder="8-32 位，包含大小写字母、数字和特殊字符"
          autocomplete="new-password"
          :aria-invalid="Boolean(fieldErrors.password)"
          @input="clearField('password')"
        />
        <small v-if="fieldErrors.password" class="field-error">{{ fieldErrors.password }}</small>
      </label>

      <div class="captcha-row">
        <label class="field">
          <span>图形验证码</span>
          <input
            v-model.trim="form.captchaAnswer"
            :class="{ invalid: fieldErrors.captchaAnswer }"
            inputmode="numeric"
            maxlength="4"
            placeholder="输入图片数字"
            :aria-invalid="Boolean(fieldErrors.captchaAnswer)"
            @input="clearField('captchaAnswer')"
          />
          <small v-if="fieldErrors.captchaAnswer" class="field-error">{{ fieldErrors.captchaAnswer }}</small>
        </label>
        <button class="captcha-image" type="button" @click="loadCaptcha"><img :src="captchaImage" alt="图形验证码" /></button>
      </div>

      <div class="sms-row">
        <label class="field">
          <span>短信验证码</span>
          <input
            v-model.trim="form.smsCode"
            :class="{ invalid: fieldErrors.smsCode }"
            inputmode="numeric"
            maxlength="6"
            placeholder="6 位验证码"
            :aria-invalid="Boolean(fieldErrors.smsCode)"
            @input="clearField('smsCode')"
          />
          <small v-if="fieldErrors.smsCode" class="field-error">{{ fieldErrors.smsCode }}</small>
        </label>
        <button class="btn ghost" type="button" :disabled="sending || cooldown > 0" @click="sendSms">
          {{ cooldown > 0 ? `${cooldown}s 后重试` : "获取验证码" }}
        </button>
      </div>

      <p v-if="notice" class="form-notice">{{ notice }}</p>
      <p v-if="error" class="form-error">{{ error }}</p>
      <button class="btn checkout-main-btn" type="submit" :disabled="loading">{{ loading ? "注册中..." : "注册并登录" }}</button>
      <RouterLink class="link-button auth-switch" to="/login">已有账号？去登录</RouterLink>
    </form>
  </section>
</template>
