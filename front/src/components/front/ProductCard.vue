<script setup>
import { computed } from "vue";
import { RouterLink } from "vue-router";
import StatusBadge from "./StatusBadge.vue";

const props = defineProps({
  item: { type: Object, required: true },
  to: { type: [String, Object], default: "" },
  cta: { type: String, default: "" },
  compact: { type: Boolean, default: false }
});

const tag = computed(() => props.item.tag || props.item.category || "推荐");
const title = computed(() => props.item.title || props.item.name || "咖啡书屋精选");
const image = computed(() => props.item.image || placeholderImage.value);
const price = computed(() => props.item.price === undefined ? "" : `￥${Number(props.item.price || 0).toFixed(2)}`);
const stock = computed(() => props.item.stock === undefined ? "" : `库存 ${Number(props.item.stock || 0)}`);
const placeholderImage = computed(() => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="520" viewBox="0 0 720 520">
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
        <stop stop-color="#fff6e8"/>
        <stop offset=".58" stop-color="#d0a071"/>
        <stop offset="1" stop-color="#8b5e3c"/>
      </linearGradient>
    </defs>
    <rect width="720" height="520" fill="url(#g)"/>
    <circle cx="574" cy="92" r="112" fill="#fffdf8" opacity=".25"/>
    <rect x="112" y="154" width="360" height="204" rx="36" fill="#fffdf8" opacity=".56"/>
    <text x="112" y="430" fill="#4a2c17" font-family="Arial, sans-serif" font-size="34" font-weight="800">Coffee Book</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
});
const cardAttrs = computed(() => props.to ? { to: props.to } : {});
const cardTag = computed(() => props.to ? RouterLink : "article");

function imageFallback(event) {
  event.currentTarget.classList.add("image-placeholder-active");
  event.currentTarget.src = placeholderImage.value;
}
</script>

<template>
  <component :is="cardTag" v-bind="cardAttrs" :class="['product-show-card', { 'product-show-card--compact': compact }]">
    <img v-if="image" :src="image" :alt="title" @error="imageFallback" />
    <div class="product-show-card__body">
      <div class="product-show-card__topline">
        <StatusBadge :label="tag" type="accent" />
        <small v-if="stock">{{ stock }}</small>
      </div>
      <h3>{{ title }}</h3>
      <p>{{ item.description }}</p>
      <div class="product-show-card__meta">
        <strong v-if="price">{{ price }}</strong>
        <span>{{ cta || "查看推荐" }}</span>
      </div>
    </div>
  </component>
</template>
