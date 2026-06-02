<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import DataState from "@/components/DataState.vue";
import { useCartStore } from "@/stores/cart";
import { useUserStore } from "@/stores/user";

const router = useRouter();
const cartStore = useCartStore();
const userStore = useUserStore();
const quantityError = ref("");
const allSelected = computed(() => cartStore.items.length > 0 && cartStore.selectedIds.length === cartStore.items.length);

function checkout() {
  if (!cartStore.selectedItems.length) return;
  if (!userStore.isLoggedIn) {
    router.push({ name: "login", query: { redirect: "/checkout" } });
    return;
  }
  router.push("/checkout");
}

function changeQuantity(item, value, input) {
  quantityError.value = "";
  try {
    cartStore.updateQuantity(item.productId, Number(value));
  } catch (err) {
    quantityError.value = err.message;
    if (input) input.value = item.quantity;
  }
}
</script>

<template>
  <section class="section checkout-page" data-testid="cart-page">
    <div class="section-head">
      <div>
        <h2>购物车</h2>
        <p class="lead">支持数量加减、单选结算、库存校验和金额实时计算。</p>
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

      <div class="cart-workbench">
        <div class="card cart-panel premium-cart">
          <label class="cart-select-all">
            <input type="checkbox" :checked="allSelected" @change="cartStore.toggleAll($event.target.checked)" />
            <span>全选 / 取消全选</span>
          </label>
          <p v-if="quantityError" class="form-error">{{ quantityError }}</p>

          <div v-for="item in cartStore.items" :key="item.productId" class="cart-row cart-item-row" data-testid="cart-item">
            <label class="cart-check">
              <input
                type="checkbox"
                :checked="cartStore.selectedIds.includes(String(item.productId))"
                @change="cartStore.toggleSelected(item.productId, $event.target.checked)"
              />
            </label>
            <div class="cart-thumb">
              <img v-if="item.image" :src="item.image" :alt="item.name" />
              <span v-else>{{ item.name.slice(0, 1) }}</span>
            </div>
            <div class="cart-info">
              <strong>{{ item.name }}</strong>
              <span class="muted">单价 ¥{{ Number(item.price).toFixed(2) }}</span>
            </div>
            <div class="cart-quantity">
              <button class="icon-button" type="button" :disabled="item.quantity <= 1" @click="changeQuantity(item, item.quantity - 1)">-</button>
              <input :value="item.quantity" data-testid="cart-quantity" type="number" min="1" :max="item.stock || 1" step="1" @change="changeQuantity(item, $event.target.value, $event.target)" />
              <button class="icon-button" type="button" :disabled="item.quantity >= Number(item.stock || 1)" @click="changeQuantity(item, item.quantity + 1)">+</button>
              <small>1 到 {{ item.stock || 1 }}</small>
            </div>
            <strong>¥{{ (item.price * item.quantity).toFixed(2) }}</strong>
            <button class="btn ghost" type="button" @click="cartStore.removeProduct(item.productId)">删除</button>
          </div>
        </div>

        <aside class="card checkout-summary-card">
          <p class="eyebrow">Cart Summary</p>
          <h3>结算明细</h3>
          <div class="price-line"><span>已选数量</span><strong>{{ cartStore.selectedCount }} 件</strong></div>
          <div class="price-line"><span>商品小计</span><strong>¥{{ cartStore.subtotal.toFixed(2) }}</strong></div>
          <div class="price-line"><span>优惠金额</span><strong class="discount">-¥{{ cartStore.discountAmount.toFixed(2) }}</strong></div>
          <div class="price-line total"><span>应付金额</span><strong>¥{{ cartStore.payAmount.toFixed(2) }}</strong></div>
          <button class="btn checkout-main-btn" data-testid="checkout-button" type="button" :disabled="!cartStore.selectedItems.length" @click="checkout">去结算</button>
        </aside>
      </div>
    </DataState>
  </section>
</template>
