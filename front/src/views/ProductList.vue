<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import BaseToast from "@/components/front/BaseToast.vue";
import EmptyState from "@/components/front/EmptyState.vue";
import ProductCard from "@/components/front/ProductCard.vue";
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
const priceRange = ref("all");
const stockFilter = ref("all");
const sortKey = ref("recommend");
const favorites = ref(new Set());
const message = ref("");
const error = ref("");
const toastType = ref("success");

const categoryLabelMap = {
  all: "全部",
  coffee: "咖啡器具",
  creative: "文创周边"
};

const priceRanges = [
  { value: "all", label: "全部" },
  { value: "0-50", label: "0-50元", min: 0, max: 50 },
  { value: "50-100", label: "50-100元", min: 50, max: 100 },
  { value: "100-200", label: "100-200元", min: 100, max: 200 },
  { value: "200+", label: "200元以上", min: 200, max: Number.POSITIVE_INFINITY }
];

const stockFilters = [
  { value: "all", label: "全部" },
  { value: "in", label: "有货" },
  { value: "low", label: "库存紧张" }
];

const sortOptions = [
  { value: "recommend", label: "综合排序" },
  { value: "price-asc", label: "价格从低到高" },
  { value: "price-desc", label: "价格从高到低" },
  { value: "stock-desc", label: "库存优先" }
];

const categories = computed(() => {
  const items = new Set(productStore.products.map((product) => product.category || "creative"));
  return [
    { value: "all", label: "全部" },
    ...[...items].map((value) => ({ value, label: categoryLabelMap[value] || value }))
  ];
});

const filteredProducts = computed(() => {
  const keyword = query.value.trim().toLowerCase();
  const activePrice = priceRanges.find((item) => item.value === priceRange.value);

  return productStore.products.filter((product) => {
    const price = Number(product.price || 0);
    const stock = Number(product.stock || 0);
    const matchedCategory = category.value === "all" || product.category === category.value;
    const matchedText = !keyword || [product.name, product.description, product.category]
      .join(" ")
      .toLowerCase()
      .includes(keyword);
    const matchedPrice = !activePrice || activePrice.value === "all" || (price >= activePrice.min && price < activePrice.max);
    const matchedStock = stockFilter.value === "all"
      || (stockFilter.value === "in" && stock > 0)
      || (stockFilter.value === "low" && isLowStock(product));
    return matchedCategory && matchedText && matchedPrice && matchedStock;
  });
});

const sortedProducts = computed(() => {
  const products = [...filteredProducts.value];
  if (sortKey.value === "price-asc") return products.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
  if (sortKey.value === "price-desc") return products.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
  if (sortKey.value === "stock-desc") return products.sort((a, b) => Number(b.stock || 0) - Number(a.stock || 0));
  return products;
});

const hotProducts = computed(() => [...productStore.products]
  .sort((a, b) => Number(b.price || 0) - Number(a.price || 0))
  .slice(0, 4));

const lowStockCount = computed(() => productStore.products.filter(isLowStock).length);
const cartPreview = computed(() => cartStore.items.slice(0, 3));
const cartCount = computed(() => cartStore.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0));
const cartTotal = computed(() => cartStore.items.reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 1), 0));

onMounted(() => {
  if (!productStore.products.length) retry();
});

function quantity(product) {
  const value = quantities.value[product.id];
  return value === undefined || value === "" ? 1 : Number(value);
}

function setQuantity(product, value) {
  const stock = Number(product.stock || 0);
  if (stock <= 0) {
    quantities.value[product.id] = 0;
    return;
  }
  const next = Number(value);
  quantities.value[product.id] = Math.min(stock, Math.max(1, Number.isFinite(next) ? next : 1));
}

