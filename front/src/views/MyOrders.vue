<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { formatTime, orderStatusText, paymentStatusText, useOrderStore } from "@/stores/order";
import { useUserStore } from "@/stores/user";

const router = useRouter();
const orderStore = useOrderStore();
const userStore = useUserStore();
const active = ref("all");
const tabs = [
  ["all", "全部"],
  ["pending", "待支付"],
  ["reviewing", "付款审核中"],
  ["paid", "已支付"],
  ["finished", "已完成"],
  ["cancelled", "已取消"]
];

const orders = computed(() => orderStore.sortedOrders);
const filteredOrders = computed(() => {
  if (active.value === "all") return orders.value;
  if (active.value === "paid") return orders.value.filter((order) => ["paid", "ready"].includes(order.orderStatus));
  return orders.value.filter((order) => order.orderStatus === active.value);
});

onMounted(async () => {
  const member = await userStore.fetchMember().catch(() => null);
  orderStore.mergeRemoteOrders(member?.orders || []);
});

function pay(order) {
  router.push(`/payment/${order.id}`);
}

function view(order) {
  router.push(`/orders/${order.id}`);
}

function cancel(order) {
  orderStore.cancelOrder(order.id);
}

function finish(order) {
  orderStore.finishOrder(order.id);
}
</script>

<template>
  <section class="section">
    <div class="section-head">
      <div>
        <h2>我的订单</h2>
        <p class="lead">支持状态筛选、继续支付、查看详情、取消订单和确认完成。</p>
      </div>
      <RouterLink class="btn ghost" to="/shop">继续逛商城</RouterLink>
    </div>

    <div class="tabs order-tabs">
      <button v-for="[value, label] in tabs" :key="value" :class="{ active: active === value }" type="button" @click="active = value">{{ label }}</button>
    </div>

    <div v-if="filteredOrders.length" class="feed order-list">
      <article v-for="order in filteredOrders" :key="order.id" class="card order-card rich-order-card">
        <div class="post-meta"><strong>{{ order.id }}</strong><span>{{ orderStatusText[order.orderStatus] }}</span></div>
        <div class="order-list-body">
          <div class="cart-thumb order-thumb">
            <img v-if="order.items?.[0]?.image" :src="order.items[0].image" :alt="order.items[0].name" />
            <span v-else>{{ order.items?.[0]?.name?.slice(0, 1) || "咖" }}</span>
          </div>
          <div>
            <p>{{ order.items.map((item) => `${item.name} × ${item.quantity}`).join("，") }}</p>
            <p class="muted">共 {{ order.items.reduce((sum, item) => sum + Number(item.quantity || 0), 0) }} 件 · {{ formatTime(order.createdAt) }}</p>
          </div>
          <div class="order-money">
            <strong>￥{{ Number(order.payAmount).toFixed(2) }}</strong>
            <span>{{ paymentStatusText[order.paymentStatus] }}</span>
          </div>
        </div>
        <div class="actions">
          <button v-if="!['success', 'pending_review'].includes(order.paymentStatus) && order.orderStatus !== 'cancelled'" class="btn" type="button" @click="pay(order)">去支付</button>
          <button class="btn ghost" type="button" @click="view(order)">查看详情</button>
          <button v-if="!['success', 'pending_review'].includes(order.paymentStatus) && order.orderStatus !== 'cancelled'" class="btn ghost" type="button" @click="cancel(order)">取消订单</button>
          <button v-if="order.paymentStatus === 'success' && order.orderStatus !== 'finished'" class="btn" type="button" @click="finish(order)">确认完成</button>
        </div>
      </article>
    </div>

    <div v-else class="card empty">
      <p class="muted">暂无符合条件的订单。</p>
      <RouterLink class="btn" to="/shop">去文创商城</RouterLink>
    </div>
  </section>
</template>
