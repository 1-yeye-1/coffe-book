<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useCartStore } from "@/stores/cart";
import { useCommercialStore } from "@/stores/commercial";
import { useOrderStore } from "@/stores/order";
import { useUserStore } from "@/stores/user";

const router = useRouter();
const cartStore = useCartStore();
const commercialStore = useCommercialStore();
const orderStore = useOrderStore();
const userStore = useUserStore();
const loading = ref(false);
const error = ref("");

const form = reactive({
  deliveryType: "pickup",
  contactName: userStore.user?.name || "",
  phone: userStore.user?.phone || "",
  remark: "",
  coupon: "none",
  usePoints: false
});

const memberDiscountRate = computed(() => Number(commercialStore.memberLevel?.discountRate || userStore.member?.membership?.discountRate || 1));
const coupons = computed(() => {
  const totalAmount = cartStore.selectedItems.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity || 1), 0);
  const usable = commercialStore.unusedCoupons
    .filter((coupon) => totalAmount >= Number(coupon.threshold || 0))
    .map((coupon) => ({
      ...coupon,
      id: coupon.couponId,
      amount: coupon.type === "discount" || (coupon.type === "member_exclusive" && Number(coupon.value) < 1)
        ? Math.max(0, totalAmount - totalAmount * Number(coupon.value || 1))
        : Number(coupon.value || 0)
    }));
  return [{ id: "none", name: "不使用优惠券", amount: 0 }, ...usable];
});
const selectedCoupon = computed(() => coupons.value.find((item) => String(item.id) === String(form.coupon)) || coupons.value[0]);
const price = computed(() => {
  const totalAmount = cartStore.selectedItems.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity || 1), 0);
  const deliveryFee = form.deliveryType === "delivery" ? 8 : 0;
  const autoDiscount = totalAmount >= 168 ? 20 : totalAmount >= 99 ? 10 : 0;
  const couponDiscount = Math.min(totalAmount, Math.max(autoDiscount, Number(selectedCoupon.value.amount || 0)));
  const memberDiscount = Number((totalAmount * (1 - memberDiscountRate.value)).toFixed(2));
  const discountAmount = Math.min(totalAmount, couponDiscount + memberDiscount);
  const pointsDeduction = form.usePoints ? Math.min(12, Math.floor(totalAmount * 0.05)) : 0;
  const payAmount = Math.max(0, totalAmount + deliveryFee - discountAmount - pointsDeduction);
  return { totalAmount, deliveryFee, couponDiscount, memberDiscount, discountAmount, pointsDeduction, payAmount };
});

onMounted(async () => {
  if (!cartStore.selectedItems.length && cartStore.items.length) cartStore.toggleAll(true);
  await Promise.allSettled([
    commercialStore.fetchMemberLevel(),
    commercialStore.fetchMemberCoupons()
  ]);
  if (form.coupon === "none" && coupons.value.length > 1) form.coupon = coupons.value[1].id;
});

function validPhone(phone) {
  return /^1[3-9]\d{9}$/.test(String(phone || "").trim());
}

function validateOrder() {
  if (!cartStore.selectedItems.length) {
    error.value = "请选择需要结算的商品";
    return false;
  }
  if (cartStore.selectedItems.some((item) => !Number.isInteger(Number(item.quantity)) || Number(item.quantity) < 1 || Number(item.quantity) > Number(item.stock || 1))) {
    error.value = "商品数量必须是有效库存范围内的整数";
    return false;
  }
  if (String(form.contactName || "").trim().length < 2 || String(form.contactName || "").trim().length > 30) {
    error.value = "联系人需为 2 到 30 个字符";
    return false;
  }
  if (!validPhone(form.phone)) {
    error.value = "请输入正确的 11 位手机号";
    return false;
  }
  if (String(form.remark || "").length > 120) {
    error.value = "备注不能超过 120 个字符";
    return false;
  }
  return true;
}

