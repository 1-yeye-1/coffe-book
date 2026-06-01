<script setup>
import { onMounted, ref } from "vue";
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

onMounted(() => {
  if (!productStore.products.length) productStore.fetchProducts().catch((error) => { message.value = error.message; });
});

function quantity(product) {
  const value = quantities.value[product.id];
  return value === undefined || value === "" ? 1 : Number(value);
}

function validQuantity(product) {
  const value = quantity(product);
  const stock = Number(product.stock || 0);
  if (!Number.isInteger(value) || value < 1 || value > stock) {
    message.value = `请输入 1 到 ${stock} 之间的整数数量`;
    quantities.value[product.id] = 1;
    return null;
  }
  return value;
}

async function add(product) {
  if (!userStore.isLoggedIn) {
    router.push({ name: "login", query: { redirect: "/shop" } });
    return;
  }
  const amount = validQuantity(product);
  if (!amount) return;
  try {
    await cartStore.addProduct(product, amount, true);
    message.value = `已加入购物车：${product.name} × ${amount}`;
  } catch (err) {
    message.value = err.message;
  }
  setTimeout(() => { message.value = ""; }, 1800);
}
</script>

<template>
  <section class="section">
    <div class="section-head">
      <div>
        <h2>文创商城</h2>
        <p class="lead">保留原商品能力，购物车与模拟支付流程都从这里开始。</p>
      </div>
      <RouterLink v-if="userStore.isLoggedIn" class="btn ghost" to="/cart">查看购物车</RouterLink>
    </div>

    <p v-if="message" class="toast-inline">{{ message }}</p>
    <div v-if="productStore.loading" class="card empty">商品加载中...</div>
    <div v-else class="grid product-grid">
      <article v-for="product in productStore.mallProducts" :key="product.id" class="card media-card product-card">
        <img v-if="product.image" :src="product.image" :alt="product.name" />
        <div class="body">
          <div class="post-meta">
            <strong>{{ product.category === "coffee" ? "咖啡饮品" : "文创商品" }}</strong>
            <span>库存 {{ product.stock }}</span>
          </div>
          <h3>{{ product.name }}</h3>
          <p class="muted">{{ product.description }}</p>
          <p class="price">￥{{ Number(product.price).toFixed(2) }}</p>
          <label class="quantity-field">
            <span>数量</span>
            <input v-model.number="quantities[product.id]" type="number" min="1" :max="product.stock" step="1" :disabled="product.stock <= 0" />
          </label>
          <small class="quantity-hint">请输入 1 到 {{ product.stock }} 之间的整数</small>
          <button class="btn" type="button" :disabled="product.stock <= 0" @click="add(product)">加入购物车</button>
        </div>
      </article>
    </div>
  </section>
</template>
