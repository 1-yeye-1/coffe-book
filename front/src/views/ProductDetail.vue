<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import DataState from "@/components/DataState.vue";
import { useCartStore } from "@/stores/cart";
import { useProductStore } from "@/stores/product";
import { useUserStore } from "@/stores/user";
import { integerRangeMessage } from "@/utils/validators";

const route = useRoute();
const router = useRouter();
const cartStore = useCartStore();
const productStore = useProductStore();
const userStore = useUserStore();
const loading = ref(false);
const error = ref("");
const message = ref("");
const quantity = ref(1);

const product = computed(() => productStore.currentProduct);
const categoryText = computed(() => product.value?.category === "coffee" ? "咖啡饮品" : "文创商品");
const soldOut = computed(() => Number(product.value?.stock || 0) <= 0);

onMounted(loadProduct);

async function loadProduct() {
  loading.value = true;
  error.value = "";
  try {
    await productStore.fetchProduct(route.params.productId);
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

function validateQuantity() {
  const stock = Number(product.value?.stock || 0);
  const quantityError = integerRangeMessage(quantity.value, 1, stock, "商品数量");
  if (quantityError) {
    message.value = quantityError;
    return null;
  }
  return Number(quantity.value);
}

async function addToCart(goCheckout = false) {
  if (!product.value) return;
  if (!userStore.isLoggedIn) {
    router.push({ name: "login", query: { redirect: route.fullPath } });
    return;
  }
  const amount = validateQuantity();
  if (!amount) return;
  try {
    await cartStore.addProduct(product.value, amount, true);
    message.value = "已加入购物车";
    if (goCheckout) router.push("/cart");
  } catch (err) {
    message.value = err.message;
  }
}
</script>

<template>
  <section class="section product-detail-page">
    <RouterLink class="link-button" to="/shop">返回商城</RouterLink>
    <DataState
      :loading="loading"
      :error="error"
      :empty="!product"
      loading-title="商品加载中"
      empty-title="商品不存在"
      description="请返回商城重新选择商品。"
      @retry="loadProduct"
    >
      <div class="detail-hero product-detail-hero">
        <img v-if="product.image" :src="product.image" :alt="product.name" />
        <article class="card product-detail-card">
          <p class="eyebrow">{{ categoryText }}</p>
          <h2>{{ product.name }}</h2>
          <p class="lead">{{ product.description }}</p>
          <div class="order-status-grid">
            <div><span>售价</span><strong>￥{{ Number(product.price).toFixed(2) }}</strong></div>
            <div><span>库存</span><strong>{{ product.stock }}</strong></div>
            <div><span>状态</span><strong>{{ soldOut ? "已售罄" : "可购买" }}</strong></div>
          </div>
          <label class="quantity-field product-detail-quantity">
            <span>购买数量</span>
            <input v-model.number="quantity" type="number" min="1" :max="product.stock" step="1" :disabled="soldOut" />
          </label>
          <p v-if="message" class="toast-inline">{{ message }}</p>
          <div class="actions">
            <button class="btn ghost" type="button" :disabled="soldOut" @click="addToCart(false)">加入购物车</button>
            <button class="btn" type="button" :disabled="soldOut" @click="addToCart(true)">立即购买</button>
          </div>
        </article>
      </div>
    </DataState>
  </section>
</template>
