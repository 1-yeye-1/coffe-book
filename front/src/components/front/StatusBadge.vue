<script setup>
import { computed } from "vue";

const props = defineProps({
  label: { type: String, default: "" },
  type: { type: String, default: "default" }
});

const badgeClass = computed(() => `status-badge status-badge--${props.type || "default"}`);
</script>

<template>
  <span :class="badgeClass">
    <slot>{{ label }}</slot>
  </span>
</template>
