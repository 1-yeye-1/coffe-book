<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import BaseToast from "@/components/front/BaseToast.vue";
import EmptyState from "@/components/front/EmptyState.vue";
import StatusBadge from "@/components/front/StatusBadge.vue";
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
const toastType = ref("success");

const categories = computed(() => {
  const items = new Set(productStore.products.map((product) => product.category || "creative"));
  return [
    { value: "all", label: "全部商品" },
    ...[...items].map((value) => ({ value, label: value === "coffee" ? "咖啡饮品" : "文创商品" }))
  ];
});

const filteredProducts = computed(() => {
  const keyword = query.value.trim().toLowerCase();
  return productStore.products.filter((product) => {
    const matchedCategory = category.value === "all" || product.category === category.value;
    const matchedText = !keyword || [product.name, product.description, product.category].join(" ").toLowerCase().includes(keyword);
    return matchedCategory && matchedText;
  });
});

const hotProducts = computed(() => [...productStore.products]
  .sort((a, b) => Number(b.price || 0) - Number(a.price || 0))
  .slice(0, 4));

const lowStockCount = computed(() => productStore.products.filter((product) => Number(product.stock || 0) <= 5).length);
const cartPreview = computed(() => cartStore.items.slice(0, 4));
const cartTotal = computed(() => cartStore.items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0));

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
    showToast(quantityError, "warning");
    quantities.value[product.id] = 1;
    return null;
  }
  return quantity(product);
}

async function add(product) {
  if (!userStore.isLoggedIn) {
    router.push({ name: "login", query: { redirect: "/shop" } });
    return false;
  }

  const amount = validQuantity(product);
  if (!amount) return false;

  try {
    await cartStore.addProduct(product, amount, true);
    showToast(`已加入购物车：${product.name} x ${amount}`);
    return true;
  } catch (err) {
    showToast(err.message, "danger");
    return false;
  }
}

async function buyNow(product) {
  const added = await add(product);
  if (added) router.push("/cart");
}

function retry() {
  error.value = "";
  productStore.fetchProducts().catch((err) => { error.value = err.message; });
}

function showToast(text, type = "success") {
  toastType.value = type;
  message.value = text;
  setTimeout(() => { message.value = ""; }, 1800);
}

function stockBadge(product) {
  const stock = Number(product.stock || 0);
  if (stock <= 0) return { label: "已售罄", type: "danger" };
  if (stock <= 5) return { label: "库存紧张", type: "warning" };
  return { label: "现货", type: "success" };
}

function imageFallback(event) {
  event.currentTarget.classList.add("image-placeholder-active");
  event.currentTarget.removeAttribute("src");
  event.currentTarget.alt = "";
}
</script>