async function submit() {
  error.value = "";
  if (!validateOrder()) return;
  loading.value = true;
  try {
    const order = await orderStore.createOrder({
      items: cartStore.selectedItems.map((item) => ({ ...item })),
      contactName: form.contactName,
      phone: form.phone,
      deliveryType: form.deliveryType,
      remark: String(form.remark || "").trim(),
      coupon: form.coupon,
      couponId: form.coupon === "none" ? "" : form.coupon,
      memberDiscountRate: memberDiscountRate.value,
      ...price.value
    });
    router.push(`/pay/${order.id}`);
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="section checkout-page" data-testid="checkout-page">
    <div class="section-head">
      <div>
        <h2>确认订单</h2>
        <p class="lead">左侧确认商品与收货/自取信息，右侧价格卡片实时计算优惠与实付金额。</p>
      </div>
    </div>

    <form v-if="cartStore.selectedItems.length" class="checkout-layout" data-testid="checkout-form" @submit.prevent="submit">
      <div class="checkout-left">
        <div class="card order-flow-card">
          <div class="flow-steps"><span class="active">购物车</span><span class="active">确认订单</span><span>模拟支付</span><span>支付成功</span></div>
          <h3>订单商品</h3>
          <div v-for="item in cartStore.selectedItems" :key="item.productId" class="checkout-item">
            <div class="cart-thumb">
              <img v-if="item.image" :src="item.image" :alt="item.name" />
              <span v-else>{{ item.name.slice(0, 1) }}</span>
            </div>
            <div>
              <strong>{{ item.name }}</strong>
              <p class="muted">￥{{ Number(item.price).toFixed(2) }} × {{ item.quantity }}</p>
            </div>
            <strong>￥{{ (item.price * item.quantity).toFixed(2) }}</strong>
          </div>
        </div>

        <div class="card order-flow-card">
          <h3>收货 / 自取信息</h3>
          <div class="choice-grid">
            <label class="choice-card">
              <input v-model="form.deliveryType" type="radio" value="pickup" />
              <span><strong>到店自取</strong><em>凭订单号到前台取货，免配送费</em></span>
            </label>
            <label class="choice-card">
              <input v-model="form.deliveryType" type="radio" value="delivery" />
              <span><strong>门店配送</strong><em>周边 3km 内模拟配送，配送费 8 元</em></span>
            </label>
          </div>
          <div class="form-grid">
            <label class="field"><span>联系人</span><input v-model.trim="form.contactName" data-testid="checkout-contact" maxlength="30" required /></label>
            <label class="field"><span>手机号</span><input v-model.trim="form.phone" data-testid="checkout-phone" inputmode="numeric" maxlength="11" required /></label>
          </div>
          <label class="field"><span>备注</span><textarea v-model.trim="form.remark" rows="3" maxlength="120" placeholder="例如：少糖、礼品包装、预计到店时间"></textarea></label>
        </div>
      </div>

      <aside class="card checkout-summary-card">
        <p class="eyebrow">Checkout</p>
        <h3>价格结算</h3>
        <label class="field">
          <span>优惠券</span>
          <select v-model="form.coupon">
            <option v-for="coupon in coupons" :key="coupon.id" :value="coupon.id">{{ coupon.name }}</option>
          </select>
        </label>
        <label class="toggle-field"><input v-model="form.usePoints" type="checkbox" /> 使用积分抵扣</label>
        <div class="price-line"><span>商品金额</span><strong>￥{{ price.totalAmount.toFixed(2) }}</strong></div>
        <div class="price-line"><span>配送费</span><strong>￥{{ price.deliveryFee.toFixed(2) }}</strong></div>
        <div class="price-line"><span>会员折扣</span><strong class="discount">-￥{{ price.memberDiscount.toFixed(2) }}</strong></div>
        <div class="price-line"><span>优惠券/满减</span><strong class="discount">-￥{{ price.couponDiscount.toFixed(2) }}</strong></div>
        <div class="price-line"><span>积分抵扣</span><strong class="discount">-￥{{ price.pointsDeduction.toFixed(2) }}</strong></div>
        <div class="price-line total"><span>实付金额</span><strong>￥{{ price.payAmount.toFixed(2) }}</strong></div>
        <p v-if="error" class="form-error">{{ error }}</p>
        <button class="btn checkout-main-btn" data-testid="submit-order" type="submit" :disabled="loading">{{ loading ? "正在创建订单..." : "提交订单并支付" }}</button>
        <p class="muted">订单创建复用后端 `/api/orders`，扩展结算信息保存在 Pinia + localStorage。</p>
      </aside>
    </form>

    <div v-else class="card empty">
      <p class="muted">没有可结算的商品。</p>
      <RouterLink class="btn" to="/cart">返回购物车</RouterLink>
    </div>
  </section>
</template>
