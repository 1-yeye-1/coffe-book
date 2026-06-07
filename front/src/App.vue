<script setup>
import { computed, onBeforeUnmount, onMounted, watch } from "vue";
import { RouterView, useRoute, useRouter } from "vue-router";
import AppFooter from "@/components/front/AppFooter.vue";
import AppHeader from "@/components/front/AppHeader.vue";
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
const messageCount = computed(() => userStore.member?.notifications?.length || 0);
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
    <AppHeader
      :is-logged-in="userStore.isLoggedIn"
      :user="userStore.user"
      :account-links="accountLinks"
      :cart-count="cartCount"
      :message-count="messageCount"
      @logout="logout"
    />

    <main class="main page-transition">
      <RouterView />
    </main>

    <AppFooter />
  </div>
</template>
