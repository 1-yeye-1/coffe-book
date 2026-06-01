<script setup>
import { computed, onBeforeUnmount, onMounted, watch } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import { useCartStore } from "@/stores/cart";
import { useProductStore } from "@/stores/product";
import { useSiteStore } from "@/stores/site";
import { useUserStore } from "@/stores/user";

const route = useRoute();
const router = useRouter();
const cartStore = useCartStore();
const productStore = useProductStore();
const siteStore = useSiteStore();
const userStore = useUserStore();
let refreshTimer = null;

const cartCount = computed(() => cartStore.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0));
const accountLinks = computed(() => [
  { to: "/cart", label: "购物车", badge: cartCount.value || "" },
  { to: "/orders", label: "我的订单" },
  { to: "/favorites", label: "我的收藏" },
  { to: "/notes", label: "我的笔记" },
  { to: "/notifications", label: "消息通知" },
  { to: "/points", label: "积分中心" },
  { to: "/gifts", label: "我的礼券" },
  { to: "/member", label: userStore.user?.level || "会员中心" },
  { to: "/profile", label: "个人资料" },
  { to: "/security", label: "安全设置" }
]);

onMounted(async () => {
  refreshVisibleData();
  if (userStore.isLoggedIn) userStore.fetchMember().catch(() => {
    userStore.logout();
    cartStore.clearCart();
  });
  else cartStore.clearCart();
  window.addEventListener("focus", refreshVisibleData);
  refreshTimer = setInterval(refreshVisibleData, 10000);
});

onBeforeUnmount(() => {
  window.removeEventListener("focus", refreshVisibleData);
  if (refreshTimer) clearInterval(refreshTimer);
});

watch(() => route.fullPath, refreshVisibleData);

function refreshVisibleData() {
  const tasks = [productStore.fetchProducts()];
  if (route.path === "/") tasks.push(siteStore.fetchHome());
  if (route.path.startsWith("/books")) tasks.push(siteStore.fetchBooks());
  if (route.path.startsWith("/activities")) tasks.push(siteStore.fetchActivities());
  if (route.path.startsWith("/community")) tasks.push(siteStore.fetchPosts());
  if (userStore.isLoggedIn) tasks.push(userStore.fetchMember());
  return Promise.allSettled(tasks);
}

function logout() {
  userStore.logout();
  cartStore.clearCart();
  router.push("/");
}
</script>

<template>
  <div class="app-shell vue-shell">
    <header class="topbar">
      <RouterLink class="brand brand-button" to="/brand">
        <span class="brand-mark">咖</span>
        <span>
          <strong>咖啡书屋</strong>
          <small>点击查看品牌介绍</small>
        </span>
      </RouterLink>

      <nav class="nav">
        <RouterLink to="/">首页</RouterLink>
        <RouterLink to="/culture">咖啡文化</RouterLink>
        <RouterLink to="/books">精品书库</RouterLink>
        <RouterLink to="/shop">文创商城</RouterLink>
        <RouterLink to="/reservations">在线预约</RouterLink>
        <RouterLink to="/community">书友社区</RouterLink>
        <RouterLink to="/activities">活动赛事</RouterLink>
      </nav>

      <div class="auth-actions">
        <template v-if="userStore.isLoggedIn">
          <div class="account-menu">
            <button class="account-trigger" type="button">
              <span class="avatar">
                <img v-if="userStore.user?.avatar" :src="userStore.user.avatar" :alt="userStore.user.name" />
                <span v-else>{{ userStore.user?.name?.slice(0, 1) || "会" }}</span>
              </span>
              <span class="account-trigger-text">
                <strong>{{ userStore.user?.name || "个人中心" }}</strong>
                <small>{{ userStore.user?.level || "普通会员" }}</small>
              </span>
              <span class="chevron">⌄</span>
            </button>
            <div class="account-dropdown">
              <RouterLink v-for="item in accountLinks" :key="item.to" :to="item.to">
                <span>{{ item.label }}</span>
                <span v-if="item.badge" class="menu-badge">{{ item.badge }}</span>
              </RouterLink>
              <button type="button" @click="logout"><span>退出登录</span></button>
            </div>
          </div>
        </template>
        <template v-else>
          <RouterLink class="btn ghost" to="/register">注册</RouterLink>
          <RouterLink class="btn" to="/login">登录</RouterLink>
        </template>
      </div>
    </header>

    <main class="main page-transition">
      <RouterView />
    </main>
  </div>
</template>
