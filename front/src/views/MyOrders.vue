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
const query = ref("");
const loading = ref(false);
const error = ref("");
const drawerOrder = ref(null);
const cancelTarget = ref(null);
const toastMessage = ref("");
const toastType = ref("success");
const expandedIds = ref([]);

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

const demoOrders = [
  {
    id: "DEMO-20260607-01",
    orderStatus: "ready",
    paymentStatus: "success",
    paymentMethod: "wechat",
    deliveryType: "pickup",
    payAmount: 117,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    paidAt: new Date(Date.now() - 86400000 * 2 + 1000 * 60 * 8).toISOString(),
    paymentSubmittedAt: new Date(Date.now() - 86400000 * 2 + 1000 * 60 * 6).toISOString(),
    paymentReviewedAt: new Date(Date.now() - 86400000 * 2 + 1000 * 60 * 16).toISOString(),
    contactName: "城市读者",
    phone: "13800000000",
    items: [
      { productId: "demo-latte", name: "拿铁咖啡券", quantity: 1, price: 32 },
      { productId: "demo-tote", name: "咖啡书屋帆布袋", quantity: 1, price: 85 }
    ]
  },
  {
    id: "DEMO-20260607-02",
    orderStatus: "finished",
    paymentStatus: "success",
    paymentMethod: "alipay",
    deliveryType: "delivery",
    payAmount: 69,
    createdAt: new Date(Date.now() - 86400000 * 8).toISOString(),
    paidAt: new Date(Date.now() - 86400000 * 8 + 1000 * 60 * 10).toISOString(),
    paymentSubmittedAt: new Date(Date.now() - 86400000 * 8 + 1000 * 60 * 8).toISOString(),
    paymentReviewedAt: new Date(Date.now() - 86400000 * 8 + 1000 * 60 * 20).toISOString(),
    contactName: "城市读者",
    phone: "13800000000",
    items: [
      { productId: "demo-bookmark", name: "限定金属书签", quantity: 1, price: 69 }
    ]
  }
];

const orders = computed(() => orderStore.sortedOrders.length ? orderStore.sortedOrders : demoOrders);
const filteredOrders = computed(() => orders.value.filter((order) => matchStatus(order) && matchTime(order) && matchQuery(order)));
const orderStats = computed(() => [
  { label: "全部订单", value: orders.value.length, type: "accent" },
  { label: "待处理", value: orders.value.filter((order) => ["pending", "reviewing"].includes(order.orderStatus)).length, type: "warning" },
  { label: "已支付", value: orders.value.filter((order) => ["paid", "ready"].includes(order.orderStatus)).length, type: "success" },
  { label: "累计消费", value: `¥${orders.value.reduce((sum, order) => sum + Number(order.payAmount || 0), 0).toFixed(2)}`, type: "default" }
]);
const toolLinks = [
  { title: "发票管理", desc: "查看/申请发票", icon: "▣" },
  { title: "收货地址", desc: "管理收货地址", icon: "⌖" },
  { title: "常购清单", desc: "查看常购商品", icon: "▤" },
  { title: "售后服务", desc: "申请售后/退款", icon: "◎" }
];
const recommendItems = computed(() => {
  const map = new Map();
  orders.value.forEach((order) => {
    (order.items || []).forEach((item) => {
      const key = item.productId || item.name;
      if (!map.has(key)) map.set(key, item);
    });
  });
  return [...map.values()].slice(0, 5);
});

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

function matchQuery(order) {
  const keyword = query.value.trim().toLowerCase();
  if (!keyword) return true;
  return [order.id, order.contactName, order.phone, itemSummary(order)]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(keyword);
}

function itemCount(order) {
  return (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
}

function itemSummary(order) {
  return (order.items || []).map((item) => `${item.name} x ${item.quantity}`).join("；") || "咖啡书屋订单";
}

function imageFallback(event) {
  event.currentTarget.classList.add("image-placeholder-active");
  event.currentTarget.src = orderPlaceholder();
}

function orderPlaceholder() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="520" viewBox="0 0 640 520">
    <defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#fff4e6"/><stop offset=".58" stop-color="#d69a57"/><stop offset="1" stop-color="#8b5e3c"/></linearGradient></defs>
    <rect width="640" height="520" fill="url(#g)"/>
    <circle cx="510" cy="92" r="96" fill="#fffdf8" opacity=".25"/>
    <rect x="96" y="148" width="320" height="190" rx="34" fill="#fffdf8" opacity=".55"/>
    <text x="96" y="420" fill="#4a2c17" font-family="Arial, sans-serif" font-size="34" font-weight="900">Coffee Book</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
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
  if (String(order.id || "").startsWith("DEMO-")) {
    showToast("演示订单仅用于前端展示，不会进入支付流程");
    return;
  }
  router.push(`/pay/${order.id}`);
}

function view(order) {
  drawerOrder.value = order;
}

function isExpanded(order) {
  return expandedIds.value.includes(String(order.id));
}

function toggleExpand(order) {
  const id = String(order.id);
  expandedIds.value = isExpanded(order)
    ? expandedIds.value.filter((item) => item !== id)
    : [...expandedIds.value, id];
}

function askCancel(order) {
  cancelTarget.value = order;
}

async function cancel() {
  if (!cancelTarget.value) return;
  if (String(cancelTarget.value.id || "").startsWith("DEMO-")) {
    showToast("演示订单仅用于前端展示，不会写入后端");
    cancelTarget.value = null;
    return;
  }
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
  if (String(order.id || "").startsWith("DEMO-")) {
    showToast("演示订单仅用于前端展示，不会写入后端");
    return;
  }
  orderStore.finishOrder(order.id);
  showToast("订单已确认完成");
}
</script>

