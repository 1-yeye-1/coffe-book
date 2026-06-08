<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { request } from "@/api";
import DataState from "@/components/DataState.vue";
import BaseToast from "@/components/front/BaseToast.vue";
import StatusBadge from "@/components/front/StatusBadge.vue";
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();
const member = computed(() => userStore.member);
const loading = ref(false);
const error = ref("");
const saving = ref(false);
const toastMessage = ref("");
const toastType = ref("success");

const form = reactive({
  name: "",
  email: "",
  phone: "",
  birthday: "",
  bio: "",
  avatar: "",
  coffeePreference: "",
  bookPreference: "",
  address: ""
});

const stats = computed(() => member.value?.stats || { favoriteBooks: 0, publishedComments: 0, orderCount: 0 });
const membership = computed(() => member.value?.membership || {});
const progressPercent = computed(() => {
  const target = Number(membership.value.target || 1);
  const current = Number(membership.value.current || 0);
  return Math.min(100, Math.round((current / target) * 100));
});
const dataCards = computed(() => [
  { label: "收藏内容", value: stats.value.favoriteBooks, to: "/favorites", type: "accent", icon: "藏" },
  { label: "社区互动", value: stats.value.publishedComments, to: "/community", type: "success", icon: "评" },
  { label: "订单数量", value: stats.value.orderCount, to: "/orders", type: "warning", icon: "单" },
  { label: "礼品数量", value: member.value?.gifts?.length || 0, to: "/gifts", type: "default", icon: "礼" }
]);
const interestTags = computed(() => {
  const tags = [
    ...splitTags(form.coffeePreference),
    ...splitTags(form.bookPreference),
    ...(member.value?.favorites || []).slice(0, 3).map((item) => String(item).slice(0, 8))
  ];
  return Array.from(new Set(tags.filter(Boolean))).slice(0, 10);
});
const badgeCards = computed(() => [
  { title: membership.value.level || member.value?.level || "普通会员", desc: "当前会员等级", type: "accent" },
  { title: `${member.value?.points || 0} 积分`, desc: "可用于礼品兑换", type: "success" },
  { title: membership.value.checkedInToday ? "今日已签到" : "今日待签到", desc: "每日签到提升成长值", type: membership.value.checkedInToday ? "success" : "warning" }
]);
const preferenceCards = computed(() => [
  {
    label: "咖啡偏好",
    value: form.coffeePreference || "还未填写咖啡口味",
    hint: "用于推荐手冲、拿铁和季节限定饮品",
    icon: "C"
  },
  {
    label: "阅读偏好",
    value: form.bookPreference || "还未填写阅读方向",
    hint: "用于匹配书库分类、活动和社区内容",
    icon: "B"
  }
]);

onMounted(loadProfile);

watch(member, fillForm);

