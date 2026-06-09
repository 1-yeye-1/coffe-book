<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { request } from "@/api";
import DataState from "@/components/DataState.vue";
import BaseToast from "@/components/front/BaseToast.vue";
import StatusBadge from "@/components/front/StatusBadge.vue";
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();
const member = computed(() => userStore.member);
const loading = ref(false);
const error = ref("");
const passwordLoading = ref(false);
const privacyLoading = ref(false);
const toastMessage = ref("");
const toastType = ref("success");
const privacyForm = reactive({ showProfile: true });
const form = reactive({
  currentPassword: "",
  newPassword: "",
  confirmPassword: ""
});

const safetyScore = computed(() => {
  let score = 45;
  if (member.value?.phone) score += 18;
  if (member.value?.email) score += 15;
  if (member.value?.avatar) score += 8;
  if (privacyForm.showProfile === false) score += 6;
  if ((member.value?.notifications || []).length >= 0) score += 8;
  return Math.min(100, score);
});
const safetyLevel = computed(() => safetyScore.value >= 85 ? "优秀" : safetyScore.value >= 70 ? "良好" : "待加强");
const safetyTone = computed(() => safetyScore.value >= 70 ? "success" : "warning");
const safetySummary = computed(() => {
  if (safetyScore.value >= 85) return "账号保护完整，继续保持定期更新密码的习惯。";
  if (safetyScore.value >= 70) return "基础保护良好，补全绑定信息后会更稳。";
  return "建议优先绑定手机号、邮箱，并更新强密码。";
});
const securityItems = computed(() => [
  {
    label: "登录密码",
    value: "已设置",
    status: "建议定期更新",
    type: "success",
    action: "修改密码",
    target: "#password-panel"
  },
  {
    label: "手机号绑定",
    value: member.value?.phone || "暂未绑定",
    status: member.value?.phone ? "已绑定" : "待绑定",
    type: member.value?.phone ? "success" : "warning",
    action: member.value?.phone ? "查看资料" : "去绑定",
    target: "/profile"
  },
  {
    label: "邮箱绑定",
    value: member.value?.email || "暂未绑定",
    status: member.value?.email ? "已绑定" : "待绑定",
    type: member.value?.email ? "success" : "warning",
    action: member.value?.email ? "查看资料" : "去绑定",
    target: "/profile"
  }
]);
const devices = computed(() => [
  {
    name: "Windows 浏览器",
    location: "Asia/Shanghai",
    time: "当前设备",
    current: true,
    detail: "最近通过账号密码登录，正在使用中。",
    browser: "Chrome / Edge",
    network: "家庭或办公网络"
  },
  {
    name: "Mobile Web",
    location: "同城门店 Wi-Fi",
    time: "3 天前",
    current: false,
    detail: "移动端访问会员中心和订单页面。",
    browser: "Mobile Safari / Chrome",
    network: "咖啡书屋门店网络"
  },
  {
    name: "Chrome Guest",
    location: "咖啡书屋自助终端",
    time: "7 天前",
    current: false,
    detail: "公共终端登录记录，建议离店后确认退出。",
    browser: "Chrome Guest",
    network: "自助终端网络"
  }
]);
const logs = computed(() => [
  { action: "登录会员中心", time: "刚刚", detail: "账号密码登录成功", status: "成功" },
  { action: "查看订单", time: "今天", detail: `${member.value?.name || "会员"} 查看了我的订单`, status: "正常" },
  { action: "更新资料", time: "最近", detail: member.value?.email ? "邮箱与偏好信息已同步" : "建议补充邮箱信息", status: "记录" }
]);
const riskTips = computed(() => [
  member.value?.email ? "邮箱已绑定，可用于接收重要通知。" : "建议绑定邮箱，方便找回账号和接收重要通知。",
  member.value?.phone ? "手机号已绑定，账号找回路径更完整。" : "手机号暂未绑定，建议在个人资料页补全。",
  privacyForm.showProfile ? "当前个人主页公开，如需减少曝光可关闭可见范围。" : "个人主页已隐藏，隐私保护更强。",
  "不要把短信验证码、支付凭证截图发送给陌生人。"
]);

