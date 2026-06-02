<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { request } from "@/api";
import { useUserStore } from "@/stores/user";

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const mode = ref("password");
const loading = ref(false);
const sending = ref(false);
const error = ref("");
const notice = ref("");
const cooldown = ref(0);
const sliderTrack = ref(null);
const sliderToken = ref("");
const sliderValue = ref(0);
const sliderTarget = ref(72);
const sliderY = ref(36);
const sliderVerified = ref(false);
const sliderDragging = ref(false);
let cooldownTimer = null;

const form = reactive({
  phone: "13800000000",
  password: "coffee123",
  smsCode: ""
});

const fieldErrors = reactive({
  phone: "",
  password: "",
  smsCode: "",
  slider: ""
});

function sliderPictureLeft(value) {
  if (value <= 4) return "8px";
  if (value >= 96) return "calc(100% - 52px)";
  return `calc(${value}% - 22px)`;
}

function sliderHandleLeft(value) {
  if (value <= 4) return "4px";
  if (value >= 96) return "calc(100% - 42px)";
  return `calc(${value}% - 19px)`;
}

const sliderStyle = computed(() => ({ width: `${sliderValue.value}%` }));
const sliderButtonStyle = computed(() => ({ left: sliderHandleLeft(sliderValue.value) }));
const sliderCutoutStyle = computed(() => ({
  left: sliderPictureLeft(sliderTarget.value),
  top: `${sliderY.value}px`
}));
const sliderPieceStyle = computed(() => ({
  left: sliderPictureLeft(sliderValue.value),
  top: `${sliderY.value}px`
}));

onMounted(loadSlider);

onBeforeUnmount(() => {
  if (cooldownTimer) clearInterval(cooldownTimer);
  removeSliderListeners();
});

watch(mode, (value) => {
  error.value = "";
  notice.value = "";
  if (value === "sms" && !sliderToken.value) loadSlider().catch(() => null);
});

function validPhone(phone) {
  return /^1[3-9]\d{9}$/.test(String(phone || "").trim());
}

function clearField(name) {
  fieldErrors[name] = "";
  error.value = "";
}

function validatePhone() {
  if (!validPhone(form.phone)) {
    fieldErrors.phone = "请输入 11 位中国大陆手机号";
    return false;
  }
  fieldErrors.phone = "";
  return true;
}

function validatePasswordLogin() {
  let passed = validatePhone();
  if (!String(form.password || "").trim()) {
    fieldErrors.password = "请输入密码";
    passed = false;
  } else if (String(form.password).length > 64) {
    fieldErrors.password = "密码长度不符合要求";
    passed = false;
  } else {
    fieldErrors.password = "";
  }
  return passed;
}

function validateSmsLogin() {
  let passed = validatePhone();
  if (!/^\d{6}$/.test(String(form.smsCode || ""))) {
    fieldErrors.smsCode = "请输入 6 位短信验证码";
    passed = false;
  } else {
    fieldErrors.smsCode = "";
  }
  return passed;
}

async function loadSlider() {
  const data = await request("/api/auth/slider");
  sliderToken.value = data.token;
  sliderTarget.value = Number(data.target || 72);
  sliderY.value = Number(data.y || 36);
  resetSlider(false);
}

function resetSlider(needsChallenge = true) {
  sliderValue.value = 0;
  sliderVerified.value = false;
  sliderDragging.value = false;
  fieldErrors.slider = "";
  if (needsChallenge) loadSlider().catch(() => {
    fieldErrors.slider = "滑块验证加载失败，请稍后重试";
  });
}

function pointerPercent(event) {
  const rect = sliderTrack.value?.getBoundingClientRect();
  if (!rect?.width) return 0;
  const x = Math.min(Math.max(event.clientX - rect.left, 0), rect.width);
  return Math.round((x / rect.width) * 100);
}

function removeSliderListeners() {
  window.removeEventListener("pointermove", moveSlider);
  window.removeEventListener("pointerup", stopSlider);
}

function startSlider(event) {
  if (sliderVerified.value) return;
  event.preventDefault();
  sliderDragging.value = true;
  fieldErrors.slider = "";
  moveSlider(event);
  window.addEventListener("pointermove", moveSlider);
  window.addEventListener("pointerup", stopSlider);
}

function moveSlider(event) {
  if (!sliderDragging.value) return;
  sliderValue.value = Math.min(96, Math.max(4, pointerPercent(event)));
}

