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
  const date = new Date(value);
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
  reviewing: "付款审核中",
  paid: "已支付",
  ready: "待取货",
  finished: "已完成",
  cancelled: "已取消"
};

export const paymentStatusText = {
  unpaid: "未支付",
  processing: "支付中",
  pending_review: "等待后台审核",
  success: "支付成功",
  failed: "支付失败",
  refunded: "已退款"
};

export const paymentMethodText = {
  wechat: "微信支付",
  alipay: "支付宝",
  balance: "会员余额",
  store: "到店支付"
};

function normalizeStatus(order = {}, local = {}, reviewStatus = "not_submitted") {
  if (reviewStatus === "pending" || order.status === "支付审核中") return "reviewing";
  if (reviewStatus === "rejected") return "pending";
  const paid = order.status === "已支付" || Boolean(order.paidAt);
  if (local.orderStatus === "cancelled" || local.orderStatus === "finished" || local.orderStatus === "ready") return local.orderStatus;
  if (paid) return (order.deliveryType || local.deliveryType) === "pickup" ? "ready" : "paid";
  return local.orderStatus || "pending";
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
      const backendId = Number(order.backendId ?? (Number.isFinite(Number(order.id)) ? Number(order.id) : 0));
      const local = this.orders.find((item) => item.id === order.id || item.backendId === backendId) || {};
      const createdAt = order.createdAt || local.createdAt || new Date().toISOString();
      const paymentReviewStatus = order.paymentReviewStatus ?? local.paymentReviewStatus ?? "not_submitted";
      const orderStatus = normalizeStatus(order, local, paymentReviewStatus);
      const paymentStatus = paymentReviewStatus === "pending"
        ? "pending_review"
        : paymentReviewStatus === "rejected"
          ? "failed"
          : orderStatus === "paid" || orderStatus === "ready" || orderStatus === "finished"
            ? "success"
            : order.paymentStatus || local.paymentStatus || "unpaid";

      return {
        ...local,
        id: typeof order.id === "string" && order.id.startsWith("ORDER") ? order.id : local.id || makeOrderNo(backendId, createdAt),
        backendId,
        userId: order.userId ?? local.userId,
        userName: order.userName ?? local.userName,
        items: (order.items || local.items || []).map((item) => ({ image: "", ...item })),
        contactName: order.contactName ?? local.contactName ?? order.receiver ?? "",
        phone: order.phone ?? local.phone ?? "",
        deliveryType: order.deliveryType ?? local.deliveryType ?? "pickup",
        remark: order.remark ?? local.remark ?? order.note ?? "",
        totalAmount: Number(order.totalAmount ?? local.totalAmount ?? order.total ?? 0),
        deliveryFee: Number(order.deliveryFee ?? local.deliveryFee ?? 0),
        discountAmount: Number(order.discountAmount ?? local.discountAmount ?? 0),
        pointsDeduction: Number(order.pointsDeduction ?? local.pointsDeduction ?? 0),
        payAmount: Number(order.payAmount ?? local.payAmount ?? order.total ?? 0),
        paymentMethod: order.paymentMethod ?? local.paymentMethod ?? "",
        paymentReviewStatus,
        paymentSubmittedAt: order.paymentSubmittedAt || local.paymentSubmittedAt || "",
        paymentReviewedAt: order.paymentReviewedAt || local.paymentReviewedAt || "",
        paymentReviewedBy: order.paymentReviewedBy ?? local.paymentReviewedBy ?? 0,
        orderStatus,
        paymentStatus,
        createdAt,
        paidAt: order.paidAt || local.paidAt || "",
        earnedPoints: order.earnedPoints ?? local.earnedPoints ?? 0,
        earnedProgress: order.earnedProgress ?? local.earnedProgress ?? 0
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

    async createOrder(payload) {
      const remote = await request("/api/orders", {
        method: "POST",
        body: JSON.stringify({
          items: payload.items.map((item) => ({ productId: item.productId, quantity: item.quantity }))
        })
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

    async payOrder(id, paymentMethod) {
      const order = this.getOrderById(id);
      if (!order) throw new Error("订单不存在");
      const remote = await request(`/api/orders/${order.backendId}/pay`, {
        method: "POST",
        body: JSON.stringify({ paymentMethod: paymentMethodText[paymentMethod] || "模拟支付" })
      });
      return this.upsertOrder({
        ...order,
        ...remote,
        backendId: order.backendId,
        id: order.id,
        items: order.items,
        paymentMethod,
        paymentReviewStatus: remote.paymentReviewStatus || "pending",
        paymentSubmittedAt: remote.paymentSubmittedAt || new Date().toISOString(),
        orderStatus: remote.paymentReviewStatus === "approved" ? (order.deliveryType === "pickup" ? "ready" : "paid") : "reviewing",
        paymentStatus: remote.paymentReviewStatus === "approved" ? "success" : "pending_review",
        paidAt: remote.paidAt || ""
      });
    },

    async refreshPaymentStatus(id) {
      const order = this.getOrderById(id);
      if (!order) throw new Error("订单不存在");
      const remote = await request(`/api/orders/${order.backendId}/payment-status`);
      return this.upsertOrder({
        ...order,
        ...remote,
        backendId: order.backendId,
        id: order.id,
        items: order.items
      });
    },

    cancelOrder(id) {
      const order = this.getOrderById(id);
      if (!order || order.paymentStatus === "success") return order;
      return this.upsertOrder({ ...order, orderStatus: "cancelled", paymentStatus: "unpaid" });
    },

    finishOrder(id) {
      const order = this.getOrderById(id);
      if (!order || order.paymentStatus !== "success") return order;
      return this.upsertOrder({ ...order, orderStatus: "finished" });
    }
  }
});
