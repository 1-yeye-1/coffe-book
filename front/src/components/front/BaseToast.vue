<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  message: { type: String, default: "" },
  type: { type: String, default: "success" }
});
</script>

<template>
  <Transition name="toast-pop">
    <div v-if="visible && message" class="base-toast" :class="`base-toast--${type}`" role="status">
      {{ message }}
    </div>
  </Transition>
</template>
