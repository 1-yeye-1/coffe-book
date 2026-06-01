<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useCartStore } from "@/stores/cart";
import { formatTime, paymentMethodText, useOrderStore } from "@/stores/order";
import { useUserStore } from "@/stores/user";
import alipayQr from "../../assets/alipay-qr.jpg";
import wechatQr from "../../assets/wechat-pay-qr.jpg";

const route = useRoute();
const router = useRouter();
const cartStore = useCartStore();
const orderStore = useOrderStore();
const userStore = useUserStore();
const method = ref("wechat");
const processing = ref(false);
const error = ref("");
const reviewMessage = ref("");
const remain = ref(15 * 60);
let timer = null;
let reviewTimer = null;
let completed = false;

const methods = [
  { value: "wechat", title: "微信支付", desc: "请使用微信扫码完成付款", qr: wechatQr },
  { value: "alipay", title: "支付宝", desc: "请使用支付宝扫码完成付款", qr: alipayQr }
];

const order = computed(() => orderStore.getOrderById(route.params.orderId));
const countdown = computed(() => `${String(Math.floor(remain.value / 60)).padStart(2, "0")}:${String(remain.value % 60).padStart(2, "0")}`);
const selectedMethod = computed(() => methods.find((item) => item.value === method.value) || methods[0]);
const isExpired = computed(() => remain.value <= 0);
const isPaid = computed(() => order.value?.paymentStatus === "success");
const isReviewPending = computed(() => order.value?.paymentReviewStatus === "pending");
const isReviewRejected = computed(() => order.value?.paymentReviewStatus === "rejected");
const isCancelled = computed(() => order.value?.orderStatus === "cancelled");
const canPay = computed(() => order.value && !processing.value && !isReviewPending.value && !isExpired.value && !isPaid.value && !isCancelled.value);

onMounted(async () => {
  const member = await userStore.fetchMember().catch(() => null);
  orderStore.mergeRemoteOrders(member?.orders || []);
  startCountdown(Number(sessionStorage.getItem(deadlineKey()) || 0) || Date.now() + 15 * 60 * 1000);
  if (isReviewPending.value) startPaymentReviewPolling();
});

onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
  if (reviewTimer) clearInterval(reviewTimer);
});

async function pay() {
  if (!order.value) return;
  if (isPaid.value) return router.push(`/payment-success/${order.value.id}`);
  if (isCancelled.value) {
    error.value = "订单已取消，不能继续支付";
    return;
  }
  if (isExpired.value) {
    error.value = "支付已超时，请返回订单页重新发起支付";
    return;
  }
  processing.value = true;
  error.value = "";
  reviewMessage.value = "";
  orderStore.setProcessing(order.value.id, method.value);
  try {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const submitted = await orderStore.payOrder(order.value.id, method.value);
    processing.value = false;
    if (submitted.paymentStatus === "success") {
      await completePayment(submitted);
      return;
    }
    reviewMessage.value = "付款信息已提交，正在等待后台审核。审核通过后会自动进入支付成功页。";
    startPaymentReviewPolling();
  } catch (err) {
    error.value = err.message;
    processing.value = false;
  }
}

async function completePayment(paid) {
  if (completed) return;
  completed = true;
  if (reviewTimer) clearInterval(reviewTimer);
  cartStore.clearPaidItems(paid.items);
  await userStore.fetchMember().catch(() => null);
  router.push(`/payment-success/${paid.id}`);
}

async function checkPaymentStatus() {
  if (!order.value || completed) return;
  try {
    const latest = await orderStore.refreshPaymentStatus(order.value.id);
    if (latest.paymentStatus === "success") {
      await completePayment(latest);
      return;
    }
    if (latest.paymentReviewStatus === "rejected") {
      if (reviewTimer) clearInterval(reviewTimer);
      reviewTimer = null;
      reviewMessage.value = "";
      error.value = "付款审核未通过，请确认付款后重新提交审核。";
    }
  } catch (err) {
    error.value = err.message;
  }
}

function startPaymentReviewPolling() {
  reviewMessage.value = "付款信息已提交，正在等待后台审核。审核通过后会自动进入支付成功页。";
  if (reviewTimer) clearInterval(reviewTimer);
  checkPaymentStatus();
  reviewTimer = setInterval(checkPaymentStatus, 2500);
}

function deadlineKey() {
  return `coffee_payment_deadline_${route.params.orderId}`;
}

