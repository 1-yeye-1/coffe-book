<script setup>
import { computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { formatTime, orderStatusText, paymentMethodText, paymentStatusText, useOrderStore } from "@/stores/order";
import { useUserStore } from "@/stores/user";

const route = useRoute();
const router = useRouter();
const orderStore = useOrderStore();
const userStore = useUserStore();
const order = computed(() => orderStore.getOrderById(route.params.orderId));

onMounted(async () => {
  const member = await userStore.fetchMember().catch(() => null);
  orderStore.mergeRemoteOrders(member?.orders || []);
});

function pay() {
  if (order.value) router.push(`/payment/${order.value.id}`);
}

function cancel() {
  if (order.value) orderStore.cancelOrder(order.value.id);
}

function finish() {
  if (order.value) orderStore.finishOrder(order.value.id);
}
</script>

<template>
  <section class="section checkout-page">
    <div class="section-head">
      <div>
        <h2>订单详情</h2>
        <p class="lead">完整展示订单状态、支付状态、商品、价格明细、联系人和时间信息。</p>
      </div>
      <RouterLink class="btn ghost" to="/orders">返回我的订单</RouterLink>
    </div>

    <div v-if="order" class="checkout-layout order-detail-layout">
      <div class="checkout-left">
        <div class="card order-flow-card">
          <div class="post-meta"><strong>{{ order.id }}</strong><span class="status">{{ orderStatusText[order.orderStatus] }}</span></div>
          <div class="order-status-grid">
            <div><span>订单状态</span><strong>{{ orderStatusText[order.orderStatus] }}</strong></div>
            <div><span>支付状态</span><strong>{{ paymentStatusText[order.paymentStatus] }}</strong></div>
            <div><span>创建时间</span><strong>{{ formatTime(order.createdAt) }}</strong></div>
            <div><span>支付时间</span><strong>{{ formatTime(order.paidAt) }}</strong></div>
          </div>
        </div>

        <div class="card order-flow-card">
          <h3>商品列表</h3>
          <div v-for="item in order.items" :key="item.productId" class="checkout-item">
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
          <h3>联系人信息</h3>
          <p>联系人：{{ order.contactName || order.userName || "-" }}</p>
          <p>手机号：{{ order.phone || "-" }}</p>
          <p>配送方式：{{ order.deliveryType === "delivery" ? "门店配送" : "到店自取" }}</p>
          <p class="muted">备注：{{ order.remark || "无" }}</p>
        </div>
      </div>

      <aside class="card checkout-summary-card">
        <p class="eyebrow">Order Detail</p>
        <h3>价格明细</h3>
        <div class="price-line"><span>商品金额</span><strong>￥{{ Number(order.totalAmount).toFixed(2) }}</strong></div>
        <div class="price-line"><span>配送费</span><strong>￥{{ Number(order.deliveryFee || 0).toFixed(2) }}</strong></div>
        <div class="price-line"><span>优惠金额</span><strong class="discount">-￥{{ Number(order.discountAmount || 0).toFixed(2) }}</strong></div>
        <div class="price-line"><span>积分抵扣</span><strong class="discount">-￥{{ Number(order.pointsDeduction || 0).toFixed(2) }}</strong></div>
        <div class="price-line total"><span>实付金额</span><strong>￥{{ Number(order.payAmount).toFixed(2) }}</strong></div>
        <div class="price-line"><span>支付方式</span><strong>{{ paymentMethodText[order.paymentMethod] || "-" }}</strong></div>
        <div class="actions">
          <button v-if="!['success', 'pending_review'].includes(order.paymentStatus) && order.orderStatus !== 'cancelled'" class="btn" type="button" @click="pay">去支付</button>
          <button v-if="!['success', 'pending_review'].includes(order.paymentStatus) && order.orderStatus !== 'cancelled'" class="btn ghost" type="button" @click="cancel">取消订单</button>
          <button v-if="order.paymentStatus === 'success' && order.orderStatus !== 'finished'" class="btn" type="button" @click="finish">确认完成</button>
        </div>
      </aside>
    </div>

    <div v-else class="card empty">
      <p class="muted">没有找到该订单。</p>
      <RouterLink class="btn" to="/orders">返回我的订单</RouterLink>
    </div>
  </section>
</template>
