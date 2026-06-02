<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import DataState from "@/components/DataState.vue";
import { useCartStore } from "@/stores/cart";
import { useProductStore } from "@/stores/product";
import { useUserStore } from "@/stores/user";
import { integerRangeMessage } from "@/utils/validators";

const router = useRouter();
const cartStore = useCartStore();
const productStore = useProductStore();
const userStore = useUserStore();
const quantities = ref({});
const query = ref("");
const category = ref("all");
const message = ref("");
const error = ref("");

const categories = computed(() => {
  const items = new Set(productStore.mallProducts.map((product) => product.category || "creative"));
  return [
    { value: "all", label: "全部商品" },
    ...[...items].map((value) => ({ value, label: value === "coffee" ? "咖啡饮品" : "文创商品" }))
  ];
});

const filteredProducts = computed(() => {
  const keyword = query.value.trim().toLowerCase();
  return productStore.mallProducts.filter((product) => {
    const matchedCategory = category.value === "all" || product.category === category.value;
    const matchedText = !keyword || [product.name, product.description, product.category].join(" ").toLowerCase().includes(keyword);
    return matchedCategory && matchedText;
  });
});

onMounted(() => {
  if (!productStore.products.length) retry();
});

function quantity(product) {
  const value = quantities.value[product.id];
  return value === undefined || value === "" ? 1 : Number(value);
}

function validQuantity(product) {
  const stock = Number(product.stock || 0);
  const quantityError = integerRangeMessage(quantity(product), 1, stock, "商品数量");
  if (quantityError) {
    message.value = quantityError;
    quantities.value[product.id] = 1;
    return null;
  }
  return quantity(product);
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
    message.value = `已加入购物车：${product.name} x ${amount}`;
  } catch (err) {
    message.value = err.message;
  }
  setTimeout(() => { message.value = ""; }, 1800);
}

function retry() {
  error.value = "";
  productStore.fetchProducts().catch((err) => { error.value = err.message; });
}
</script>

<template>
  <section class="section catalog-page" data-testid="shop-page">
    <div class="section-head">
      <div>
        <h2>文创商城</h2>
        <p class="lead">咖啡饮品、文创周边和会员订单流程都从这里开始。</p>
      </div>
      <RouterLink v-if="userStore.isLoggedIn" class="btn ghost" to="/cart">查看购物车</RouterLink>
    </div>

    <div class="catalog-toolbar">
      <label>
        <span>搜索商品</span>
        <input v-model.trim="query" type="search" placeholder="输入商品名称或描述" />
      </label>
      <label>
        <span>分类筛选</span>
        <select v-model="category">
          <option v-for="item in categories" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
      </label>
      <strong>{{ filteredProducts.length }} 件商品</strong>
    </div>

    <p v-if="message" class="toast-inline">{{ message }}</p>
    <DataState
      :loading="productStore.loading"
      :error="error"
      :empty="!filteredProducts.length"
      loading-title="商品加载中"
      empty-title="没有匹配的商品"
      description="调整关键词或分类后再试试。"
      @retry="retry"
    >
      <div class="grid product-grid">
        <article v-for="product in filteredProducts" :key="product.id" class="card media-card product-card" data-testid="product-card">
          <img v-if="product.image" :src="product.image" :alt="product.name" />
          <div class="body">
            <div class="post-meta">
              <strong>{{ product.category === "coffee" ? "咖啡饮品" : "文创商品" }}</strong>
              <span>库存 {{ product.stock }}</span>
            </div>
            <h3>{{ product.name }}</h3>
            <p class="muted">{{ product.description }}</p>
            <p class="price">¥{{ Number(product.price).toFixed(2) }}</p>
            <label class="quantity-field">
              <span>数量</span>
              <input v-model.number="quantities[product.id]" data-testid="product-quantity" type="number" min="1" :max="product.stock" step="1" :disabled="product.stock <= 0" />
            </label>
            <small class="quantity-hint">请输入 1 到 {{ product.stock }} 之间的整数</small>
            <button class="btn" data-testid="add-to-cart" type="button" :disabled="product.stock <= 0" @click="add(product)">加入购物车</button>
          </div>
        </article>
      </div>
    </DataState>
  </section>
</template>