function adjustQuantity(product, step) {
  setQuantity(product, quantity(product) + step);
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

function isLowStock(product) {
  const stock = Number(product.stock || 0);
  return stock > 0 && stock <= 20;
}

function stockBadge(product) {
  const stock = Number(product.stock || 0);
  if (stock <= 0) return { label: "已售罄", type: "danger" };
  if (isLowStock(product)) return { label: "库存紧张", type: "warning" };
  return { label: "现货", type: "success" };
}

function productKind(product) {
  const text = `${product.name || ""}${product.description || ""}`;
  if (/杯|壶|滤|咖啡|手冲/.test(text)) return "咖啡器具";
  if (/书|笔记|书签|明信片/.test(text)) return "书籍周边";
  if (/香|灯|蜡烛|生活/.test(text)) return "生活用品";
  return categoryLabelMap[product.category] || "文创周边";
}

function productBadge(product, index) {
  if (index === 0) return "新品";
  if (index === 1) return "热销";
  if (index === 2) return "推荐";
  return productKind(product).replace("周边", "");
}

function productPlaceholder(product = {}) {
  const palettes = [
    ["#fff6e8", "#d0a071", "#8b5e3c"],
    ["#f5eadc", "#b98453", "#4a2c17"],
    ["#fff1dd", "#e8b04a", "#8b4a1f"],
    ["#f8f6f2", "#d8c0a4", "#5a3824"]
  ];
  const [base, mid, deep] = palettes[Number(product.id || 0) % palettes.length];
  const label = productKind(product).replace(/[<>&]/g, "");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="620" viewBox="0 0 900 620">
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
        <stop stop-color="${base}"/>
        <stop offset=".58" stop-color="${mid}"/>
        <stop offset="1" stop-color="${deep}"/>
      </linearGradient>
      <filter id="s" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="20" stdDeviation="22" flood-color="#4a2c17" flood-opacity=".18"/>
      </filter>
    </defs>
    <rect width="900" height="620" fill="url(#g)"/>
    <circle cx="716" cy="108" r="146" fill="#fffdf8" opacity=".26"/>
    <circle cx="152" cy="482" r="168" fill="#fffdf8" opacity=".2"/>
    <rect x="150" y="158" width="450" height="292" rx="42" fill="#fffdf8" opacity=".58" filter="url(#s)"/>
    <path d="M226 262c64-36 160-36 224 0 35 20 52 48 45 78-11 48-80 84-157 84s-146-36-157-84c-7-30 10-58 45-78Z" fill="${deep}" opacity=".2"/>
    <path d="M508 250h54c44 0 72 28 72 64 0 40-30 68-72 68h-44" fill="none" stroke="${deep}" stroke-width="26" stroke-linecap="round"/>
    <text x="150" y="526" fill="#4a2c17" font-family="Arial, sans-serif" font-size="38" font-weight="800">Coffee Book</text>
    <text x="150" y="570" fill="#8b5e3c" font-family="Arial, sans-serif" font-size="28" font-weight="700">${label}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function productImage(product) {
  if (String(product.image || "").includes("photo-1542291026-7eec264c27ff")) return productPlaceholder(product);
  return product.image || productPlaceholder(product);
}

function salesLabel(product) {
  const seed = Number(product.id || 1);
  return `${Math.max(18, seed * 7 + 42)} 件已售`;
}

function isFavorite(product) {
  return favorites.value.has(product.id);
}

function toggleFavorite(product) {
  const next = new Set(favorites.value);
  if (next.has(product.id)) {
    next.delete(product.id);
    showToast("已取消收藏", "warning");
  } else {
    next.add(product.id);
    showToast("已加入收藏");
  }
  favorites.value = next;
}

function resetFilters() {
  query.value = "";
  category.value = "all";
  priceRange.value = "all";
  stockFilter.value = "all";
  sortKey.value = "recommend";
}

function imageFallback(event, product) {
  event.currentTarget.classList.add("image-placeholder-active");
  event.currentTarget.src = productPlaceholder(product);
}
</script>

<template>
  <section class="section shop-page-pro" data-testid="shop-page">
    <BaseToast :visible="Boolean(message)" :message="message" :type="toastType" />

    <div class="business-hero business-hero--shop">
      <div class="shop-hero-copy">
        <p class="eyebrow">Creative Market</p>
        <h1>文创商城</h1>
        <p>精选书屋帆布袋、咖啡器具与生活香氛，把阅读时刻打包成可以带走的日常礼物。</p>
      </div>
      <div class="hero-glass-card shop-hero-card">
        <span>今日购物车</span>
        <strong>￥{{ cartTotal.toFixed(2) }}</strong>
        <small>{{ cartCount }} 件商品待结算</small>
        <RouterLink class="btn ghost" to="/cart">
          查看购物车
          <b v-if="cartCount" class="shop-cart-dot">{{ cartCount }}</b>
        </RouterLink>
      </div>
    </div>

    <div class="shop-toolbar catalog-toolbar">
      <div class="shop-toolbar__top">
        <label class="shop-search-field">
          <input v-model.trim="query" type="search" placeholder="搜索商品名称" />
          <span>⌕</span>
        </label>

        <label class="shop-select-field">
          <select v-model="category" aria-label="商品分类">
            <option v-for="item in categories" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </label>

        <div class="shop-category-tabs" aria-label="分类筛选">
          <button
            v-for="item in categories"
            :key="item.value"
            type="button"
            :class="{ active: category === item.value }"
            @click="category = item.value"
          >
            {{ item.label }}
          </button>
        </div>

        <span class="shop-filter-count">共 {{ filteredProducts.length }} 件商品</span>

        <label class="shop-select-field shop-sort-field">
          <select v-model="sortKey" aria-label="商品排序">
            <option v-for="item in sortOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
          </select>
        </label>
      </div>

      <div class="shop-toolbar__filters">
        <span>价格区间:</span>
        <button
          v-for="item in priceRanges"
          :key="item.value"
          type="button"
          :class="{ active: priceRange === item.value }"
          @click="priceRange = item.value"
        >
          {{ item.label }}
        </button>
        <span class="shop-toolbar__filter-label">库存状态:</span>
        <button
          v-for="item in stockFilters"
          :key="item.value"
          type="button"
          :class="{ active: stockFilter === item.value }"
          @click="stockFilter = item.value"
        >
          {{ item.label }}
        </button>
      </div>
    </div>

    <div class="shop-main-layout">
      <main class="shop-main-stack">
        <div class="section-head compact-head">
          <div>
            <h2>精选文创</h2>
            <p class="lead">价格、库存、销量与数量选择分层展示，加入购物车沿用原业务逻辑。</p>
          </div>
          <StatusBadge :label="`库存预警 ${lowStockCount}`" type="warning" />
        </div>

        <div v-if="productStore.loading" class="skeleton-grid shop-skeleton-grid">
          <div v-for="item in 8" :key="item" class="skeleton-card"></div>
        </div>

        <p v-else-if="error" class="form-error">{{ error }}</p>

        <div v-else-if="sortedProducts.length" class="shop-product-grid">
          <article
            v-for="(product, index) in sortedProducts"
            :key="product.id"
            class="shop-product-card"
            data-testid="product-card"
          >
            <div class="shop-product-card__media">
              <RouterLink :to="`/shop/${product.id}`" class="shop-product-card__image-link">
                <img :src="productImage(product)" :alt="product.name" @error="imageFallback($event, product)" />
              </RouterLink>
              <span class="shop-product-card__badge">{{ productBadge(product, index) }}</span>
              <button
                class="shop-favorite-button"
                type="button"
                :class="{ active: isFavorite(product) }"
                :aria-label="isFavorite(product) ? '取消收藏' : '加入收藏'"
                @click="toggleFavorite(product)"
              >
                ♥
              </button>
            </div>

            <div class="shop-product-card__body">
              <div class="shop-product-card__topline">
                <span class="product-category">{{ productKind(product) }}</span>
                <StatusBadge :label="stockBadge(product).label" :type="stockBadge(product).type" />
              </div>
              <RouterLink :to="`/shop/${product.id}`" class="shop-product-card__title">
                <h3>{{ product.name }}</h3>
              </RouterLink>
              <p>{{ product.description }}</p>

              <div class="shop-price-row">
                <strong>￥{{ Number(product.price).toFixed(2) }}</strong>
                <span>{{ salesLabel(product) }}</span>
              </div>

              <div class="shop-stock-row">
                <span>库存：{{ product.stock }}</span>
                <b v-if="isLowStock(product)">仅剩 {{ product.stock }} 件</b>
              </div>

              <div class="shop-product-card__actions">
                <div class="shop-quantity-stepper" aria-label="数量选择">
                  <button type="button" :disabled="product.stock <= 0 || quantity(product) <= 1" @click="adjustQuantity(product, -1)">−</button>
                  <input
                    :value="quantity(product)"
                    data-testid="product-quantity"
                    type="number"
                    min="1"
                    :max="product.stock"
                    step="1"
                    :disabled="product.stock <= 0"
                    @input="setQuantity(product, $event.target.value)"
                    @change="setQuantity(product, $event.target.value)"
                  />
                  <button type="button" :disabled="product.stock <= 0 || quantity(product) >= Number(product.stock || 0)" @click="adjustQuantity(product, 1)">+</button>
                </div>
                <button class="btn shop-add-button" data-testid="add-to-cart" type="button" :disabled="product.stock <= 0" @click="add(product)">
                  加入购物车
                </button>
              </div>
            </div>
          </article>
        </div>

        <EmptyState
          v-else
          title="没有匹配的商品"
          description="调整关键词、价格或库存条件后再试试。"
        >
          <button class="btn ghost" type="button" @click="resetFilters">重置筛选</button>
        </EmptyState>
      </main>

      <aside class="shop-sidebar">
        <div class="side-panel checkout-summary-mini shop-cart-panel">
          <div class="shop-panel-title">
            <h3>购物车</h3>
            <span class="shop-cart-count">{{ cartCount }}</span>
            <RouterLink to="/cart">编辑</RouterLink>
          </div>

          <div v-if="cartPreview.length" class="shop-cart-preview-list">
            <div v-for="item in cartPreview" :key="item.productId" class="shop-cart-preview-row">
              <img :src="item.image || productPlaceholder(item)" :alt="item.name" @error="imageFallback($event, item)" />
              <div>
                <strong>{{ item.name }}</strong>
                <span>￥{{ Number(item.price || 0).toFixed(2) }}</span>
              </div>
              <b>x{{ item.quantity }}</b>
            </div>
          </div>
          <EmptyState v-else title="购物车为空" description="挑选一件书屋好物开始。" />

          <div class="summary-total">
            <span>合计（{{ cartCount }}件）</span>
            <strong>￥{{ cartTotal.toFixed(2) }}</strong>
          </div>
          <RouterLink class="btn" to="/cart">去结算</RouterLink>
          <RouterLink class="btn ghost" to="/shop">继续选购</RouterLink>
          <div class="shop-service-row">
            <span>正品保证</span>
            <span>7天无理由</span>
            <span>会员积分</span>
          </div>
        </div>

        <div class="side-panel shop-recommend-panel">
          <h3>热销推荐</h3>
          <ProductCard
            v-for="item in hotProducts.slice(0, 2)"
            :key="item.id"
            :item="item"
            :to="`/shop/${item.id}`"
            cta="查看详情"
            compact
          />
        </div>

        <div class="side-panel shop-member-panel">
          <h3>黄金会员权益</h3>
          <p>满 99 减 10，满 168 减 20；积分抵扣和优惠券将在结算页沿用原业务逻辑。</p>
          <div class="coupon-row"><span>积分先赚</span><b>+5%</b></div>
          <div class="coupon-row"><span>专属折扣</span><b>9.5折</b></div>
          <RouterLink class="btn ghost" to="/points">立即升级</RouterLink>
        </div>
      </aside>
    </div>
  </section>
</template>
