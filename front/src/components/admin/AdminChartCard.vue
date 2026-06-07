<script setup>
defineProps({
  title: { type: String, default: "" },
  description: { type: String, default: "" }
});
</script>

<template>
  <section class="admin-chart-card">
    <header>
      <div>
        <h3>{{ title }}</h3>
        <p v-if="description">{{ description }}</p>
      </div>
      <slot name="action"></slot>
    </header>
    <slot></slot>
  </section>
</template>
