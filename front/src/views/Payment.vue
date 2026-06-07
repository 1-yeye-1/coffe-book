<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useCartStore } from "@/stores/cart";
import { formatTime, paymentMethodText, useOrderStore } from "@/stores/order";
import { useUserStore } from "@/stores/user";

const route = useRoute();
const router = useRouter();
const cartStore = useCartStore();
const orderStore = useOrderStore();
const userStore = useUserStore();

const method = ref("wechat");
const payment = ref(null);
const remain = ref(0);
const error = ref("");
const message = ref("");
const loadingCreate = ref(false);
const loadingSubmit = ref(false);
const loadingCancel = ref(false);
let countdownTimer = null;
let reviewTimer = null;
let initialized = false;
let completed = false;

const methods = [
  { value: "wechat", title: "微信支付", desc: "展示微信样式模拟二维码，不接入真实微信支付" },
  { value: "alipay", title: "支付宝", desc: "展示支付宝样式模拟二维码，不接入真实支付宝" },
  { value: "mock", title: "模拟支付", desc: "用于测试的纯模拟收款码" }
];

const order = computed(() => orderStore.getOrderById(route.params.orderId));
const selectedMethod = computed(() => methods.find((item) => item.value === method.value) || methods[0]);
const countdown = computed(() => `${String(Math.floor(remain.value / 60)).padStart(2, "0")}:${String(remain.value % 60).padStart(2, "0")}`);
const paymentStatus = computed(() => payment.value?.status || order.value?.payment?.status || "");
const isExpired = computed(() => paymentStatus.value === "expired" || (paymentStatus.value === "unpaid" && remain.value <= 0));
const isPaid = computed(() => order.value?.paymentStatus === "success" || paymentStatus.value === "confirmed");
const isReviewPending = computed(() => order.value?.paymentStatus === "pending_review" || paymentStatus.value === "submitted");
const isCancelled = computed(() => order.value?.orderStatus === "cancelled");
const canSubmit = computed(() => payment.value && paymentStatus.value === "unpaid" && !isExpired.value && !loadingSubmit.value && !loadingCreate.value && !loadingCancel.value);
const canCancel = computed(() => order.value && payment.value && !isPaid.value && !isCancelled.value && !loadingCancel.value);
const qrSrc = computed(() => payment.value?.qrUrl || "");
const amount = computed(() => Number(payment.value?.amount ?? order.value?.payAmount ?? 0));

const statusText = computed(() => {
  if (isPaid.value) return "后台已确认收款，订单已支付。";
  if (isCancelled.value) return "订单已取消。";
  if (isReviewPending.value) return "已提交支付凭证，正在等待后台管理员确认收款。";
  if (isExpired.value) return "支付二维码已超时，请重新发起模拟支付。";
  if (paymentStatus.value === "failed") return "支付已被驳回或取消，可重新发起支付。";
  if (payment.value) return "请扫码完成模拟支付，随后点击“我已支付”。";
  return "正在准备支付二维码。";
});

onMounted(async () => {
  await userStore.fetchMember().catch(() => null);
  await orderStore.fetchOrders().catch(() => null);
  await refreshPayment();
  if (!payment.value && order.value && !isPaid.value && !isCancelled.value) await createPayment();
  if (isReviewPending.value) startReviewPolling();
  initialized = true;
});

onBeforeUnmount(() => {
  stopCountdown();
  stopReviewPolling();
});

watch(method, async () => {
  if (!initialized || !order.value || isReviewPending.value || isPaid.value || isCancelled.value) return;
  await createPayment();
});

async function refreshPayment() {
  if (!order.value) return null;
  const latest = await orderStore.refreshPaymentStatus(order.value.id).catch((err) => {
    error.value = err.message;
    return null;
  });
  if (!latest) return null;
  payment.value = latest.payment || null;
  if (payment.value?.method) method.value = payment.value.method;
  if (payment.value?.expiredAt) startCountdown(payment.value.expiredAt);
  if (latest.paymentStatus === "success") await completePayment(latest);
  return latest;
}

async function createPayment() {
  if (!order.value) return;
  loadingCreate.value = true;
  error.value = "";
  message.value = "";
  try {
    const result = await orderStore.createPayment(order.value.id, method.value);
    payment.value = result.payment;
    method.value = payment.value.method;
    startCountdown(payment.value.expiredAt);
  } catch (err) {
    error.value = err.message;
  } finally {
    loadingCreate.value = false;
  }
}

async function submitPaid() {
  if (!order.value || !payment.value) return;
  if (isExpired.value) {
    error.value = "支付已超时，请重新发起模拟支付。";
    return;
  }
  loadingSubmit.value = true;
  error.value = "";
  message.value = "";
  orderStore.setProcessing(order.value.id, method.value);
  try {
    const updated = await orderStore.submitPayment(order.value.id, payment.value.paymentId);
    payment.value = updated.payment;
    message.value = "已提交支付，等待后台管理员确认收款。";
    startReviewPolling();
  } catch (err) {
    error.value = err.message;
  } finally {
    loadingSubmit.value = false;
  }
}

