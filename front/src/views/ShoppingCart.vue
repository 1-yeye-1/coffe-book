<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { request } from "@/api";
import BaseModal from "@/components/BaseModal.vue";
import DataState from "@/components/DataState.vue";
import BaseToast from "@/components/front/BaseToast.vue";
import StatusBadge from "@/components/front/StatusBadge.vue";
import { useCartStore } from "@/stores/cart";
import { useProductStore } from "@/stores/product";
import { useUserStore } from "@/stores/user";

const router = useRouter();
const cartStore = useCartStore();
const productStore = useProductStore();
const userStore = useUserStore();

const quantityError = ref("");
const pendingRemove = ref(null);
const toastMessage = ref("");
const toastType = ref("success");

const categoryText = {
  creative: "文创周边",
  coffee: "咖啡饮品",
  book: "阅读好物",
  default: "精选商品"
};

const allSelected = computed(() => cartStore.items.length > 0 && cartStore.selectedIds.length === cartStore.items.length);
const memberLevel = computed(() => userStore.member?.level || userStore.user?.level || "普通会员");
const freeShippingGap = computed(() => Math.max(0, 168 - cartStore.subtotal));
const pointsDeduction = computed(() => {
  const points = Number(userStore.member?.points || userStore.user?.points || 0);
  return Math.min(cartStore.subtotal * 0.04, Math.floor(points / 100) || 0);
});
const displayPayAmount = computed(() => Math.max(0, cartStore.payAmount - pointsDeduction.value));
const cartGroups = computed(() => {
  const groups = new Map();
  cartStore.items.forEach((item) => {
    const key = itemCategory(item);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  });
  return [...groups.entries()].map(([key, items]) => ({
    key,
    title: categoryText[key] || categoryText.default,
    items
  }));
});
const recommendations = computed(() => {
  const cartIds = new Set(cartStore.items.map((item) => String(item.productId)));
  return productStore.mallProducts
    .filter((item) => !cartIds.has(String(item.id)))
    .slice(0, 4);
});

onMounted(async () => {
  try {
    await Promise.all([
      productStore.products.length ? Promise.resolve() : productStore.fetchProducts(),
      userStore.isLoggedIn ? cartStore.loadRemoteCart() : Promise.resolve(),
      userStore.isLoggedIn && !userStore.member ? userStore.fetchMember() : Promise.resolve()
    ]);
  } catch (err) {
    quantityError.value = err.message;
  }
});

function showToast(message, type = "success") {
  toastMessage.value = "";
  toastType.value = type;
  window.setTimeout(() => {
    toastMessage.value = message;
    window.setTimeout(() => {
      if (toastMessage.value === message) toastMessage.value = "";
    }, 2200);
  });
}

function productInfo(productId) {
  return productStore.products.find((item) => String(item.id) === String(productId)) || {};
}

function itemCategory(item) {
  return productInfo(item.productId).category || "creative";
}

function itemDescription(item) {
  return productInfo(item.productId).description || "咖啡书屋会员精选，支持到店自提与订单结算。";
}

function itemTag(item) {
  if (Number(item.stock || 0) <= 3) return { label: "库存紧张", type: "warning" };
  if (cartStore.selectedIds.includes(String(item.productId))) return { label: "已选中", type: "success" };
  return { label: categoryText[itemCategory(item)] || "商品", type: "accent" };
}

function imageFallback(event) {
  event.currentTarget.classList.add("image-placeholder-active");
  event.currentTarget.src = cartPlaceholder();
}

function cartPlaceholder() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="760" height="560" viewBox="0 0 760 560">
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
        <stop stop-color="#fff4e6"/>
        <stop offset=".58" stop-color="#d69a57"/>
        <stop offset="1" stop-color="#8b5e3c"/>
      </linearGradient>
    </defs>
    <rect width="760" height="560" fill="url(#g)"/>
    <circle cx="612" cy="94" r="112" fill="#fffdf8" opacity=".25"/>
    <rect x="118" y="152" width="360" height="210" rx="36" fill="#fffdf8" opacity=".55"/>
    <path d="M178 286c78-56 170-62 268-18" fill="none" stroke="#4a2c17" stroke-width="28" stroke-linecap="round" opacity=".2"/>
    <text x="118" y="438" fill="#4a2c17" font-family="Arial, sans-serif" font-size="38" font-weight="900">Coffee Book</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function checkout() {
  if (!cartStore.selectedItems.length) {
    showToast("请先选择要结算的商品", "warning");
    return;
  }
  if (!userStore.isLoggedIn) {
    router.push({ name: "login", query: { redirect: "/checkout" } });
    return;
  }
  router.push("/checkout");
}

async function changeQuantity(item, value, input) {
  quantityError.value = "";
  try {
    const nextValue = Number(value);
    if (userStore.isLoggedIn) await cartStore.syncQuantity(item.productId, nextValue);
    else cartStore.updateQuantity(item.productId, nextValue);
    showToast("购物车数量已更新");
  } catch (err) {
    quantityError.value = err.message;
    showToast(err.message, "danger");
    if (input) input.value = item.quantity;
  }
}

