<script setup>
defineProps({
  items: { type: Array, default: () => [] },
  active: { type: String, default: "" }
});

defineEmits(["change"]);
</script>

<template>
  <aside class="admin-sidebar-pro">
    <a class="admin-sidebar-pro__brand" href="/admin.html">
      <span class="brand-mark">咖</span>
      <span>
        <strong>咖啡书屋后台管理</strong>
        <small>Coffee Book Admin</small>
      </span>
    </a>

    <nav class="admin-sidebar-pro__nav" aria-label="后台管理模块">
      <button
        v-for="[key, label] in items"
        :key="key"
        :class="{ active: active === key }"
        :data-testid="`admin-nav-${key}`"
        type="button"
        @click="$emit('change', key)"
      >
        <span class="admin-sidebar-pro__dot" aria-hidden="true"></span>
        {{ label }}
      </button>
    </nav>

    <section class="admin-sidebar-pro__summary">
      <span>今日运营</span>
      <strong>实时在线</strong>
      <small>数据来自现有后台接口</small>
    </section>
  </aside>
</template>
