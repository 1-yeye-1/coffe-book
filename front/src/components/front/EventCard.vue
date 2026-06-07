<script setup>
import { RouterLink } from "vue-router";
import StatusBadge from "./StatusBadge.vue";

defineProps({
  event: { type: Object, required: true },
  to: { type: [String, Object], default: "/activities" }
});
</script>

<template>
  <RouterLink class="event-show-card" :to="to">
    <img v-if="event.image" :src="event.image" :alt="event.title" />
    <div class="event-show-card__content">
      <StatusBadge :label="event.tag || '活动推荐'" type="warning" />
      <h3>{{ event.title }}</h3>
      <p>{{ event.description }}</p>
      <span>查看活动</span>
    </div>
  </RouterLink>
</template>
