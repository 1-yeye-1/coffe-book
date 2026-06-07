<script setup>
import { RouterLink } from "vue-router";
import UserDropdown from "./UserDropdown.vue";

defineProps({
  isLoggedIn: { type: Boolean, default: false },
  user: { type: Object, default: () => ({}) },
  accountLinks: { type: Array, default: () => [] },
  cartCount: { type: Number, default: 0 },
  messageCount: { type: Number, default: 0 }
});

defineEmits(["logout"]);

const navLinks = [
  { to: "/", label: "首页" },
  { to: "/culture", label: "咖啡文化" },
  { to: "/books", label: "精品书库" },
  { to: "/shop", label: "文创商城" },
  { to: "/reservations", label: "在线预约" },
  { to: "/community", label: "书友社区" },
  { to: "/activities", label: "活动赛事" }
];
</script>

<template>
  <header class="app-header">
    <RouterLink class="brand brand-button app-header__brand" to="/brand" aria-label="咖啡书屋品牌介绍">
      <span class="brand-mark">咖</span>
      <span>
        <strong>咖啡书屋</strong>
        <small>Coffee Book Club</small>
      </span>
    </RouterLink>

    <nav class="app-header__nav" aria-label="前台导航">
      <RouterLink v-for="item in navLinks" :key="item.to" :to="item.to">{{ item.label }}</RouterLink>
    </nav>

    <div class="app-header__actions">
      <template v-if="isLoggedIn">
        <RouterLink class="header-icon-link" to="/cart" aria-label="购物车">
          <span>购物车</span>
          <span v-if="cartCount" class="header-badge">{{ cartCount }}</span>
        </RouterLink>
        <RouterLink class="header-icon-link" to="/notifications" aria-label="消息中心">
          <span>消息</span>
          <span v-if="messageCount" class="header-badge">{{ messageCount }}</span>
        </RouterLink>
        <UserDropdown :user="user" :links="accountLinks" @logout="$emit('logout')" />
      </template>
      <template v-else>
        <RouterLink class="btn ghost" to="/register">注册</RouterLink>
        <RouterLink class="btn" to="/login">登录</RouterLink>
      </template>
    </div>
  </header>
</template>
