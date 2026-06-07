<script setup>
defineProps({
  open: { type: Boolean, default: false },
  title: { type: String, default: "" }
});

defineEmits(["close"]);
</script>

<template>
  <Transition name="drawer-slide">
    <div v-if="open" class="admin-drawer-mask" @click.self="$emit('close')">
      <aside class="admin-drawer">
        <header>
          <h3>{{ title }}</h3>
          <button class="icon-button" type="button" aria-label="关闭" @click="$emit('close')">x</button>
        </header>
        <slot></slot>
      </aside>
    </div>
  </Transition>
</template>