<template>
  <section class="section order-page-pro" data-testid="orders-page">
    <BaseToast :visible="Boolean(toastMessage)" :message="toastMessage" :type="toastType" />

    <div class="orders-hero-final">
      <div class="orders-hero-copy">
        <p class="eyebrow">My Orders</p>
        <h1>我的订单</h1>
        <p>查看和管理您的订单，跟踪支付、备货、配送与售后进度。</p>
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
      <label class="field compact-field order-search-field">
        <span>订单搜索</span>
        <input v-model.trim="query" type="search" placeholder="搜索订单号或商品名" />
      </label>
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

      <div class="orders-layout-final">
        <main class="order-card-list">
          <article v-for="order in filteredOrders" :key="order.id" class="card order-card-pro">
            <div class="order-card-head">
              <div>
                <p class="eyebrow">订单号：{{ order.id }}</p>
                <h3>{{ itemSummary(order) }}</h3>
                <small>下单时间：{{ formatTime(order.createdAt) }}</small>
              </div>
              <div class="order-card-amount">
                <StatusBadge :label="orderBadge(order).label" :type="orderBadge(order).type" />
                <strong>¥{{ Number(order.payAmount).toFixed(2) }}</strong>
              </div>
            </div>

            <div class="status-row order-status-row">
              <StatusBadge :label="paymentBadge(order).label" :type="paymentBadge(order).type" />
              <StatusBadge :label="deliveryBadge(order).label" :type="deliveryBadge(order).type" />
              <span>{{ paymentMethodText[order.paymentMethod] || order.paymentMethod || "待选择支付方式" }}</span>
            </div>

            <div class="order-card-body">
              <div class="order-thumb-stack">
                <div v-for="item in (order.items || []).slice(0, 4)" :key="`${order.id}-${item.productId || item.name}`" class="cart-thumb-pro small">
                  <img v-if="item.image" :src="item.image" :alt="item.name" @error="imageFallback" />
                  <span v-else>{{ item.name?.slice(0, 1) || "咖" }}</span>
                </div>
              </div>
              <div class="order-meta-grid">
                <p><span>商品数量</span><strong>{{ itemCount(order) }} 件</strong></p>
                <p><span>配送方式</span><strong>{{ order.deliveryType === "delivery" ? "配送到家" : "到店自提" }}</strong></p>
                <p><span>联系人</span><strong>{{ order.contactName || "未填写" }}</strong></p>
                <p><span>手机号</span><strong>{{ order.phone || "未填写" }}</strong></p>
              </div>
            </div>

            <div class="order-timeline-inline">
              <div v-for="node in timeline(order)" :key="node.label" :class="{ done: node.done }">
                <span></span>
                <strong>{{ node.label }}</strong>
              </div>
            </div>

            <div v-if="isExpanded(order)" class="order-expanded-items" data-testid="order-expanded">
              <div v-for="item in order.items" :key="`${order.id}-expanded-${item.productId || item.name}`" class="order-expanded-row">
                <div class="cart-thumb-pro small">
                  <img v-if="item.image" :src="item.image" :alt="item.name" @error="imageFallback" />
                  <span v-else>{{ item.name?.slice(0, 1) || "咖" }}</span>
                </div>
                <div>
                  <strong>{{ item.name }}</strong>
                  <small>单价 ¥{{ Number(item.price || 0).toFixed(2) }}</small>
                </div>
                <span>x {{ item.quantity }}</span>
              </div>
            </div>

            <div class="status-row">
              <button class="btn ghost" type="button" @click="toggleExpand(order)">
                {{ isExpanded(order) ? "收起商品" : "展开商品" }}
              </button>
              <button v-if="!['success', 'pending_review'].includes(order.paymentStatus) && order.orderStatus !== 'cancelled'" class="btn" type="button" @click="pay(order)">去支付</button>
              <button class="btn ghost" type="button" @click="view(order)">订单详情</button>
              <button v-if="!['success', 'pending_review'].includes(order.paymentStatus) && order.orderStatus !== 'cancelled'" class="btn ghost danger-text" type="button" @click="askCancel(order)">取消订单</button>
              <button v-if="order.paymentStatus === 'success' && order.orderStatus !== 'finished'" class="btn" type="button" @click="finish(order)">确认收货</button>
            </div>
          </article>
        </main>

        <aside class="orders-sidebar-final">
          <article class="card order-tools-card">
            <h3>订单工具</h3>
            <button v-for="item in toolLinks" :key="item.title" type="button">
              <span>{{ item.icon }}</span>
              <b>{{ item.title }}</b>
              <small>{{ item.desc }}</small>
            </button>
          </article>
          <article v-if="recommendItems.length" class="card order-recommend-card">
            <h3>为你推荐</h3>
            <div v-for="item in recommendItems" :key="item.productId || item.name" class="order-mini-product">
              <div class="cart-thumb-pro small">
                <img v-if="item.image" :src="item.image" :alt="item.name" @error="imageFallback" />
                <span v-else>{{ item.name?.slice(0, 1) || "咖" }}</span>
              </div>
              <span>
                <b>{{ item.name }}</b>
                <small>¥{{ Number(item.price || 0).toFixed(2) }}</small>
              </span>
              <button type="button" @click="showToast('已为你保留推荐商品入口')">+</button>
            </div>
          </article>
          <article class="card order-help-card">
            <h3>需要帮助?</h3>
            <p>联系客服，快速解决您的订单问题。</p>
            <div>
              <button type="button">在线客服</button>
              <button type="button">电话客服</button>
              <button type="button">帮助中心</button>
            </div>
          </article>
        </aside>
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
