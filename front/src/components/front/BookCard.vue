<script setup>
import { computed } from "vue";
import { RouterLink } from "vue-router";
import StatusBadge from "./StatusBadge.vue";

const props = defineProps({
  book: { type: Object, required: true },
  status: { type: String, default: "在馆可读" },
  rating: { type: [String, Number], default: "4.8" }
});

const badgeType = computed(() => (props.status.includes("借出") ? "warning" : "success"));

function imageFallback(event) {
  event.currentTarget.classList.add("image-placeholder-active");
  event.currentTarget.removeAttribute("src");
  event.currentTarget.alt = "";
}
</script>

<template>
  <RouterLink class="book-show-card" :to="`/books/${book.id}`">
    <img v-if="book.image" :src="book.image" :alt="book.title" @error="imageFallback" />
    <div>
      <StatusBadge :label="status" :type="badgeType" />
      <h3>{{ book.title }}</h3>
      <p>{{ book.author }} / {{ book.publisher || "咖啡书屋馆藏" }}</p>
      <span class="book-show-card__status">评分 {{ rating }} · {{ book.category || "精选阅读" }}</span>
    </div>
  </RouterLink>
</template>
