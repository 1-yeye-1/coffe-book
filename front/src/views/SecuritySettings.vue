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
const securityItems = computed(() => [
  { label: "登录密码", value: "已设置", status: "正常", type: "success" },
  { label: "手机号绑定", value: member.value?.phone || "暂未绑定", status: member.value?.phone ? "已绑定" : "待绑定", type: member.value?.phone ? "success" : "warning" },
  { label: "邮箱绑定", value: member.value?.email || "暂未绑定", status: member.value?.email ? "已绑定" : "待绑定", type: member.value?.email ? "success" : "warning" },
  { label: "实名认证", value: "毕业设计模拟账号", status: "未接入", type: "default" }
]);
const devices = computed(() => [
  { name: "Windows 浏览器", location: "Asia/Shanghai", time: "当前设备", current: true },
  { name: "Mobile Web", location: "同城门店 Wi-Fi", time: "3 天前", current: false },
  { name: "Chrome Guest", location: "咖啡书屋自助终端", time: "7 天前", current: false }
]);
const logs = computed(() => [
  { action: "登录会员中心", time: "刚刚", detail: "账号密码登录成功" },
  { action: "查看订单", time: "今天", detail: `${member.value?.name || "会员"} 查看了我的订单` },
  { action: "更新资料", time: "最近", detail: member.value?.email ? "邮箱与偏好信息已同步" : "建议补充邮箱信息" }
]);
const riskTips = computed(() => [
  member.value?.email ? "邮箱已绑定，可用于接收重要通知。" : "建议绑定邮箱，方便找回账号。",
  privacyForm.showProfile ? "当前个人主页公开，可在隐私设置中调整。" : "个人主页已隐藏，隐私保护更强。",
  "请勿把短信验证码、支付凭证截图发送给陌生人。"
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
            <StatusBadge :label="safetyLevel" :type="safetyScore >= 70 ? 'success' : 'warning'" />
          </div>
        </div>
        <RouterLink class="btn ghost" to="/profile">返回个人资料</RouterLink>
      </div>

      <div class="security-layout-pro">
        <aside class="security-side-stack">
          <article class="card safety-score-card">
            <div class="safety-ring" :style="{ '--score': `${safetyScore}%` }">
              <strong>{{ safetyScore }}</strong>
              <span>{{ safetyLevel }}</span>
            </div>
            <p class="muted">绑定手机号、邮箱并合理设置个人主页可见范围，可以提升账号安全评分。</p>
          </article>

          <article class="card risk-tip-card">
            <h3>安全小贴士</h3>
            <ul class="clean-list">
              <li v-for="tip in riskTips" :key="tip">{{ tip }}</li>
            </ul>
          </article>
        </aside>

        <main class="security-main-stack">
          <section class="security-card-grid">
            <article v-for="item in securityItems" :key="item.label" class="card security-item-card">
              <StatusBadge :label="item.status" :type="item.type" />
              <h3>{{ item.label }}</h3>
              <p>{{ item.value }}</p>
              <RouterLink v-if="item.label !== '登录密码'" class="btn ghost" to="/profile">去绑定</RouterLink>
            </article>
          </section>

          <form class="card security-form-card" @submit.prevent="changePassword">
            <div class="section-head compact">
              <div>
                <p class="eyebrow">Password</p>
                <h3>修改密码</h3>
              </div>
            </div>
            <div class="profile-fields-grid">
              <label class="field"><span>当前密码</span><input v-model="form.currentPassword" type="password" autocomplete="current-password" /></label>
              <label class="field"><span>新密码</span><input v-model="form.newPassword" type="password" autocomplete="new-password" placeholder="8-32 位强密码" /></label>
              <label class="field"><span>确认新密码</span><input v-model="form.confirmPassword" type="password" autocomplete="new-password" /></label>
            </div>
            <button class="btn" type="submit" :disabled="passwordLoading">{{ passwordLoading ? "更新中..." : "更新密码" }}</button>
          </form>

          <form class="card security-form-card" @submit.prevent="savePrivacy">
            <div class="section-head compact">
              <div>
                <p class="eyebrow">Privacy</p>
                <h3>隐私与公开范围</h3>
              </div>
            </div>
            <label class="toggle-field">
              <input v-model="privacyForm.showProfile" type="checkbox" />
              <span>允许其他书友查看我的个人主页</span>
            </label>
            <button class="btn ghost" type="submit" :disabled="privacyLoading">{{ privacyLoading ? "保存中..." : "保存隐私设置" }}</button>
          </form>

          <div class="security-bottom-grid">
            <article class="card device-card">
              <h3>登录设备</h3>
              <div class="device-list">
                <p v-for="device in devices" :key="device.name">
                  <span>
                    <strong>{{ device.name }}</strong>
                    <small>{{ device.location }} · {{ device.time }}</small>
                  </span>
                  <StatusBadge :label="device.current ? '当前设备' : '历史设备'" :type="device.current ? 'success' : 'default'" />
                </p>
              </div>
            </article>

            <article class="card device-card">
              <h3>操作日志</h3>
              <div class="device-list">
                <p v-for="log in logs" :key="log.action">
                  <span>
                    <strong>{{ log.action }}</strong>
                    <small>{{ log.detail }}</small>
                  </span>
                  <em>{{ log.time }}</em>
                </p>
              </div>
            </article>
          </div>
        </main>
      </div>
    </DataState>
  </section>
</template>