async function loadProfile() {
  loading.value = true;
  error.value = "";
  try {
    await userStore.fetchMember();
    fillForm(member.value);
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

function fillForm(value) {
  if (!value) return;
  Object.assign(form, {
    name: value.name || "",
    email: value.email || "",
    phone: value.phone || "",
    birthday: value.birthday || "",
    bio: value.bio || "",
    avatar: value.avatar || "",
    coffeePreference: value.coffeePreference || "",
    bookPreference: value.bookPreference || "",
    address: value.address || ""
  });
}

function splitTags(value) {
  return String(value || "").split(/[、,，\s]+/).map((item) => item.trim()).filter(Boolean);
}

function avatarText(name) {
  return name?.slice(0, 1) || "会";
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

function validPhone(phone) {
  return /^1[3-9]\d{9}$/.test(String(phone || "").trim());
}

function validEmail(email) {
  const value = String(email || "").trim();
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateProfile() {
  if (form.name.trim().length < 2 || form.name.trim().length > 30) return "用户名需为 2 到 30 个字符";
  if (!validEmail(form.email)) return "请输入正确的邮箱地址";
  if (!validPhone(form.phone)) return "请输入正确的 11 位手机号";
  if (form.bio.length > 200) return "个人简介不能超过 200 个字符";
  if (form.coffeePreference.length > 60 || form.bookPreference.length > 60) return "偏好设置不能超过 60 个字符";
  if (form.address.length > 160) return "收货地址不能超过 160 个字符";
  return "";
}

function handleAvatar(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    showToast("只能上传图片文件", "danger");
    return;
  }
  if (file.size > 1.5 * 1024 * 1024) {
    showToast("头像图片不能超过 1.5MB", "danger");
    return;
  }
  const reader = new FileReader();
  reader.addEventListener("load", () => { form.avatar = reader.result; });
  reader.readAsDataURL(file);
}

function handleAvatarError() {
  form.avatar = "";
}

async function save() {
  error.value = "";
  const validation = validateProfile();
  if (validation) {
    showToast(validation, "danger");
    return;
  }
  saving.value = true;
  try {
    const data = await request("/api/member/profile", {
      method: "PATCH",
      body: JSON.stringify(form)
    });
    userStore.user = data;
    localStorage.setItem("coffee_user", JSON.stringify(data));
    await userStore.fetchMember();
    showToast("个人资料已保存");
  } catch (err) {
    showToast(err.message, "danger");
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <section class="section profile-pro-page" data-testid="profile-page">
    <BaseToast :visible="Boolean(toastMessage)" :message="toastMessage" :type="toastType" />

    <DataState
      :loading="loading"
      :error="error"
      :empty="!member"
      loading-title="个人资料同步中"
      empty-title="暂未获取资料"
      description="登录后即可编辑基础资料、阅读偏好与咖啡偏好。"
      @retry="loadProfile"
    >
      <div class="profile-hero-pro profile-hero-final">
        <div class="profile-identity">
          <div class="profile-avatar-xl">
            <img v-if="form.avatar" :src="form.avatar" alt="头像预览" @error="handleAvatarError" />
            <span v-else>{{ avatarText(form.name) }}</span>
          </div>
          <div class="profile-identity-copy">
            <p class="eyebrow">Profile</p>
            <h2>{{ form.name || "咖啡书屋会员" }}</h2>
            <p class="lead">{{ form.bio || "完善资料后，书屋会更懂你的阅读和咖啡偏好。" }}</p>
            <div class="hero-chip-row">
              <StatusBadge :label="member?.level || '普通会员'" type="accent" />
              <StatusBadge :label="`${member?.points || 0} 积分`" type="success" />
              <StatusBadge :label="member?.showProfile === false ? '主页私密' : '主页公开'" type="warning" />
            </div>
          </div>
        </div>
        <div class="profile-hero-panel">
          <div>
            <span>会员成长值</span>
            <strong>{{ membership.current || 0 }} / {{ membership.target || 0 }}</strong>
          </div>
          <div class="mini-progress"><span :style="{ width: `${progressPercent}%` }"></span></div>
          <p>距离 {{ membership.nextLevel || "下一等级" }} 还需 {{ membership.need || 0 }} 成长值</p>
          <label class="btn ghost upload-button">更换头像<input type="file" accept="image/*" @change="handleAvatar" /></label>
        </div>
      </div>

      <div class="profile-pro-layout">
        <aside class="profile-side-stack">
          <article class="card member-level-card">
            <div class="level-progress-head">
              <div>
                <p class="eyebrow">Member Growth</p>
                <h3>{{ membership.level || member?.level || "普通会员" }}</h3>
              </div>
              <strong>{{ progressPercent }}%</strong>
            </div>
            <div class="mini-progress"><span :style="{ width: `${progressPercent}%` }"></span></div>
            <p class="muted">距离 {{ membership.nextLevel || "下一等级" }} 还需 {{ membership.need || 0 }} 成长值。</p>
          </article>

          <article class="card badge-wall-card">
            <h3>我的勋章</h3>
            <div class="badge-card-list">
              <div v-for="badge in badgeCards" :key="badge.title" class="badge-card-mini">
                <StatusBadge :label="badge.title" :type="badge.type" />
                <span>{{ badge.desc }}</span>
              </div>
            </div>
          </article>

          <article class="card profile-interest-card">
            <h3>兴趣标签</h3>
            <div class="tag-cloud">
              <button v-for="tag in interestTags" :key="tag" type="button">{{ tag }}</button>
              <span v-if="!interestTags.length" class="muted">填写偏好后自动生成标签</span>
            </div>
          </article>
        </aside>

        <main class="profile-main-stack">
          <div class="member-stat-grid profile-stat-grid-final">
            <RouterLink v-for="item in dataCards" :key="item.label" class="card member-stat-card link-card" :to="item.to">
              <span class="profile-stat-icon">{{ item.icon }}</span>
              <span>{{ item.label }}</span>
              <strong>{{ item.value }}</strong>
            </RouterLink>
          </div>

          <form class="card profile-edit-card" @submit.prevent="save">
            <div class="section-head compact">
              <div>
                <p class="eyebrow">Basic Info</p>
                <h3>基础资料</h3>
              </div>
              <button class="btn profile-save-btn" type="submit" :disabled="saving">{{ saving ? "保存中..." : "保存资料" }}</button>
            </div>
            <div class="profile-fields-grid">
              <label class="field"><span>昵称</span><input v-model.trim="form.name" maxlength="30" /></label>
              <label class="field"><span>手机号</span><input v-model.trim="form.phone" inputmode="numeric" maxlength="11" /></label>
              <label class="field"><span>邮箱</span><input v-model.trim="form.email" type="email" maxlength="160" /></label>
              <label class="field"><span>生日</span><input v-model="form.birthday" type="date" /></label>
            </div>
            <label class="field"><span>个人简介</span><textarea v-model.trim="form.bio" rows="4" maxlength="200" placeholder="介绍你的阅读和咖啡偏好"></textarea></label>
          </form>

          <article class="card profile-edit-card">
            <div class="section-head compact">
              <div>
                <p class="eyebrow">Preferences</p>
                <h3>偏好设置</h3>
              </div>
            </div>
            <div class="profile-preference-preview">
              <article v-for="item in preferenceCards" :key="item.label" class="profile-preference-card">
                <span>{{ item.icon }}</span>
                <div>
                  <small>{{ item.label }}</small>
                  <strong>{{ item.value }}</strong>
                  <em>{{ item.hint }}</em>
                </div>
              </article>
            </div>
            <div class="preference-card-grid">
              <label class="field"><span>咖啡偏好</span><input v-model.trim="form.coffeePreference" maxlength="60" placeholder="例如：手冲、拿铁、冷萃" /></label>
              <label class="field"><span>阅读偏好</span><input v-model.trim="form.bookPreference" maxlength="60" placeholder="例如：文学、商业、艺术" /></label>
            </div>
            <label class="field"><span>常用收货地址</span><textarea v-model.trim="form.address" rows="3" maxlength="160" placeholder="用于文创商品配送"></textarea></label>
            <button class="btn ghost profile-save-btn secondary" type="button" :disabled="saving" @click="save">{{ saving ? "保存中..." : "保存偏好" }}</button>
          </article>
        </main>
      </div>
    </DataState>
  </section>
</template>
