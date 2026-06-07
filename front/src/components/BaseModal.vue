<script setup>
defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: "" },
  description: { type: String, default: "" }
});

defineEmits(["close"]);
</script>

<template>
  <div v-if="open" class="admin-modal-overlay" @click.self="$emit('close')">
    <article class="card admin-modal">
      <div class="admin-modal-head">
        <div>
          <h3>{{ title }}</h3>
          <p v-if="description" class="muted">{{ description }}</p>
        </div>
        <button class="icon-button" type="button" aria-label="关闭" @click="$emit('close')">x</button>
      </div>
      <slot></slot>
    </article>
  </div>
</template>
