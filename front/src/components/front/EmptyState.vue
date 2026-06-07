<script setup>
defineProps({
  title: { type: String, default: "暂无数据" },
  description: { type: String, default: "稍后再来看看，或尝试调整筛选条件。" }
});
</script>

<template>
  <section class="empty-state-pro">
    <span class="empty-state-pro__icon" aria-hidden="true">0</span>
    <h3>{{ title }}</h3>
    <p>{{ description }}</p>
    <slot></slot>
  </section>
</template>