function stopSlider() {
  if (Math.abs(sliderValue.value - sliderTarget.value) <= 3) {
    sliderValue.value = sliderTarget.value;
    sliderVerified.value = true;
    fieldErrors.slider = "";
  } else {
    sliderValue.value = 0;
    fieldErrors.slider = "拼图位置不正确，请重新拖动";
  }
  sliderDragging.value = false;
  removeSliderListeners();
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
  if (!validatePhone()) return;
  if (!sliderVerified.value) {
    fieldErrors.slider = "请先完成滑块验证";
    return;
  }

  sending.value = true;
  try {
    await request("/api/auth/sms-code", {
      method: "POST",
      body: JSON.stringify({
        phone: form.phone,
        sliderToken: sliderToken.value,
        sliderValue: sliderValue.value
      })
    });
    notice.value = "验证码已发送，请查看后端终端里的开发环境验证码";
    startCooldown();
  } catch (err) {
    error.value = err.message;
  } finally {
    sending.value = false;
  }
}

async function submit() {
  error.value = "";
  notice.value = "";
  if (mode.value === "password" && !validatePasswordLogin()) return;
  if (mode.value === "sms" && !validateSmsLogin()) return;

  loading.value = true;
  try {
    if (mode.value === "password") {
      await userStore.login({ phone: form.phone, password: form.password });
    } else {
      await userStore.smsLogin({ phone: form.phone, smsCode: form.smsCode });
    }
    router.push(route.query.redirect || "/shop");
  } catch (err) {
    error.value = err.message.includes("次数过多")
      ? err.message
      : mode.value === "password"
        ? "登录失败，请检查手机号和密码"
        : "验证码登录失败，请检查手机号和验证码";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="section auth-page">
    <form class="card login-card vue-login" data-testid="login-form" @submit.prevent="submit" novalidate>
      <p class="eyebrow">Member Login</p>
      <h2>用户登录</h2>
      <p class="muted">未登录用户进入购物车、结算、支付和订单页时会先跳转到这里。</p>

      <div class="segmented-control auth-mode-tabs">
        <button type="button" :class="{ active: mode === 'password' }" @click="mode = 'password'">密码登录</button>
        <button type="button" :class="{ active: mode === 'sms' }" @click="mode = 'sms'">验证码登录</button>
      </div>

      <label class="field">
        <span>手机号</span>
        <input
          v-model.trim="form.phone"
          :class="{ invalid: fieldErrors.phone }"
          inputmode="numeric"
          maxlength="11"
          autocomplete="tel"
          data-testid="login-phone"
          placeholder="请输入 11 位手机号"
          :aria-invalid="Boolean(fieldErrors.phone)"
          @input="clearField('phone')"
        />
        <small v-if="fieldErrors.phone" class="field-error">{{ fieldErrors.phone }}</small>
      </label>

      <label v-if="mode === 'password'" class="field">
        <span>密码</span>
        <input
          v-model="form.password"
          :class="{ invalid: fieldErrors.password }"
          type="password"
          autocomplete="current-password"
          data-testid="login-password"
          placeholder="请输入密码"
          :aria-invalid="Boolean(fieldErrors.password)"
          @input="clearField('password')"
        />
        <small v-if="fieldErrors.password" class="field-error">{{ fieldErrors.password }}</small>
      </label>

      <template v-else>
        <div class="slider-check graphic-slider" :class="{ verified: sliderVerified }">
          <span>图形滑块验证</span>
          <div class="slider-captcha">
            <div class="slider-picture" aria-hidden="true">
              <div class="slider-cutout" :style="sliderCutoutStyle"></div>
              <div class="slider-piece" :style="sliderPieceStyle"></div>
            </div>
            <div ref="sliderTrack" class="slider-control" @pointerdown="startSlider">
              <div class="slider-progress" :style="sliderStyle"></div>
              <button class="slider-handle" type="button" :style="sliderButtonStyle" @pointerdown.stop="startSlider">{{ sliderVerified ? "✓" : "→" }}</button>
              <strong>{{ sliderVerified ? "验证通过" : "拖动滑块完成拼图" }}</strong>
            </div>
          </div>
          <div class="slider-tools">
            <small v-if="fieldErrors.slider" class="field-error">{{ fieldErrors.slider }}</small>
            <button class="link-button" type="button" @click="loadSlider">重新验证</button>
          </div>
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
      </template>

      <p v-if="notice" class="form-notice">{{ notice }}</p>
      <p v-if="error" class="form-error">{{ error }}</p>
      <button class="btn checkout-main-btn" data-testid="login-submit" type="submit" :disabled="loading">
        {{ loading ? "登录中..." : "登录并继续" }}
      </button>
      <RouterLink class="link-button auth-switch" to="/register">还没有账号？去注册</RouterLink>
      <p class="muted">演示账号：13800000000 / coffee123</p>
    </form>
  </section>
</template>
