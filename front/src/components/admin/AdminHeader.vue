<script setup>
defineProps({
  title: { type: String, default: "工作台" },
  subtitle: { type: String, default: "运营数据与待处理事项总览" },
  user: { type: Object, default: () => ({}) },
  loading: { type: Boolean, default: false }
});

defineEmits(["refresh", "logout"]);
</script>

<template>
  <header class="admin-header-pro">
    <button class="admin-header-pro__menu" type="button" aria-label="后台菜单">☰</button>
    <div class="admin-header-pro__title">
      <strong>{{ title }}</strong>
      <small>{{ subtitle }}</small>
    </div>
    <label class="admin-header-pro__search">
      <span class="sr-only">搜索</span>
      <input type="search" placeholder="搜索用户、订单、活动..." />
    </label>

    <div class="admin-header-pro__actions">
      <button class="header-icon-link" type="button" :disabled="loading" @click="$emit('refresh')">
        {{ loading ? "刷新中" : "刷新" }}
      </button>
      <button class="header-icon-link" type="button">通知<span class="header-badge">6</span></button>
      <button class="header-icon-link" type="button">消息<span class="header-badge">15</span></button>
      <div class="admin-header-pro__user">
        <span class="user-avatar">{{ user?.name?.slice(0, 1) || "管" }}</span>
        <span>
          <strong>{{ user?.name || "运营管理员" }}</strong>
          <small>{{ user?.role || "管理员" }}</small>
        </span>
      </div>
      <button class="btn ghost admin-header-pro__logout" type="button" @click="$emit('logout')">退出</button>
    </div>
  </header>
</template>