<template>
  <section class="section shop-page-pro" data-testid="shop-page">
    <BaseToast :visible="Boolean(message)" :message="message" :type="toastType" />

    <div class="business-hero business-hero--shop">
      <div>
        <p class="eyebrow">Creative Market</p>
        <h1>文创商城</h1>
        <p>咖啡饮品、阅读周边和会员礼品集中展示，延续现有购物车接口并升级为现代电商式浏览体验。</p>
        <div class="hero-chip-row">
          <span>商品 {{ productStore.products.length }}</span>
          <span>热销 {{ hotProducts.length }}</span>
          <span>库存预警 {{ lowStockCount }}</span>
        </div>
      </div>
      <div class="hero-glass-card">
        <strong>￥{{ cartTotal.toFixed(2) }}</strong>
        <span>当前购物车金额</span>
        <RouterLink class="btn ghost" to="/cart">查看购物车</RouterLink>
      </div>
    </div>

    <div class="business-layout shop-layout">
      <aside class="filter-rail">
        <div class="filter-card catalog-toolbar">
          <label class="field">
            <span>搜索商品</span>
            <input v-model.trim="query" type="search" placeholder="输入商品名称或描述" />
          </label>
          <label class="field">
            <span>商品分类</span>
            <select v-model="category">
              <option v-for="item in categories" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </label>
        </div>

        <div class="filter-card">
          <h3>热销榜</h3>
          <RouterLink v-for="item in hotProducts" :key="item.id" class="mini-product-row" :to="`/shop/${item.id}`">
            <img v-if="item.image" :src="item.image" :alt="item.name" />
            <span>{{ item.name }}</span>
            <b>￥{{ Number(item.price || 0).toFixed(0) }}</b>
          </RouterLink>
        </div>
      </aside>

      <div class="business-main">
        <div class="section-head compact-head">
          <div>
            <h2>商品列表</h2>
            <p class="lead">数量选择、库存提示、加入购物车和立即购买继续使用原有业务函数。</p>
          </div>
          <StatusBadge :label="`${filteredProducts.length} 件商品`" type="accent" />
        </div>

        <div v-if="productStore.loading" class="skeleton-grid">
          <div v-for="item in 6" :key="item" class="skeleton-card"></div>
        </div>

        <p v-else-if="error" class="form-error">{{ error }}</p>

        <div v-else-if="filteredProducts.length" class="shop-product-grid">
          <article v-for="product in filteredProducts" :key="product.id" class="shop-product-card" data-testid="product-card">
            <RouterLink :to="`/shop/${product.id}`" class="shop-product-card__media">
              <img v-if="product.image" :src="product.image" :alt="product.name" @error="imageFallback" />
              <StatusBadge :label="stockBadge(product).label" :type="stockBadge(product).type" />
            </RouterLink>
            <div class="shop-product-card__body">
              <span class="product-category">{{ product.category === "coffee" ? "咖啡饮品" : "文创商品" }}</span>
              <h3>{{ product.name }}</h3>
              <p>{{ product.description }}</p>
              <div class="shop-price-row">
                <strong>￥{{ Number(product.price).toFixed(2) }}</strong>
                <span>库存 {{ product.stock }}</span>
              </div>
              <label class="quantity-field">
                <span>数量</span>
                <input v-model.number="quantities[product.id]" data-testid="product-quantity" type="number" min="1" :max="product.stock" step="1" :disabled="product.stock <= 0" />
              </label>
              <div class="actions">
                <button class="btn ghost" data-testid="add-to-cart" type="button" :disabled="product.stock <= 0" @click="add(product)">加入购物车</button>
                <button class="btn" data-testid="buy-now" type="button" :disabled="product.stock <= 0" @click="buyNow(product)">立即购买</button>
              </div>
            </div>
          </article>
        </div>

        <EmptyState
          v-else
          title="没有匹配的商品"
          description="调整关键词或分类后再试试。"
        />
      </div>

      <aside class="business-sidebar">
        <div class="side-panel checkout-summary-mini">
          <h3>购物车预览</h3>
          <div v-if="cartPreview.length" class="cart-preview-list">
            <div v-for="item in cartPreview" :key="item.productId" class="cart-preview-row">
              <span>{{ item.name }}</span>
              <b>x{{ item.quantity }}</b>
            </div>
          </div>
          <EmptyState v-else title="购物车为空" description="挑选一杯咖啡或一本书周边开始。" />
          <div class="summary-total">
            <span>小计</span>
            <strong>￥{{ cartTotal.toFixed(2) }}</strong>
          </div>
          <RouterLink class="btn" to="/cart">去结算</RouterLink>
        </div>

        <div class="side-panel">
          <h3>会员优惠</h3>
          <p>满 99 减 10，满 168 减 20；积分抵扣和优惠券将在结算页沿用原业务逻辑。</p>
          <div class="coupon-row"><span>新人咖啡券</span><b>-￥8</b></div>
          <div class="coupon-row"><span>阅读周边券</span><b>-￥12</b></div>
        </div>
      </aside>
    </div>
  </section>
</template>