onMounted(loadSecurity);

async function loadSecurity() {
  loading.value = true;
  error.value = "";
  try {
    const data = await userStore.fetchMember();
    privacyForm.showProfile = data?.showProfile !== false;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

function showToast(message, type = "success") {
  toastMessage.value = "";
  toastType.value = type;
  window.setTimeout(() => {
    toastMessage.value = message;
    window.setTimeout(() => {
      if (toastMessage.value === message) toastMessage.value = "";
    }, 2200);
  });
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

async function changePassword() {
  if (!form.currentPassword) {
    showToast("请输入当前密码", "danger");
    return;
  }
  if (!validStrongPassword(form.newPassword)) {
    showToast("新密码需为 8 到 32 位，并包含大小写字母、数字和特殊字符", "danger");
    return;
  }
  if (form.newPassword !== form.confirmPassword) {
    showToast("两次输入的新密码不一致", "danger");
    return;
  }
  passwordLoading.value = true;
  try {
    await request("/api/member/password", {
      method: "POST",
      body: JSON.stringify({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      })
    });
    Object.assign(form, { currentPassword: "", newPassword: "", confirmPassword: "" });
    showToast("密码已修改");
  } catch (err) {
    showToast(err.message, "danger");
  } finally {
    passwordLoading.value = false;
  }
}

async function savePrivacy() {
  privacyLoading.value = true;
  try {
    const data = await request("/api/member/security", {
      method: "PATCH",
      body: JSON.stringify(privacyForm)
    });
    userStore.user = data;
    localStorage.setItem("coffee_user", JSON.stringify(data));
    await userStore.fetchMember();
    showToast("隐私设置已保存");
  } catch (err) {
    showToast(err.message, "danger");
  } finally {
    privacyLoading.value = false;
  }
}
</script>

<template>
  <section class="section security-page-pro">
    <BaseToast :visible="Boolean(toastMessage)" :message="toastMessage" :type="toastType" />

    <DataState
      :loading="loading"
      :error="error"
      :empty="!member"
      loading-title="安全信息同步中"
      empty-title="暂未获取安全信息"
      description="登录后即可管理密码、绑定信息、设备和隐私设置。"
      @retry="loadSecurity"
    >
      <div class="member-hero-pro security-hero">
        <div>
          <p class="eyebrow">Account Security</p>
          <h2>安全设置</h2>
          <p class="lead">统一管理登录密码、绑定信息、隐私公开范围、登录设备与风险提示。</p>
          <div class="hero-chip-row">
            <StatusBadge :label="`安全评分 ${safetyScore}`" type="accent" />
            <StatusBadge :label="safetyLevel" :type="safetyTone" />
          </div>
        </div>
        <RouterLink class="btn ghost" to="/profile">返回个人资料</RouterLink>
      </div>

      <div class="security-layout-pro">
        <aside class="security-side-stack">
          <article class="card safety-score-card">
            <div class="safety-score-card__head">
              <span>安全评分</span>
              <StatusBadge :label="safetyLevel" :type="safetyTone" />
            </div>
            <div class="safety-ring" :style="{ '--score': `${safetyScore}%` }">
              <strong>{{ safetyScore }}</strong>
              <span>分</span>
            </div>
            <p class="safety-summary">{{ safetySummary }}</p>
          </article>

          <article class="card risk-tip-card">
            <div class="section-head compact">
              <div>
                <p class="eyebrow">Recommendations</p>
                <h3>安全建议</h3>
              </div>
            </div>
            <ul class="clean-list security-tip-list">
              <li v-for="tip in riskTips" :key="tip">{{ tip }}</li>
            </ul>
          </article>
        </aside>

        <main class="security-main-stack">
          <section class="security-card-grid">
            <article v-for="item in securityItems" :key="item.label" class="card security-item-card">
              <div class="security-item-card__top">
                <StatusBadge :label="item.status" :type="item.type" />
                <span class="security-item-icon">{{ item.label.slice(0, 1) }}</span>
              </div>
              <h3>{{ item.label }}</h3>
              <p>{{ item.value }}</p>
              <a v-if="item.target.startsWith('#')" class="btn" :href="item.target">{{ item.action }}</a>
              <RouterLink v-else class="btn ghost" :to="item.target">{{ item.action }}</RouterLink>
            </article>
          </section>

          <form id="password-panel" class="card security-form-card security-password-panel" @submit.prevent="changePassword">
            <div class="section-head compact">
              <div>
                <p class="eyebrow">Password</p>
                <h3>修改密码</h3>
              </div>
              <StatusBadge label="强密码保护" type="accent" />
            </div>
            <div class="profile-fields-grid security-password-grid">
              <label class="field">
                <span>当前密码</span>
                <input v-model="form.currentPassword" type="password" autocomplete="current-password" />
              </label>
              <label class="field">
                <span>新密码</span>
                <input v-model="form.newPassword" type="password" autocomplete="new-password" placeholder="8-32 位强密码" />
              </label>
              <label class="field">
                <span>确认新密码</span>
                <input v-model="form.confirmPassword" type="password" autocomplete="new-password" />
              </label>
            </div>
            <button class="btn security-submit-btn" type="submit" :disabled="passwordLoading">
              {{ passwordLoading ? "更新中..." : "更新密码" }}
            </button>
          </form>

          <form class="card security-form-card" @submit.prevent="savePrivacy">
            <div class="section-head compact">
              <div>
                <p class="eyebrow">Privacy</p>
                <h3>隐私与公开范围</h3>
              </div>
            </div>
            <label class="toggle-field security-toggle-field">
              <input v-model="privacyForm.showProfile" type="checkbox" />
              <span>
                <strong>允许其他书友查看我的个人主页</strong>
                <small>{{ privacyForm.showProfile ? "当前公开展示昵称、头像和基础互动信息" : "当前已隐藏个人主页" }}</small>
              </span>
            </label>
            <button class="btn ghost security-submit-btn" type="submit" :disabled="privacyLoading">
              {{ privacyLoading ? "保存中..." : "保存隐私设置" }}
            </button>
          </form>

          <div class="security-bottom-grid">
            <article class="card device-card security-device-card">
              <div class="section-head compact">
                <div>
                  <p class="eyebrow">Devices</p>
                  <h3>登录设备</h3>
                </div>
              </div>
              <div class="device-list security-device-list">
                <details v-for="device in devices" :key="device.name" class="security-device-item" :open="device.current">
                  <summary>
                    <span>
                      <strong>{{ device.name }}</strong>
                      <small>{{ device.location }} / {{ device.time }}</small>
                    </span>
                    <StatusBadge :label="device.current ? '当前设备' : '历史设备'" :type="device.current ? 'success' : 'default'" />
                  </summary>
                  <div class="security-device-detail">
                    <p>{{ device.detail }}</p>
                    <small>浏览器：{{ device.browser }}</small>
                    <small>网络：{{ device.network }}</small>
                  </div>
                </details>
              </div>
            </article>

            <article class="card device-card security-log-card">
              <div class="section-head compact">
                <div>
                  <p class="eyebrow">History</p>
                  <h3>最近登录记录</h3>
                </div>
              </div>
              <div class="device-list security-log-list">
                <p v-for="log in logs" :key="log.action">
                  <span>
                    <strong>{{ log.action }}</strong>
                    <small>{{ log.detail }}</small>
                  </span>
                  <span class="security-log-meta">
                    <StatusBadge :label="log.status" type="default" />
                    <em>{{ log.time }}</em>
                  </span>
                </p>
              </div>
            </article>
          </div>
        </main>
      </div>
    </DataState>
  </section>
</template>
