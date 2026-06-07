<script setup>
defineProps({
  type: { type: String, default: "button" },
  variant: { type: String, default: "primary" },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false }
});
</script>

<template>
  <button
    :type="type"
    class="btn"
    :class="{ ghost: variant === 'ghost', danger: variant === 'danger', secondary: variant === 'secondary' }"
    :disabled="disabled || loading"
  >
    <span v-if="loading">处理中...</span>
    <slot v-else></slot>
  </button>
</template>