function askRemove(item) {
  pendingRemove.value = item;
}

function askRemoveSelected() {
  if (!cartStore.selectedItems.length) return;
  pendingRemove.value = { bulk: true, items: [...cartStore.selectedItems], name: `${cartStore.selectedItems.length} 件选中商品` };
}

async function removeItem(item = pendingRemove.value, withToast = true) {
  if (!item) return;
  quantityError.value = "";
  try {
    if (item.bulk) {
      for (const target of item.items) {
        if (userStore.isLoggedIn) await cartStore.syncRemoveProduct(target.productId);
        else cartStore.removeProduct(target.productId);
      }
      if (withToast) showToast("选中商品已从购物车移除");
    } else {
      if (userStore.isLoggedIn) await cartStore.syncRemoveProduct(item.productId);
      else cartStore.removeProduct(item.productId);
      if (withToast) showToast("商品已从购物车移除");
    }
  } catch (err) {
    quantityError.value = err.message;
    showToast(err.message, "danger");
  } finally {
    pendingRemove.value = null;
  }
}

async function moveToFavorite(item) {
  if (!userStore.isLoggedIn) {
    router.push({ name: "login", query: { redirect: "/cart" } });
    return;
  }
  try {
    const member = userStore.member || await userStore.fetchMember();
    const nextItems = Array.from(new Set([...(member?.favorites || []), item.name]));
    userStore.member = await request("/api/member/list", {
      method: "PATCH",
      body: JSON.stringify({ type: "favorites", items: nextItems })
    });
    await removeItem(item, false);
    showToast("已移入我的收藏");
  } catch (err) {
    showToast(err.message, "danger");
  }
}

async function addRecommend(product) {
  try {
    await cartStore.addProduct(product, 1, userStore.isLoggedIn);
    showToast("已加入购物车");
  } catch (err) {
    showToast(err.message, "danger");
  }
}
</script>

