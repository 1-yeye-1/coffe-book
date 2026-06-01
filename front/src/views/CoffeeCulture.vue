<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
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
</script>

<template>
  <section class="section">
    <div class="section-head"><div><h2>咖啡文化</h2><p class="lead">从品牌故事、精品产区到门店饮品下单的一站式体验。</p></div></div>
    <div class="grid">
      <article v-for="[year, text] in [['2019','城市第一家阅读咖啡复合店开业'], ['2021','引入云南、埃塞、哥伦比亚精品豆产区计划'], ['2024','上线咖啡百科和手冲课程'], ['2026','形成咖啡、书籍、活动、文创一体化会员体系']]" :key="year" class="card">
        <span class="status">{{ year }}</span>
        <h3>{{ text }}</h3>
        <p class="muted">品牌故事时间轴节点</p>
      </article>
    </div>
  </section>

  <section class="section">
    <div class="section-head"><div><h2>招牌饮品</h2><p class="lead">饮品与商城商品共用购物车、确认订单、模拟支付和积分成长流程。</p></div></div>
    <p v-if="message" class="toast-inline">{{ message }}</p>
    <div class="grid product-grid">
      <article v-for="drink in drinks" :key="drink.id" class="card media-card product-card">
        <img :src="drink.image" :alt="drink.name" />
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
  </section>
</template>
