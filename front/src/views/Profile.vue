<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { request } from "@/api";
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();
const member = computed(() => userStore.member);
const message = ref("");
const error = ref("");

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
const dataCards = computed(() => [
  { label: "收藏书籍", value: stats.value.favoriteBooks, to: "/favorites" },
  { label: "发布评论", value: stats.value.publishedComments, to: "/community" },
  { label: "订单数量", value: stats.value.orderCount, to: "/orders" }
]);

onMounted(async () => {
  await userStore.fetchMember();
  fillForm(member.value);
});

watch(member, fillForm);

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

function avatarText(name) {
  return name?.slice(0, 1) || "会";
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
    error.value = "只能上传图片文件";
    return;
  }
  if (file.size > 1.5 * 1024 * 1024) {
    error.value = "头像图片不能超过 1.5MB";
    return;
  }
  const reader = new FileReader();
  reader.addEventListener("load", () => { form.avatar = reader.result; });
  reader.readAsDataURL(file);
}

async function save() {
  error.value = "";
  message.value = "";
  const validation = validateProfile();
  if (validation) {
    error.value = validation;
    return;
  }
  try {
    const data = await request("/api/member/profile", {
      method: "PATCH",
      body: JSON.stringify(form)
    });
    userStore.user = data;
    localStorage.setItem("coffee_user", JSON.stringify(data));
    await userStore.fetchMember();
    message.value = "个人资料已保存";
  } catch (err) {
    error.value = err.message;
  }
}
</script>

<template>
  <section class="section">
    <div class="section-head">
      <div>
        <h2>个人资料</h2>
        <p class="lead">基础资料、我的数据和偏好设置均与 MySQL 会员数据对应。</p>
      </div>
    </div>

    <form class="profile-page-grid" @submit.prevent="save">
      <article class="card profile-card profile-basic-card">
        <div class="profile-avatar-row">
          <div class="profile-avatar">
            <img v-if="form.avatar" :src="form.avatar" alt="头像预览" />
            <span v-else>{{ avatarText(form.name) }}</span>
          </div>
          <div>
            <h3>基础资料</h3>
            <p class="muted">头像、用户名、邮箱、手机号和个人简介会保存到会员表。</p>
            <label class="btn ghost upload-button">上传头像<input type="file" accept="image/*" @change="handleAvatar" /></label>
          </div>
        </div>

        <div class="profile-account-meta">
          <span>会员编号 #{{ member?.id || "-" }}</span>
          <span>{{ member?.level || "普通会员" }}</span>
          <span>{{ member?.points || 0 }} 积分</span>
        </div>

        <div class="profile-fields-grid">
          <label class="field"><span>用户名</span><input v-model.trim="form.name" maxlength="30" /></label>
          <label class="field"><span>邮箱</span><input v-model.trim="form.email" type="email" maxlength="160" placeholder="用于绑定邮箱" /></label>
          <label class="field"><span>手机号</span><input v-model.trim="form.phone" inputmode="numeric" maxlength="11" placeholder="用于绑定手机号" /></label>
          <label class="field"><span>生日</span><input v-model="form.birthday" type="date" /></label>
        </div>
        <label class="field"><span>个人简介</span><textarea v-model.trim="form.bio" rows="4" maxlength="200" placeholder="介绍你的阅读和咖啡偏好"></textarea></label>
      </article>

      <aside class="card profile-card profile-data-panel">
        <div>
          <h3>我的数据</h3>
          <p class="muted">点击数据可以查看对应详情。</p>
        </div>
        <div class="profile-data-grid">
          <RouterLink v-for="item in dataCards" :key="item.label" class="profile-data-card" :to="item.to">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </RouterLink>
        </div>
        <div class="profile-inline-list">
          <p><span>会员等级</span><strong>{{ member?.level || "-" }}</strong></p>
          <p><span>可用积分</span><strong>{{ member?.points || 0 }}</strong></p>
        </div>
      </aside>

      <article class="card profile-card profile-preferences-card">
        <h3>偏好设置</h3>
        <p class="muted">完善偏好和配送信息后，活动推荐与文创订单会更贴合你的使用习惯。</p>
        <div class="profile-fields-grid">
          <label class="field"><span>喜欢的咖啡类型</span><input v-model.trim="form.coffeePreference" maxlength="60" placeholder="例如：手冲、拿铁、冷萃" /></label>
          <label class="field"><span>喜欢的书籍分类</span><input v-model.trim="form.bookPreference" maxlength="60" placeholder="例如：文学、商业、艺术" /></label>
        </div>
        <label class="field"><span>收货地址</span><textarea v-model.trim="form.address" rows="3" maxlength="160" placeholder="用于文创商品配送"></textarea></label>
        <p v-if="message" class="form-notice">{{ message }}</p>
        <p v-if="error" class="form-error">{{ error }}</p>
        <button class="btn" type="submit">保存资料</button>
      </article>
    </form>
  </section>
</template>