<template>
  <section class="section cart-page-pro" data-testid="cart-page">
    <BaseToast :visible="Boolean(toastMessage)" :message="toastMessage" :type="toastType" />

    <div class="cart-hero-final">
      <div class="cart-hero-copy">
        <p class="eyebrow">Coffee Book Cart</p>
        <h1>我的购物车</h1>
        <p>优质的咖啡与好书，轻松带回家。</p>
        <div class="cart-hero-stats">
          <span>商品 {{ cartStore.items.length }}</span>
          <span>已选 {{ cartStore.selectedCount }}</span>
          <span>{{ memberLevel }}</span>
        </div>
      </div>
      <RouterLink class="btn ghost" to="/shop">继续选购</RouterLink>
    </div>

    <DataState
      :empty="!cartStore.items.length"
      empty-title="购物车还是空的"
      description="先去文创商城挑选商品，再回来统一结算。"
    >
      <template #action>
        <RouterLink class="btn" to="/shop">去逛商城</RouterLink>
      </template>

      <div class="cart-layout-pro">
        <div class="cart-main-stack">
          <article class="card cart-control-bar">
            <label class="cart-select-all">
              <input type="checkbox" :checked="allSelected" @change="cartStore.toggleAll($event.target.checked)" />
              <span>全选（{{ cartStore.items.length }}）</span>
            </label>
            <button class="link-button danger" type="button" :disabled="!cartStore.selectedItems.length" @click="askRemoveSelected">
              删除选中
            </button>
            <button class="link-button" type="button" :disabled="!cartStore.selectedItems.length" @click="showToast('已为选中商品保留收藏入口')">
              移入收藏夹
            </button>
            <p v-if="quantityError" class="form-error">{{ quantityError }}</p>
            <div class="cart-coupon-strip">
              <strong>会员优惠</strong>
              <span>满 99 减 10，满 168 减 20，积分可抵扣本单金额。</span>
            </div>
          </article>

          <article v-for="group in cartGroups" :key="group.key" class="card cart-group-card">
            <div class="cart-group-head">
              <div>
                <p class="eyebrow">{{ group.key }}</p>
                <h3>{{ group.title }}</h3>
              </div>
              <span>{{ group.items.length }} 件</span>
            </div>

            <div v-for="item in group.items" :key="item.productId" class="cart-item-card-pro" data-testid="cart-item">
              <label class="cart-check">
                <input
                  type="checkbox"
                  :checked="cartStore.selectedIds.includes(String(item.productId))"
                  @change="cartStore.toggleSelected(item.productId, $event.target.checked)"
                />
              </label>
              <div class="cart-thumb-pro">
                <img v-if="item.image" :src="item.image" :alt="item.name" @error="imageFallback" />
                <span v-else>{{ item.name.slice(0, 1) }}</span>
              </div>
              <div class="cart-item-copy">
                <div class="cart-item-title-row">
                  <h3>{{ item.name }}</h3>
                  <StatusBadge :label="itemTag(item).label" :type="itemTag(item).type" />
                </div>
                <p>{{ itemDescription(item) }}</p>
                <div class="cart-item-meta">
                  <span>单价 ¥{{ Number(item.price).toFixed(2) }}</span>
                  <span>库存 {{ item.stock || 1 }}</span>
                  <span>预计返 {{ Math.max(1, Math.floor(Number(item.price || 0) / 10)) }} 积分</span>
                </div>
              </div>
              <div class="quantity-stepper">
                <button class="icon-button" type="button" :disabled="item.quantity <= 1" @click="changeQuantity(item, item.quantity - 1)">-</button>
                <input
                  :value="item.quantity"
                  data-testid="cart-quantity"
                  type="number"
                  min="1"
                  :max="item.stock || 1"
                  step="1"
                  @change="changeQuantity(item, $event.target.value, $event.target)"
                />
                <button class="icon-button" type="button" :disabled="item.quantity >= Number(item.stock || 1)" @click="changeQuantity(item, item.quantity + 1)">+</button>
              </div>
              <div class="cart-item-total">
                <span>小计</span>
                <strong>¥{{ (item.price * item.quantity).toFixed(2) }}</strong>
              </div>
              <div class="cart-item-actions">
                <button class="cart-icon-action" type="button" aria-label="移入收藏" @click="moveToFavorite(item)">♡</button>
                <button class="link-button danger" type="button" @click="askRemove(item)">删除</button>
              </div>
            </div>
          </article>
        </div>

        <aside class="checkout-summary-pro">
          <article class="card checkout-summary-card sticky-summary">
            <p class="eyebrow">Order Summary</p>
            <h3>订单摘要</h3>
            <div class="price-line"><span>已选数量</span><strong>{{ cartStore.selectedCount }} 件</strong></div>
            <div class="price-line"><span>商品总价</span><strong>¥{{ cartStore.subtotal.toFixed(2) }}</strong></div>
            <div class="price-line"><span>优惠金额</span><strong class="discount">-¥{{ cartStore.discountAmount.toFixed(2) }}</strong></div>
            <div class="price-line"><span>积分抵扣</span><strong class="discount">-¥{{ pointsDeduction.toFixed(2) }}</strong></div>
            <div class="price-line total"><span>实付金额</span><strong>¥{{ displayPayAmount.toFixed(2) }}</strong></div>
            <div class="summary-hint">
              <strong v-if="freeShippingGap > 0">再购 ¥{{ freeShippingGap.toFixed(2) }} 可享满减</strong>
              <strong v-else>已解锁最高满减</strong>
              <span>支持到店取货、积分返还与礼券兑换。</span>
            </div>
            <button class="btn checkout-main-btn" data-testid="checkout-button" type="button" :disabled="!cartStore.selectedItems.length" @click="checkout">
              去结算
            </button>
          </article>

          <article class="card cart-benefit-card">
            <h3>会员权益</h3>
            <ul class="clean-list">
              <li>订单完成后按实付金额返还积分</li>
              <li>部分文创商品支持门店自提免运费</li>
              <li>礼品券可在积分中心兑换并核销</li>
            </ul>
          </article>

          <article class="card cart-service-card">
            <span>正品保障</span>
            <span>极速发货</span>
            <span>7天无理由</span>
          </article>
        </aside>
      </div>

      <section v-if="recommendations.length" class="section-block recommend-strip">
        <div class="section-head compact">
          <div>
            <p class="eyebrow">Recommended</p>
            <h3>为你推荐</h3>
          </div>
        </div>
        <div class="recommend-grid">
          <article v-for="product in recommendations" :key="product.id" class="card recommend-product-card">
            <img v-if="product.image" :src="product.image" :alt="product.name" @error="imageFallback" />
            <div>
              <StatusBadge :label="product.category || '精选'" type="accent" />
              <h3>{{ product.name }}</h3>
              <p>{{ product.description || "适合搭配本次订单的咖啡书屋精选。" }}</p>
              <div class="cart-total">
                <strong>¥{{ Number(product.price || 0).toFixed(2) }}</strong>
                <button class="btn ghost" type="button" @click="addRecommend(product)">加入购物车</button>
              </div>
            </div>
          </article>
        </div>
      </section>
    </DataState>

    <BaseModal
      :open="Boolean(pendingRemove)"
      title="确认删除商品"
      :description="pendingRemove ? `是否从购物车删除「${pendingRemove.name}」？` : ''"
      @close="pendingRemove = null"
    >
      <div class="admin-modal-actions">
        <button class="btn ghost" type="button" @click="pendingRemove = null">取消</button>
        <button class="btn danger" type="button" @click="removeItem()">确认删除</button>
      </div>
    </BaseModal>
  </section>
</template>
