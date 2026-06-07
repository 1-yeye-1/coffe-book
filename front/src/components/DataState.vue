<script setup>
import BaseButton from "@/components/BaseButton.vue";

defineProps({
  loading: { type: Boolean, default: false },
  error: { type: String, default: "" },
  empty: { type: Boolean, default: false },
  loadingTitle: { type: String, default: "正在加载" },
  emptyTitle: { type: String, default: "暂无数据" },
  errorTitle: { type: String, default: "加载失败" },
  description: { type: String, default: "" }
});

defineEmits(["retry"]);
</script>

<template>
  <div v-if="loading" class="state-card loading-state" role="status">
    <span class="state-icon" aria-hidden="true"></span>
    <div>
      <strong>{{ loadingTitle }}</strong>
      <p>{{ description || "请稍候，正在同步最新数据。" }}</p>
    </div>
  </div>

  <div v-else-if="error" class="state-card error-state" role="alert">
    <span class="state-icon" aria-hidden="true">!</span>
    <div>
      <strong>{{ errorTitle }}</strong>
      <p>{{ error }}</p>
      <BaseButton variant="ghost" @click="$emit('retry')">重试</BaseButton>
    </div>
  </div>

  <div v-else-if="empty" class="state-card empty-state-rich">
    <span class="state-icon" aria-hidden="true">0</span>
    <div>
      <strong>{{ emptyTitle }}</strong>
      <p>{{ description || "换个筛选条件试试，或先创建一条新记录。" }}</p>
      <slot name="action"></slot>
    </div>
  </div>

  <slot v-else></slot>
</template>
