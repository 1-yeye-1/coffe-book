<script setup>
defineProps({
  tag: { type: String, default: "section" }
});
</script>

<template>
  <component :is="tag" class="card">
    <slot></slot>
  </component>
</template>
