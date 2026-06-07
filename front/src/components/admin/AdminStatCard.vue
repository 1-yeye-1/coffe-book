<script setup>
defineProps({
  label: { type: String, default: "" },
  value: { type: [String, Number], default: "" },
  note: { type: String, default: "" },
  tone: { type: String, default: "primary" }
});
</script>

<template>
  <article class="admin-stat-card" :class="`admin-stat-card--${tone}`">
    <span class="admin-stat-card__icon" aria-hidden="true"></span>
    <div>
      <p>{{ label }}</p>
      <strong>{{ value }}</strong>
      <small>{{ note }}</small>
    </div>
  </article>
</template>
