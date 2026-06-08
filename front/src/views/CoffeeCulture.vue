<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import StatusBadge from "@/components/front/StatusBadge.vue";
import { useCartStore } from "@/stores/cart";
import { useProductStore } from "@/stores/product";
import { useUserStore } from "@/stores/user";

const router = useRouter();
const cartStore = useCartStore();
const productStore = useProductStore();
const userStore = useUserStore();
const quantities = ref({});
const message = ref("");
const drinks = computed(() => productStore.coffeeProducts);
const timeline = [
  ["2019", "城市第一家阅读咖啡复合店开业", "以咖啡、图书与安静阅读空间建立品牌雏形"],
  ["2021", "引入云南、埃塞、哥伦比亚精品豆产区计划", "形成产区故事、手冲课程和门店杯测体验"],
  ["2024", "上线咖啡百科和手冲课程", "把咖啡知识与读者社群活动串联起来"],
  ["2026", "形成咖啡、书籍、活动、文创一体化会员体系", "会员可在同一套业务流程里完成下单与积分成长"]
];
const culturePanels = [
  { title: "品牌故事", text: "从一张阅读长桌开始，把咖啡香气、书页质感和城市社交放进同一个空间。", tag: "Story" },
  { title: "咖啡产区", text: "精选云南、埃塞与哥伦比亚豆源，用不同风味连接读者的日常灵感。", tag: "Origin" },
  { title: "门店体验", text: "安静阅读区、靠窗座位区和咖啡交流区共同组成可预约的复合体验。", tag: "Store" }
];
const regionStats = [
  ["云南", "坚果 / 可可"],
  ["埃塞", "花香 / 柑橘"],
  ["哥伦比亚", "焦糖 / 莓果"]
];

onMounted(() => {
  if (!productStore.products.length) productStore.fetchProducts();
});

function qty(id) {
  return quantities.value[id] === undefined || quantities.value[id] === "" ? 1 : Number(quantities.value[id]);
}

function validQty(drink) {
  const value = qty(drink.id);
  if (!Number.isInteger(value) || value < 1 || value > Number(drink.stock || 0)) {
    message.value = `请输入 1 到 ${Number(drink.stock || 0)} 之间的整数数量`;
    quantities.value[drink.id] = 1;
    return null;
  }
  return value;
}

async function addDrink(drink) {
  if (!userStore.isLoggedIn) return router.push({ name: "login", query: { redirect: "/culture" } });
  const quantity = validQty(drink);
  if (!quantity) return;
  try {
    await cartStore.addProduct(drink, quantity, true);
    message.value = `已将 ${quantity} 杯 ${drink.name} 加入购物车`;
  } catch (err) {
    message.value = err.message;
  }
}

async function buyNow(drink) {
  if (!userStore.isLoggedIn) return router.push({ name: "login", query: { redirect: "/culture" } });
  const quantity = validQty(drink);
  if (!quantity) return;
  try {
    await cartStore.addProduct(drink, quantity, true);
  } catch (err) {
    message.value = err.message;
    return;
  }
  cartStore.selectedIds = [String(drink.id)];
  router.push("/checkout");
}

function imageFallback(event) {
  event.currentTarget.classList.add("image-placeholder-active");
  event.currentTarget.removeAttribute("src");
  event.currentTarget.alt = "";
}
</script>

<template>
  <section class="section culture-page-polish">
    <div class="business-hero culture-hero-polish">
      <div>
        <p class="eyebrow">Coffee Culture</p>
        <h1>咖啡文化</h1>
        <p>从品牌故事、精品产区到门店饮品下单的一站式体验，把咖啡知识做成可阅读、可参与、可购买的城市生活内容。</p>
        <div class="hero-chip-row">
          <span>品牌故事</span>
          <span>精品产区</span>
          <span>门店体验</span>
        </div>
      </div>
      <div class="hero-glass-card culture-hero-card">
        <strong>今日风味</strong>
        <span>云南小粒咖啡 · 坚果可可调</span>
        <button class="btn ghost" type="button">查看手冲笔记</button>
      </div>
    </div>

    <div class="section-head compact culture-section-head">
      <div>
        <h2>咖啡发展历程</h2>
        <p class="lead">从咖啡起源、产区迁徙到精品咖啡文化，形成可阅读、可体验的品牌内容线。</p>
      </div>
      <span class="link-button culture-link-static">查看更多</span>
    </div>
    <div class="culture-timeline-polish">
      <article v-for="[year, title, desc] in timeline" :key="year" class="card">
        <span>{{ year }}</span>
        <h3>{{ title }}</h3>
        <p>{{ desc }}</p>
      </article>
    </div>

    <div class="section-head compact">
      <div>
        <h2>招牌饮品</h2>
        <p class="lead">饮品与商城商品共用购物车、确认订单、模拟支付和积分成长流程。</p>
      </div>
      <StatusBadge :label="`${drinks.length} 款在售`" type="accent" />
    </div>
    <p v-if="message" class="toast-inline">{{ message }}</p>
    <div class="culture-drink-grid">
      <article v-for="drink in drinks" :key="drink.id" class="card media-card product-card">
        <img :src="drink.image" :alt="drink.name" @error="imageFallback" />
        <div class="body">
          <div class="post-meta"><h3>{{ drink.name }}</h3><span>可售 {{ drink.stock }}</span></div>
          <p class="muted">{{ drink.description }}</p>
          <p class="price">￥{{ Number(drink.price).toFixed(2) }}</p>
          <label class="quantity-field"><span>数量</span><input v-model.number="quantities[drink.id]" type="number" min="1" :max="drink.stock" step="1" /></label>
          <small class="quantity-hint">请输入 1 到 {{ drink.stock }} 之间的整数</small>
          <div class="actions">
            <button class="btn ghost" type="button" @click="addDrink(drink)">加入购物车</button>
            <button class="btn" type="button" @click="buyNow(drink)">立即购买</button>
          </div>
        </div>
      </article>
    </div>

    <div class="culture-bottom-grid">
      <article v-for="panel in culturePanels" :key="panel.title" class="card culture-story-card">
        <span>{{ panel.tag }}</span>
        <h3>{{ panel.title }}</h3>
        <p>{{ panel.text }}</p>
      </article>
      <article class="card culture-region-card">
        <h3>咖啡产区风味</h3>
        <div v-for="[name, taste] in regionStats" :key="name" class="rank-row">
          <span>{{ name }}</span>
          <div class="mini-progress"><i></i></div>
          <b>{{ taste }}</b>
        </div>
      </article>
    </div>
  </section>
</template>
