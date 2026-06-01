<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { request } from "@/api";
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();
const member = computed(() => userStore.member);
const message = ref("");
const error = ref("");
const privacyMessage = ref("");
const privacyError = ref("");
const privacyForm = reactive({ showProfile: true });
const form = reactive({
  currentPassword: "",
  newPassword: "",
  confirmPassword: ""
});

onMounted(async () => {
  const data = await userStore.fetchMember();
  privacyForm.showProfile = data?.showProfile !== false;
});

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
  error.value = "";
  message.value = "";
  if (!form.currentPassword) {
    error.value = "请输入当前密码";
    return;
  }
  if (!validStrongPassword(form.newPassword)) {
    error.value = "新密码需为 8 到 32 位，并包含大小写字母、数字和特殊字符";
    return;
  }
  if (form.newPassword !== form.confirmPassword) {
    error.value = "两次输入的新密码不一致";
    return;
  }
  try {
    await request("/api/member/password", {
      method: "POST",
      body: JSON.stringify({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      })
    });
    Object.assign(form, { currentPassword: "", newPassword: "", confirmPassword: "" });
    message.value = "密码已修改";
  } catch (err) {
    error.value = err.message;
  }
}

async function savePrivacy() {
  privacyMessage.value = "";
  privacyError.value = "";
  try {
    const data = await request("/api/member/security", {
      method: "PATCH",
      body: JSON.stringify(privacyForm)
    });
    userStore.user = data;
    localStorage.setItem("coffee_user", JSON.stringify(data));
    await userStore.fetchMember();
    privacyMessage.value = "隐私设置已保存";
  } catch (err) {
    privacyError.value = err.message;
  }
}
</script>

<template>
  <section class="section">
    <div class="section-head">
      <div>
        <h2>安全设置</h2>
        <p class="lead">单独管理账号绑定信息和登录密码。</p>
      </div>
      <RouterLink class="btn ghost" to="/profile">返回个人资料</RouterLink>
    </div>

    <div class="profile-layout security-layout">
      <article class="card profile-card">
        <h3>账号绑定</h3>
        <p class="muted">邮箱和手机号来自会员资料，修改后会同步保存到 MySQL。</p>
        <div class="profile-inline-list">
          <p><span>绑定邮箱</span><strong>{{ member?.email || "暂未绑定" }}</strong></p>
          <p><span>绑定手机号</span><strong>{{ member?.phone || "暂未绑定" }}</strong></p>
          <p><span>账号状态</span><strong>正常</strong></p>
        </div>
        <RouterLink class="btn ghost" to="/profile">修改绑定信息</RouterLink>
      </article>

      <form class="card profile-card" @submit.prevent="changePassword">
        <h3>修改密码</h3>
        <p class="muted">密码更新后会以加密形式写入数据库。</p>
        <label class="field"><span>当前密码</span><input v-model="form.currentPassword" type="password" autocomplete="current-password" /></label>
        <label class="field"><span>新密码</span><input v-model="form.newPassword" type="password" autocomplete="new-password" placeholder="8-32 位强密码" /></label>
        <label class="field"><span>确认新密码</span><input v-model="form.confirmPassword" type="password" autocomplete="new-password" /></label>
        <p v-if="message" class="form-notice">{{ message }}</p>
        <p v-if="error" class="form-error">{{ error }}</p>
        <button class="btn" type="submit">更新密码</button>
      </form>

      <form class="card profile-card" @submit.prevent="savePrivacy">
        <h3>隐私设置</h3>
        <p class="muted">控制其他书友是否可以查看你的个人主页。</p>
        <label class="toggle-field"><input v-model="privacyForm.showProfile" type="checkbox" /><span>允许其他书友查看我的个人主页</span></label>
        <p v-if="privacyMessage" class="form-notice">{{ privacyMessage }}</p>
        <p v-if="privacyError" class="form-error">{{ privacyError }}</p>
        <button class="btn" type="submit">保存隐私设置</button>
      </form>
    </div>
  </section>
</template>