async function cancelOrder() {
  if (!order.value || !payment.value) return;
  loadingCancel.value = true;
  error.value = "";
  message.value = "";
  try {
    const updated = await orderStore.cancelPayment(order.value.id, payment.value.paymentId);
    payment.value = updated.payment;
    stopReviewPolling();
    stopCountdown();
    message.value = "订单已取消。";
  } catch (err) {
    error.value = err.message;
  } finally {
    loadingCancel.value = false;
  }
}

async function completePayment(paidOrder) {
  if (completed) return;
  completed = true;
  stopReviewPolling();
  stopCountdown();
  cartStore.clearPaidItems(paidOrder.items);
  await userStore.fetchMember().catch(() => null);
  router.push(`/orders/${paidOrder.id}`);
}

function startReviewPolling() {
  stopReviewPolling();
  reviewTimer = setInterval(refreshPayment, 2500);
}

function stopReviewPolling() {
  if (reviewTimer) clearInterval(reviewTimer);
  reviewTimer = null;
}

function startCountdown(expiredAt) {
  stopCountdown();
  const endAt = new Date(String(expiredAt).replace(" ", "T")).getTime();
  const tick = () => {
    remain.value = Math.max(0, Math.floor((endAt - Date.now()) / 1000));
    if (remain.value <= 0) {
      stopCountdown();
      if (payment.value?.status === "unpaid") error.value = "支付已超时，请重新发起模拟支付。";
    }
  };
  tick();
  countdownTimer = setInterval(tick, 1000);
}

function stopCountdown() {
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = null;
}
</script>

<template>
  <section class="section payment-section premium-payment">
    <div class="section-head">
      <div>
        <h2>模拟扫码支付</h2>
        <p class="lead">选择支付方式后生成模拟二维码，提交后由后台管理员确认收款。</p>
      </div>
    </div>

    <div v-if="order" class="payment-layout">
      <form class="card payment-card glass-payment-card" @submit.prevent="submitPaid">
        <div class="flow-steps"><span class="active">购物车</span><span class="active">确认订单</span><span class="active">扫码支付</span><span :class="{ active: isPaid }">确认收款</span></div>
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
            <input v-model="method" type="radio" :value="item.value" :disabled="isReviewPending || isPaid || loadingCreate" />
            <span><strong>{{ item.title }}</strong><em>{{ item.desc }}</em></span>
          </label>
        </div>

        <div class="simulated-qr" :data-method="method">
          <div class="payment-qr-shell">
            <img v-if="qrSrc" class="payment-qr-image" :src="qrSrc" :alt="`${selectedMethod.title}模拟二维码`" />
            <span v-else class="muted">{{ loadingCreate ? "正在生成二维码..." : "暂无二维码" }}</span>
          </div>
          <div>
            <h3>{{ selectedMethod.title }}</h3>
            <p class="muted">{{ statusText }}</p>
            <strong>￥{{ amount.toFixed(2) }}</strong>
            <p class="muted">支付记录：{{ payment?.paymentId ? `#${payment.paymentId}` : "-" }}</p>
          </div>
        </div>

        <p v-if="message" class="payment-processing">{{ message }}</p>
        <p v-if="error" class="form-error">{{ error }}</p>

        <button class="btn checkout-main-btn" type="submit" :disabled="!canSubmit">
          {{ loadingSubmit ? "正在提交..." : isReviewPending ? "等待后台确认收款" : isPaid ? "订单已支付" : isExpired ? "支付已超时" : `我已支付 ￥${amount.toFixed(2)}` }}
        </button>
        <div class="actions payment-actions">
          <button v-if="isExpired && !isCancelled && !isPaid" class="btn ghost" type="button" :disabled="loadingCreate" @click="createPayment">
            {{ loadingCreate ? "正在重新生成..." : "重新发起支付" }}
          </button>
          <button class="btn ghost" type="button" :disabled="!canCancel" @click="cancelOrder">
            {{ loadingCancel ? "正在取消..." : "取消订单" }}
          </button>
          <RouterLink class="link-button auth-switch" :to="`/orders/${order.id}`">查看订单详情</RouterLink>
        </div>
      </form>

      <aside class="card payment-summary checkout-summary-card">
        <p class="eyebrow">Receipt</p>
        <h3>订单摘要</h3>
        <div class="price-line"><span>订单号</span><strong>{{ order.id }}</strong></div>
        <div class="price-line"><span>支付方式</span><strong>{{ paymentMethodText[method] }}</strong></div>
        <div class="price-line"><span>支付状态</span><strong>{{ statusText }}</strong></div>
        <div v-for="item in order.items" :key="item.productId" class="cart-row">
          <strong>{{ item.name }}</strong>
          <span>￥{{ Number(item.price).toFixed(2) }} x {{ item.quantity }}</span>
        </div>
        <div class="price-line"><span>优惠</span><strong class="discount">-￥{{ Number(order.discountAmount || 0).toFixed(2) }}</strong></div>
        <div class="price-line total"><span>实付金额</span><strong>￥{{ amount.toFixed(2) }}</strong></div>
        <p class="muted">过期时间：{{ formatTime(payment?.expiredAt) }}</p>
      </aside>
    </div>

    <div v-else class="card empty">
      <p class="muted">没有找到待支付订单。</p>
      <RouterLink class="btn" to="/orders">返回我的订单</RouterLink>
    </div>
  </section>
</template>