function startCountdown(endAt) {
  sessionStorage.setItem(deadlineKey(), String(endAt));
  if (timer) clearInterval(timer);
  remain.value = Math.max(0, Math.floor((endAt - Date.now()) / 1000));
  timer = setInterval(() => {
    remain.value = Math.max(0, Math.floor((endAt - Date.now()) / 1000));
    if (remain.value <= 0 && timer) {
      clearInterval(timer);
      timer = null;
    }
  }, 1000);
}

function restartPayment() {
  error.value = "";
  startCountdown(Date.now() + 15 * 60 * 1000);
}
</script>

<template>
  <section class="section payment-section premium-payment">
    <div class="section-head">
      <div>
        <h2>模拟支付</h2>
        <p class="lead">扫码完成付款后提交后台审核，审核通过并同步数据库后才会返回支付成功。</p>
      </div>
    </div>

    <div v-if="order" class="payment-layout">
      <form class="card payment-card glass-payment-card" @submit.prevent="pay">
        <div class="flow-steps"><span class="active">购物车</span><span class="active">确认订单</span><span class="active">模拟支付</span><span>支付成功</span></div>
        <div class="payment-headline">
          <div>
            <p class="eyebrow">Order No.</p>
            <h3>{{ order.id }}</h3>
            <p class="muted">创建时间：{{ formatTime(order.createdAt) }}</p>
          </div>
          <span id="payment-countdown">{{ countdown }}</span>
        </div>

        <div class="payment-methods">
          <label v-for="item in methods" :key="item.value" class="payment-method">
            <input v-model="method" type="radio" :value="item.value" />
            <span><strong>{{ item.title }}</strong><em>{{ item.desc }}</em></span>
          </label>
        </div>

        <div class="simulated-qr" :data-method="method">
          <img class="payment-qr-image" :src="selectedMethod.qr" :alt="`${selectedMethod.title}二维码`" />
          <div>
            <h3>{{ selectedMethod.title }}</h3>
            <p class="muted">{{ selectedMethod.desc }}。付款完成后请点击下方按钮提交后台审核。</p>
            <strong>￥{{ Number(order.payAmount).toFixed(2) }}</strong>
          </div>
        </div>

        <p v-if="isPaid" class="payment-processing">该订单已支付成功，可直接查看支付结果。</p>
        <p v-else-if="isReviewPending" class="payment-processing">{{ reviewMessage }}</p>
        <p v-else-if="isReviewRejected" class="payment-processing">上一次付款审核未通过，请重新确认并提交。</p>
        <p v-else-if="isExpired" class="payment-processing">支付已超时，可重新发起一次模拟支付。</p>
        <p v-else-if="isCancelled" class="payment-processing">订单已取消，不能继续支付。</p>
        <p v-else-if="processing" class="payment-processing">支付处理中...</p>
        <p v-if="error" class="form-error">{{ error }}</p>
        <button class="btn checkout-main-btn" type="submit" :disabled="!canPay">
          {{ isPaid ? "订单已支付" : isReviewPending ? "等待后台审核..." : isExpired ? "支付已超时" : processing ? "正在提交审核..." : `我已完成支付，提交审核 ￥${Number(order.payAmount).toFixed(2)}` }}
        </button>
        <button v-if="isExpired && !isCancelled && !isPaid" class="btn ghost" type="button" @click="restartPayment">重新发起支付</button>
        <RouterLink v-if="isPaid" class="link-button auth-switch" :to="`/payment-success/${order.id}`">查看支付结果</RouterLink>
        <RouterLink v-if="isExpired || isCancelled" class="link-button auth-switch" to="/orders">返回我的订单</RouterLink>
      </form>

      <aside class="card payment-summary checkout-summary-card">
        <p class="eyebrow">Receipt</p>
        <h3>订单摘要</h3>
        <div class="price-line"><span>订单号</span><strong>{{ order.id }}</strong></div>
        <div class="price-line"><span>支付方式</span><strong>{{ paymentMethodText[method] }}</strong></div>
        <div v-for="item in order.items" :key="item.productId" class="cart-row">
          <strong>{{ item.name }}</strong>
          <span>￥{{ Number(item.price).toFixed(2) }} × {{ item.quantity }}</span>
        </div>
        <div class="price-line"><span>优惠</span><strong class="discount">-￥{{ Number(order.discountAmount || 0).toFixed(2) }}</strong></div>
        <div class="price-line total"><span>实付金额</span><strong>￥{{ Number(order.payAmount).toFixed(2) }}</strong></div>
      </aside>
    </div>

    <div v-else class="card empty">
      <p class="muted">没有找到待支付订单。</p>
      <RouterLink class="btn" to="/orders">返回我的订单</RouterLink>
    </div>
  </section>
</template>
