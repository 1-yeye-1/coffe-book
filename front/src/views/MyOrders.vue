<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import AdminDrawer from "@/components/admin/AdminDrawer.vue";
import BaseModal from "@/components/BaseModal.vue";
import DataState from "@/components/DataState.vue";
import BaseToast from "@/components/front/BaseToast.vue";
import StatusBadge from "@/components/front/StatusBadge.vue";
import { formatTime, paymentMethodText, paymentStatusText, useOrderStore } from "@/stores/order";
import { useUserStore } from "@/stores/user";

const router = useRouter();
const orderStore = useOrderStore();
const userStore = useUserStore();

const active = ref("all");
const timeFilter = ref("all");
const loading = ref(false);
const error = ref("");
const drawerOrder = ref(null);
const cancelTarget = ref(null);
const toastMessage = ref("");
const toastType = ref("success");

const statusTabs = [
  ["all", "全部"],
  ["pending", "待支付"],
  ["reviewing", "审核中"],
  ["paid", "已支付"],
  ["ready", "待取货"],
  ["finished", "已完成"],
  ["cancelled", "已取消"]
];

const timeOptions = [
  ["all", "全部时间"],
  ["7", "近 7 天"],
  ["30", "近 30 天"],
  ["90", "近 90 天"]
];

const orderText = {
  pending: "待支付",
  reviewing: "付款审核中",
  paid: "已支付",
  ready: "待取货",
  finished: "已完成",
  cancelled: "已取消"
};

const orders = computed(() => orderStore.sortedOrders);
const filteredOrders = computed(() => orders.value.filter((order) => matchStatus(order) && matchTime(order)));
const orderStats = computed(() => [
  { label: "全部订单", value: orders.value.length, type: "accent" },
  { label: "待处理", value: orders.value.filter((order) => ["pending", "reviewing"].includes(order.orderStatus)).length, type: "warning" },
  { label: "已支付", value: orders.value.filter((order) => ["paid", "ready"].includes(order.orderStatus)).length, type: "success" },
  { label: "累计消费", value: `¥${orders.value.reduce((sum, order) => sum + Number(order.payAmount || 0), 0).toFixed(2)}`, type: "default" }
]);

onMounted(loadOrders);

