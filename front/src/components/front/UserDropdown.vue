<script setup>
import { RouterLink } from "vue-router";

defineProps({
  user: { type: Object, default: () => ({}) },
  links: { type: Array, default: () => [] }
});

defineEmits(["logout"]);
</script>

<template>
  <div class="user-dropdown">
    <button class="user-dropdown__trigger" type="button" aria-haspopup="true">
      <span class="user-avatar">
        <img v-if="user?.avatar" :src="user.avatar" :alt="user.name || '会员头像'" />
        <span v-else>{{ user?.name?.slice(0, 1) || "会" }}</span>
      </span>
      <span class="user-dropdown__meta">
        <strong>{{ user?.name || "个人中心" }}</strong>
        <small>{{ user?.level || "普通会员" }}</small>
      </span>
      <span class="user-dropdown__chevron" aria-hidden="true">⌄</span>
    </button>

    <div class="user-dropdown__panel" role="menu">
      <RouterLink v-for="item in links" :key="item.to" :to="item.to" role="menuitem">
        <span>{{ item.label }}</span>
        <span v-if="item.badge" class="menu-badge">{{ item.badge }}</span>
      </RouterLink>
      <button type="button" role="menuitem" @click="$emit('logout')">退出登录</button>
    </div>
  </div>
</template>
