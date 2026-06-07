<script setup>
import { computed } from "vue";
import { RouterLink } from "vue-router";
import StatusBadge from "./StatusBadge.vue";

const props = defineProps({
  item: { type: Object, required: true },
  to: { type: [String, Object], default: "" },
  cta: { type: String, default: "" }
});

const tag = computed(() => props.item.tag || props.item.category || "推荐");
const title = computed(() => props.item.title || props.item.name || "咖啡书屋精选");
const image = computed(() => props.item.image || "");
const price = computed(() => props.item.price === undefined ? "" : `￥${Number(props.item.price || 0).toFixed(2)}`);
const cardAttrs = computed(() => props.to ? { to: props.to } : {});
const cardTag = computed(() => props.to ? RouterLink : "article");
</script>

<template>
  <component :is="cardTag" v-bind="cardAttrs" class="product-show-card">
    <img v-if="image" :src="image" :alt="title" />
    <div class="product-show-card__body">
      <StatusBadge :label="tag" type="accent" />
      <h3>{{ title }}</h3>
      <p>{{ item.description }}</p>
      <div class="product-show-card__meta">
        <strong v-if="price">{{ price }}</strong>
        <span>{{ cta || "查看推荐" }}</span>
      </div>
    </div>
  </component>
</template>