async function loadOrders() {
  loading.value = true;
  error.value = "";
  try {
    await userStore.fetchMember();
    await orderStore.fetchOrders();
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

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

function matchStatus(order) {
  if (active.value === "all") return true;
  if (active.value === "paid") return ["paid", "ready"].includes(order.orderStatus);
  return order.orderStatus === active.value;
}

function matchTime(order) {
  if (timeFilter.value === "all") return true;
  const created = new Date(String(order.createdAt).replace(" ", "T")).getTime();
  if (Number.isNaN(created)) return true;
  const days = Number(timeFilter.value);
  return Date.now() - created <= days * 24 * 60 * 60 * 1000;
}

function itemCount(order) {
  return (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

function itemSummary(order) {
  return (order.items || []).map((item) => `${item.name} x ${item.quantity}`).join("；") || "咖啡书屋订单";
}

function imageFallback(event) {
  event.currentTarget.classList.add("image-placeholder-active");
  event.currentTarget.removeAttribute("src");
  event.currentTarget.alt = "";
}

function orderBadge(order) {
  const typeMap = {
    pending: "warning",
    reviewing: "warning",
    paid: "success",
    ready: "accent",
    finished: "success",
    cancelled: "danger"
  };
  return { label: orderText[order.orderStatus] || order.orderStatus || "待处理", type: typeMap[order.orderStatus] || "default" };
}

function paymentBadge(order) {
  const typeMap = {
    unpaid: "warning",
    processing: "warning",
    pending_review: "warning",
    success: "success",
    failed: "danger",
    expired: "danger",
    refunded: "default"
  };
  return { label: paymentStatusText[order.paymentStatus] || order.paymentStatus || "未支付", type: typeMap[order.paymentStatus] || "default" };
}

function deliveryBadge(order) {
  if (order.orderStatus === "finished") return { label: "已完成", type: "success" };
  if (order.orderStatus === "ready") return { label: "待自提", type: "accent" };
  if (order.paymentStatus === "success") return { label: order.deliveryType === "delivery" ? "待发货" : "备货中", type: "warning" };
  if (order.orderStatus === "cancelled") return { label: "已取消", type: "danger" };
  return { label: "未开始", type: "default" };
}

function timeline(order) {
  const paid = order.paymentStatus === "success";
  return [
    { label: "提交订单", time: formatTime(order.createdAt), done: true },
    { label: "完成支付", time: formatTime(order.paidAt || order.paymentSubmittedAt), done: paid || ["pending_review", "processing"].includes(order.paymentStatus) },
    { label: "门店确认", time: formatTime(order.paymentReviewedAt), done: paid },
    { label: order.deliveryType === "delivery" ? "安排配送" : "到店自提", time: order.orderStatus === "ready" ? "可取货" : "-", done: ["ready", "finished"].includes(order.orderStatus) },
    { label: "订单完成", time: order.orderStatus === "finished" ? "已完成" : "-", done: order.orderStatus === "finished" }
  ];
}

function pay(order) {
  router.push(`/pay/${order.id}`);
}

function view(order) {
  drawerOrder.value = order;
}

function askCancel(order) {
  cancelTarget.value = order;
}

async function cancel() {
  if (!cancelTarget.value) return;
  try {
    await orderStore.cancelOrder(cancelTarget.value.id);
    showToast("订单已取消");
  } catch (err) {
    showToast(err.message, "danger");
  } finally {
    cancelTarget.value = null;
  }
}

function finish(order) {
  orderStore.finishOrder(order.id);
  showToast("订单已确认完成");
}
</script>

<template>
  <section class="section order-page-pro">
    <BaseToast :visible="Boolean(toastMessage)" :message="toastMessage" :type="toastType" />

    <div class="member-hero-pro order-hero">
      <div>
        <p class="eyebrow">My Orders</p>
        <h2>我的订单</h2>
        <p class="lead">按状态和时间快速筛选订单，并在右侧抽屉查看支付、发货与时间轴。</p>
      </div>
      <RouterLink class="btn ghost" to="/shop">继续逛商城</RouterLink>
    </div>

    <div class="order-stat-grid">
      <article v-for="item in orderStats" :key="item.label" class="card order-stat-card">
        <StatusBadge :label="item.label" :type="item.type" />
        <strong>{{ item.value }}</strong>
      </article>
    </div>

    <article class="card order-filter-card">
      <div class="tabs order-tabs">
        <button v-for="[value, label] in statusTabs" :key="value" :class="{ active: active === value }" type="button" @click="active = value">
          {{ label }}
        </button>
      </div>
      <label class="field compact-field">
        <span>时间筛选</span>
        <select v-model="timeFilter">
          <option v-for="[value, label] in timeOptions" :key="value" :value="value">{{ label }}</option>
        </select>
      </label>
    </article>

    <DataState
      :loading="loading"
      :error="error"
      :empty="!filteredOrders.length"
      loading-title="订单同步中"
      empty-title="暂无符合条件的订单"
      description="切换筛选条件，或先去商城创建一笔订单。"
      @retry="loadOrders"
    >
      <template #action>
        <RouterLink class="btn" to="/shop">去文创商城</RouterLink>
      </template>

      <div class="order-card-list">
        <article v-for="order in filteredOrders" :key="order.id" class="card order-card-pro">
          <div class="order-card-head">
            <div>
              <p class="eyebrow">{{ order.id }}</p>
              <h3>{{ itemSummary(order) }}</h3>
            </div>
            <div class="status-row">
              <StatusBadge :label="orderBadge(order).label" :type="orderBadge(order).type" />
              <StatusBadge :label="paymentBadge(order).label" :type="paymentBadge(order).type" />
              <StatusBadge :label="deliveryBadge(order).label" :type="deliveryBadge(order).type" />
            </div>
          </div>

          <div class="order-card-body">
            <div class="order-thumb-stack">
              <div v-for="item in (order.items || []).slice(0, 3)" :key="`${order.id}-${item.productId || item.name}`" class="cart-thumb-pro small">
                <img v-if="item.image" :src="item.image" :alt="item.name" @error="imageFallback" />
                <span v-else>{{ item.name?.slice(0, 1) || "咖" }}</span>
              </div>
            </div>
            <div class="order-meta-grid">
              <p><span>下单时间</span><strong>{{ formatTime(order.createdAt) }}</strong></p>
              <p><span>商品数量</span><strong>{{ itemCount(order) }} 件</strong></p>
              <p><span>支付方式</span><strong>{{ paymentMethodText[order.paymentMethod] || order.paymentMethod || "待选择" }}</strong></p>
              <p><span>实付金额</span><strong>¥{{ Number(order.payAmount).toFixed(2) }}</strong></p>
            </div>
          </div>

          <div class="order-timeline-inline">
            <div v-for="node in timeline(order)" :key="node.label" :class="{ done: node.done }">
              <span></span>
              <strong>{{ node.label }}</strong>
            </div>
          </div>

          <div class="actions">
            <button v-if="!['success', 'pending_review'].includes(order.paymentStatus) && order.orderStatus !== 'cancelled'" class="btn" type="button" @click="pay(order)">去支付</button>
            <button class="btn ghost" type="button" @click="view(order)">订单详情</button>
            <button v-if="!['success', 'pending_review'].includes(order.paymentStatus) && order.orderStatus !== 'cancelled'" class="btn ghost danger-text" type="button" @click="askCancel(order)">取消订单</button>
            <button v-if="order.paymentStatus === 'success' && order.orderStatus !== 'finished'" class="btn" type="button" @click="finish(order)">确认完成</button>
          </div>
        </article>
      </div>
    </DataState>

    <AdminDrawer :open="Boolean(drawerOrder)" :title="`订单详情 ${drawerOrder?.id || ''}`" @close="drawerOrder = null">
      <div v-if="drawerOrder" class="order-drawer-body">
        <div class="order-drawer-total">
          <span>实付金额</span>
          <strong>¥{{ Number(drawerOrder.payAmount || 0).toFixed(2) }}</strong>
        </div>
        <div class="status-row">
          <StatusBadge :label="orderBadge(drawerOrder).label" :type="orderBadge(drawerOrder).type" />
          <StatusBadge :label="paymentBadge(drawerOrder).label" :type="paymentBadge(drawerOrder).type" />
          <StatusBadge :label="deliveryBadge(drawerOrder).label" :type="deliveryBadge(drawerOrder).type" />
        </div>
        <div class="drawer-section">
          <h4>订单商品</h4>
          <div v-for="item in drawerOrder.items" :key="`${drawerOrder.id}-drawer-${item.productId || item.name}`" class="drawer-item-row">
            <span>{{ item.name }}</span>
            <strong>x {{ item.quantity }}</strong>
          </div>
        </div>
        <div class="drawer-section">
          <h4>订单时间轴</h4>
          <div class="order-drawer-timeline">
            <div v-for="node in timeline(drawerOrder)" :key="node.label" :class="{ done: node.done }">
              <span></span>
              <div>
                <strong>{{ node.label }}</strong>
                <small>{{ node.time }}</small>
              </div>
            </div>
          </div>
        </div>
        <div class="drawer-section">
          <h4>收货/自提信息</h4>
          <p class="muted">{{ drawerOrder.contactName || "未填写联系人" }} · {{ drawerOrder.phone || "未填写手机号" }}</p>
          <p class="muted">{{ drawerOrder.deliveryType === "delivery" ? "配送到家" : "到店自提" }}</p>
          <p v-if="drawerOrder.remark" class="muted">备注：{{ drawerOrder.remark }}</p>
        </div>
      </div>
    </AdminDrawer>

    <BaseModal
      :open="Boolean(cancelTarget)"
      title="确认取消订单"
      :description="cancelTarget ? `取消后订单 ${cancelTarget.id} 将无法继续支付，是否确认？` : ''"
      @close="cancelTarget = null"
    >
      <div class="admin-modal-actions">
        <button class="btn ghost" type="button" @click="cancelTarget = null">先保留</button>
        <button class="btn danger" type="button" @click="cancel">确认取消</button>
      </div>
    </BaseModal>
  </section>
</template>
