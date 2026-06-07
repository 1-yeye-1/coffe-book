<script setup>
defineProps({
  label: { type: String, default: "" },
  type: { type: String, default: "default" }
});
</script>

<template>
  <span class="admin-status-badge" :class="`admin-status-badge--${type}`">
    <slot>{{ label }}</slot>
  </span>
</template>
