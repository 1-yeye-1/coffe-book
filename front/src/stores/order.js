import { defineStore } from "pinia";
import { request } from "@/api";

const ORDER_KEY = "coffee_simulated_orders";

function parseOrders() {
  try {
    return JSON.parse(localStorage.getItem(ORDER_KEY) || "[]");
  } catch {
    return [];
  }
}

function pad(value) {
  return String(value).padStart(2, "0");
}

export function formatTime(value) {
  if (!value) return "-";
  const date = new Date(String(value).replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 19).replace("T", " ");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

export function makeOrderNo(backendId, createdAt = new Date().toISOString()) {
  const date = new Date(createdAt);
  const ymd = Number.isNaN(date.getTime())
    ? "20260601"
    : `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}`;
  return `ORDER${ymd}${String(backendId || Date.now()).padStart(4, "0")}`;
}

export const orderStatusText = {
  pending: "待支付",
  reviewing: "待确认收款",
  paid: "已支付",
  ready: "待取货",
  finished: "已完成",
  cancelled: "已取消"
};

export const paymentStatusText = {
  unpaid: "未支付",
  processing: "支付处理中",
  pending_review: "待确认收款",
  success: "已支付",
  failed: "支付失败",
  expired: "支付超时",
  refunded: "已退款"
};

export const paymentMethodText = {
  wechat: "微信支付",
  alipay: "支付宝",
  mock: "模拟支付",
  balance: "会员余额",
  store: "到店支付"
};

function backendOrderStatus(status) {
  const value = String(status || "");
  const map = {
    pending_payment: "pending",
    payment_review: "reviewing",
    paid: "paid",
    completed: "finished",
    cancelled: "cancelled",
    待支付: "pending",
    支付审核中: "reviewing",
    已支付: "paid",
    已完成: "finished",
    已取消: "cancelled"
  };
  return map[value] || "";
}

function normalizeStatus(order = {}, local = {}, reviewStatus = "not_submitted", payment = null) {
  if (payment?.status === "submitted" || reviewStatus === "pending") return "reviewing";
  if (payment?.status === "confirmed") return (order.deliveryType || local.deliveryType) === "pickup" ? "ready" : "paid";
  const backendStatus = backendOrderStatus(order.status);
  if (backendStatus) return backendStatus === "paid" && (order.deliveryType || local.deliveryType) === "pickup" ? "ready" : backendStatus;
  if (local.orderStatus === "cancelled" || local.orderStatus === "finished" || local.orderStatus === "ready") return local.orderStatus;
  if (order.paidAt) return (order.deliveryType || local.deliveryType) === "pickup" ? "ready" : "paid";
  return local.orderStatus || "pending";
}

function normalizePaymentStatus(orderStatus, payment = null, reviewStatus = "not_submitted", local = {}) {
  if (payment?.status === "confirmed") return "success";
  if (payment?.status === "submitted" || reviewStatus === "pending") return "pending_review";
  if (payment?.status === "expired") return "expired";
  if (payment?.status === "failed" || reviewStatus === "rejected") return "failed";
  if (orderStatus === "paid" || orderStatus === "ready" || orderStatus === "finished") return "success";
  return local.paymentStatus || "unpaid";
}

function paymentFromResponse(response) {
  return response?.payment || response || null;
}

export const useOrderStore = defineStore("order", {
  state: () => ({
    orders: parseOrders(),
    currentOrder: null
  }),

  getters: {
    sortedOrders: (state) => [...state.orders].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))
  },

  actions: {
    loadOrders() {
      this.orders = parseOrders();
      return this.orders;
    },

    saveOrders() {
      localStorage.setItem(ORDER_KEY, JSON.stringify(this.orders));
    },

    normalizeOrder(order = {}) {
      const payment = paymentFromResponse(order.payment);
      const sourceOrder = order.order || order;
      const backendId = Number(sourceOrder.backendId ?? (Number.isFinite(Number(sourceOrder.id)) ? Number(sourceOrder.id) : 0));
      const local = this.orders.find((item) => item.id === sourceOrder.id || item.backendId === backendId) || {};
      const createdAt = sourceOrder.createdAt || local.createdAt || new Date().toISOString();
      const paymentReviewStatus = sourceOrder.paymentReviewStatus ?? local.paymentReviewStatus ?? "not_submitted";
      const orderStatus = normalizeStatus(sourceOrder, local, paymentReviewStatus, payment);
      const paymentStatus = normalizePaymentStatus(orderStatus, payment, paymentReviewStatus, local);

      return {
        ...local,
        id: typeof sourceOrder.id === "string" && sourceOrder.id.startsWith("ORDER") ? sourceOrder.id : local.id || makeOrderNo(backendId, createdAt),
        backendId,
        userId: sourceOrder.userId ?? local.userId,
        userName: sourceOrder.userName ?? local.userName,
        items: (sourceOrder.items || local.items || []).map((item) => ({ image: "", ...item })),
        contactName: sourceOrder.contactName ?? local.contactName ?? sourceOrder.receiver ?? "",
        phone: sourceOrder.phone ?? local.phone ?? "",
        deliveryType: sourceOrder.deliveryType ?? local.deliveryType ?? "pickup",
        remark: sourceOrder.remark ?? local.remark ?? sourceOrder.note ?? "",
        totalAmount: Number(sourceOrder.totalAmount ?? local.totalAmount ?? sourceOrder.total ?? 0),
        deliveryFee: Number(sourceOrder.deliveryFee ?? local.deliveryFee ?? 0),
        discountAmount: Number(sourceOrder.discountAmount ?? local.discountAmount ?? 0),
        pointsDeduction: Number(sourceOrder.pointsDeduction ?? local.pointsDeduction ?? 0),
        payAmount: Number(sourceOrder.payAmount ?? local.payAmount ?? sourceOrder.total ?? payment?.amount ?? 0),
        paymentMethod: payment?.method ?? sourceOrder.paymentMethod ?? local.paymentMethod ?? "",
        paymentReviewStatus,
        paymentSubmittedAt: payment?.submittedAt || sourceOrder.paymentSubmittedAt || local.paymentSubmittedAt || "",
        paymentReviewedAt: sourceOrder.paymentReviewedAt || local.paymentReviewedAt || "",
        paymentReviewedBy: sourceOrder.paymentReviewedBy ?? local.paymentReviewedBy ?? 0,
        orderStatus,
        paymentStatus,
        payment,
        createdAt,
        paidAt: payment?.confirmedAt || sourceOrder.paidAt || local.paidAt || "",
        cancelledAt: sourceOrder.cancelledAt || local.cancelledAt || "",
        earnedPoints: sourceOrder.earnedPoints ?? local.earnedPoints ?? 0,
        earnedProgress: sourceOrder.earnedProgress ?? local.earnedProgress ?? 0
      };
    },

    upsertOrder(order) {
      const normalized = this.normalizeOrder(order);
      const index = this.orders.findIndex((item) => item.id === normalized.id || item.backendId === normalized.backendId);
      if (index >= 0) this.orders.splice(index, 1, normalized);
      else this.orders.unshift(normalized);
      this.currentOrder = normalized;
      this.saveOrders();
      return normalized;
    },

    mergeRemoteOrders(remoteOrders = []) {
      this.loadOrders();
      remoteOrders.forEach((order) => this.upsertOrder(order));
      return this.sortedOrders;
    },

    async fetchOrders() {
      const orders = await request("/api/orders");
      return this.mergeRemoteOrders(orders);
    },

    async fetchOrder(id) {
      const local = this.getOrderById(id);
      const backendId = local?.backendId || (String(id).startsWith("ORDER") ? "" : id);
      if (!backendId) return local;
      const order = await request(`/api/orders/${backendId}`);
      return this.upsertOrder(order);
    },

    async createOrder(payload) {
      const remote = await request("/api/orders", {
        method: "POST",
        body: {
          items: payload.items.map((item) => ({ productId: item.productId, quantity: item.quantity })),
          couponId: payload.couponId || payload.coupon || "",
          contactName: payload.contactName || "",
          phone: payload.phone || "",
          deliveryType: payload.deliveryType || "",
          remark: payload.remark || ""
        }
      });

      return this.upsertOrder({
        ...remote,
        backendId: remote.id,
        id: makeOrderNo(remote.id, remote.createdAt),
        ...payload,
        orderStatus: "pending",
        paymentStatus: "unpaid"
      });
    },

    getOrderById(id) {
      this.loadOrders();
      return this.orders.find((order) => order.id === id || String(order.backendId) === String(id)) || null;
    },

    setProcessing(id, paymentMethod) {
      const order = this.getOrderById(id);
      if (!order) return null;
      return this.upsertOrder({ ...order, paymentMethod, paymentReviewStatus: "not_submitted", paymentStatus: "processing" });
    },

    async createPayment(id, method = "mock") {
      const order = this.getOrderById(id);
      if (!order) throw new Error("订单不存在");
      const data = await request("/api/payments/create", {
        method: "POST",
        body: { orderId: order.backendId, method }
      });
      return {
        payment: data,
        order: this.upsertOrder({ ...order, ...data.order, payment: data })
      };
    },

    async submitPayment(id, paymentId) {
      const order = this.getOrderById(id);
      if (!order) throw new Error("订单不存在");
      const data = await request("/api/payments/submit", {
        method: "POST",
        body: { orderId: order.backendId, paymentId }
      });
      return this.upsertOrder({ ...order, ...data.order, payment: data });
    },

    async payOrder(id, paymentMethod) {
      const created = await this.createPayment(id, paymentMethod);
      return this.submitPayment(id, created.payment.paymentId);
    },

    async refreshPaymentStatus(id) {
      const order = this.getOrderById(id);
      if (!order) throw new Error("订单不存在");
      const data = await request(`/api/payments/order/${order.backendId}`);
      return this.upsertOrder({
        ...order,
        ...(data.order || {}),
        payment: data.payment
      });
    },

    async cancelPayment(id, paymentId) {
      const order = this.getOrderById(id);
      if (!order) throw new Error("订单不存在");
      const data = await request("/api/payments/cancel", {
        method: "POST",
        body: { orderId: order.backendId, paymentId }
      });
      return this.upsertOrder({ ...order, ...data.order, payment: data });
    },

    async cancelOrder(id) {
      const order = this.getOrderById(id);
      if (!order || order.paymentStatus === "success") return order;
      if (order.backendId) {
        const remote = await request(`/api/orders/${order.backendId}/cancel`, { method: "POST" });
        return this.upsertOrder(remote);
      }
      return this.upsertOrder({ ...order, orderStatus: "cancelled", paymentStatus: "unpaid" });
    },

    finishOrder(id) {
      const order = this.getOrderById(id);
      if (!order || order.paymentStatus !== "success") return order;
      return this.upsertOrder({ ...order, orderStatus: "finished" });
    }
  }
});
