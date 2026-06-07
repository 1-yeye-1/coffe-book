<script setup>
defineProps({
  label: { type: String, default: "" },
  error: { type: String, default: "" },
  required: { type: Boolean, default: false }
});
</script>

<template>
  <label class="field">
    <span>{{ label }}<em v-if="required" aria-hidden="true">*</em></span>
    <slot></slot>
    <small v-if="error" class="field-error">{{ error }}</small>
  </label>
</template>
