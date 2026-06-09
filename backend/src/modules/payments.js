const { db } = require("../shared/data");
const { persistOrder, persistPayment, persistUser } = require("../shared/mysql");
const { nextId } = require("../shared/validators");
const { addGrowthLog, commercialMembershipData, syncUserLevel } = require("./commercial");
const { createNotification } = require("./notifications");

const PAYMENT_EXPIRES_IN_MS = 15 * 60 * 1000;

const ORDER_STATUSES = new Set(["pending_payment", "payment_review", "paid", "cancelled", "completed"]);
const PAYMENT_METHODS = new Set(["wechat", "alipay", "mock"]);
const PAYMENT_STATUSES = new Set(["unpaid", "submitted", "confirmed", "failed", "expired"]);

const legacyOrderStatusMap = {
  "待支付": "pending_payment",
  "支付审核中": "payment_review",
  "已支付": "paid",
  "已取消": "cancelled",
  "已完成": "completed"
};

function nowText() {
  return new Date().toISOString();
}

function asTime(value) {
  const time = new Date(String(value || "").replace(" ", "T")).getTime();
  return Number.isFinite(time) ? time : 0;
}

function normalizeOrderStatus(status) {
  const value = String(status || "").trim();
  if (ORDER_STATUSES.has(value)) return value;
  return legacyOrderStatusMap[value] || value || "pending_payment";
}

function normalizePaymentMethod(method) {
  const value = String(method || "mock").trim().toLowerCase();
  if (value.includes("wechat") || value.includes("weixin") || value.includes("微信")) return "wechat";
  if (value.includes("alipay") || value.includes("支付宝")) return "alipay";
  return PAYMENT_METHODS.has(value) ? value : "mock";
}

function normalizePaymentStatus(status) {
  const value = String(status || "").trim();
  if (PAYMENT_STATUSES.has(value)) return value;
  if (value === "pending_review") return "submitted";
  if (value === "success" || value === "approved") return "confirmed";
  return "unpaid";
}

function apiBaseFromRequest(req) {
  return `http://${req.headers.host}`;
}

function transactionNo(orderId, paymentId) {
  return `MOCK${String(orderId).padStart(6, "0")}${String(paymentId).padStart(6, "0")}${Date.now()}`;
}

function findPaymentById(id) {
  return db.payments.find((item) => item.id === Number(id));
}

function paymentsForOrder(orderId) {
  return db.payments
    .filter((item) => item.orderId === Number(orderId))
    .sort((a, b) => Number(b.id) - Number(a.id));
}

function latestPaymentForOrder(orderId) {
  return paymentsForOrder(orderId)[0] || null;
}

function isPaymentExpired(payment) {
  return payment?.expiredAt && asTime(payment.expiredAt) <= Date.now();
}

async function markPaymentExpiredIfNeeded(payment, order) {
  if (!payment || payment.status !== "unpaid" || !isPaymentExpired(payment)) return false;
  payment.status = "expired";
  if (order && normalizeOrderStatus(order.status) === "pending_payment") {
    order.paymentReviewStatus = "not_submitted";
    await persistOrder(order);
  }
  await persistPayment(payment);
  return true;
}

function qrUrlForPayment(payment, apiBase) {
  const data = [
    "coffee-book-pay",
    `payment=${payment.id}`,
    `order=${payment.orderId}`,
    `amount=${Number(payment.amount || 0).toFixed(2)}`,
    `method=${payment.method}`,
    `tx=${payment.transactionNo}`
  ].join("|");
  return `${apiBase}/api/qr?data=${encodeURIComponent(data)}`;
}

function paymentPayload(payment, order, apiBase) {
  return {
    paymentId: payment.id,
    orderId: payment.orderId,
    userId: payment.userId,
    amount: Number(payment.amount || 0),
    method: payment.method,
    status: payment.status,
    transactionNo: payment.transactionNo,
    submittedAt: payment.submittedAt || "",
    confirmedAt: payment.confirmedAt || "",
    expiredAt: payment.expiredAt || "",
    createdAt: payment.createdAt || "",
    qrUrl: qrUrlForPayment(payment, apiBase),
    order
  };
}

async function createPayment(order, method, apiBase) {
  const orderStatus = normalizeOrderStatus(order.status);
  if (orderStatus === "paid" || orderStatus === "completed") {
    const existing = latestPaymentForOrder(order.id);
    if (existing) return paymentPayload(existing, order, apiBase);
    throw new Error("订单已支付，不能重复创建支付记录");
  }
  if (orderStatus === "cancelled") throw new Error("订单已取消，不能继续支付");

  const normalizedMethod = normalizePaymentMethod(method);
  let payment = latestPaymentForOrder(order.id);
  await markPaymentExpiredIfNeeded(payment, order);

  if (!payment || ["failed", "expired"].includes(payment.status)) {
    const paymentId = nextId(db.payments);
    payment = {
      id: paymentId,
      orderId: order.id,
      userId: order.userId || 0,
      amount: Number(order.total || 0),
      method: normalizedMethod,
      status: "unpaid",
      transactionNo: transactionNo(order.id, paymentId),
      submittedAt: "",
      confirmedAt: "",
      expiredAt: new Date(Date.now() + PAYMENT_EXPIRES_IN_MS).toISOString(),
      createdAt: nowText()
    };
    db.payments.push(payment);
  } else if (payment.status === "unpaid") {
    payment.method = normalizedMethod;
    payment.amount = Number(order.total || payment.amount || 0);
    payment.userId = order.userId || payment.userId || 0;
    payment.expiredAt = payment.expiredAt || new Date(Date.now() + PAYMENT_EXPIRES_IN_MS).toISOString();
  }

  order.status = payment.status === "submitted" ? "payment_review" : "pending_payment";
  order.paymentMethod = normalizedMethod;
  order.paymentReviewStatus = payment.status === "submitted" ? "pending" : "not_submitted";
  if (payment.status !== "submitted") {
    order.paymentSubmittedAt = "";
    order.paymentReviewedAt = "";
    order.paymentReviewedBy = 0;
  }
  await persistPayment(payment);
  await persistOrder(order);
  return paymentPayload(payment, order, apiBase);
}

async function submitPayment(payment, order) {
  await markPaymentExpiredIfNeeded(payment, order);
  if (!payment) throw new Error("支付记录不存在");
  if (payment.status === "expired") throw new Error("支付二维码已过期，请重新发起支付");
  if (payment.status === "failed") throw new Error("支付记录已失效，请重新发起支付");
  if (normalizeOrderStatus(order.status) === "cancelled") throw new Error("订单已取消，不能提交支付");
  if (normalizeOrderStatus(order.status) === "paid") return payment;

  const submittedAt = nowText();
  payment.status = "submitted";
  payment.submittedAt = payment.submittedAt || submittedAt;
  order.status = "payment_review";
  order.paymentMethod = payment.method;
  order.paymentReviewStatus = "pending";
  order.paymentSubmittedAt = payment.submittedAt;
  order.paymentReviewedAt = "";
  order.paymentReviewedBy = 0;
  await persistPayment(payment);
  await persistOrder(order);
  return payment;
}

async function cancelPayment(payment, order) {
  if (!payment) throw new Error("支付记录不存在");
  if (normalizeOrderStatus(order.status) === "paid" || payment.status === "confirmed") throw new Error("订单已支付，不能取消");
  const cancelledAt = nowText();
  payment.status = isPaymentExpired(payment) ? "expired" : "failed";
  if (payment.status === "expired" && !payment.expiredAt) payment.expiredAt = cancelledAt;
  order.status = "cancelled";
  order.cancelledAt = cancelledAt;
  order.paymentReviewStatus = payment.status === "failed" ? "rejected" : "not_submitted";
  order.paymentReviewedAt = "";
  order.paymentReviewedBy = 0;
  await persistPayment(payment);
  await persistOrder(order);
  return payment;
}

async function awardOrderBenefits(order) {
  const user = db.users.find((item) => item.id === order.userId);
  if (!user || order.paidAt) return;
  const membership = commercialMembershipData(user);
  const previousLevel = user.level;
  order.earnedPoints = Math.max(1, Math.floor(Number(order.total || 0) * Number(membership.pointsMultiplier || 1)));
  order.earnedProgress = Math.max(1, Math.ceil(Number(order.total || 0) * 0.5));
  user.points = Number(user.points || 0) + order.earnedPoints;
  user.levelProgress = Number(user.levelProgress || 0) + order.earnedProgress;
  addGrowthLog(user, order.earnedProgress, "order_paid", order.id);
  syncUserLevel(user);
  createNotification({
    user,
    type: "payment",
    title: "支付提醒",
    content: `订单 #${order.id} 已确认收款`,
    link: `/orders/${order.id}`,
    source: "payment",
    triggerType: "payment_confirmed",
    triggerData: { orderId: order.id, amount: order.total },
    priority: "high"
  });
  createNotification({
    user,
    type: "points",
    title: "积分到账",
    content: `获得 ${order.earnedPoints} 积分和 ${order.earnedProgress} 成长值`,
    link: "/points",
    source: "order",
    triggerType: "order_paid_reward",
    triggerData: { orderId: order.id, points: order.earnedPoints, growth: order.earnedProgress }
  });
  if (previousLevel && previousLevel !== user.level) {
    createNotification({
      user,
      type: "member_upgrade",
      title: "会员升级提醒",
      content: `会员等级已由 ${previousLevel} 升级为 ${user.level}，新权益已生效`,
      link: "/points",
      source: "member",
      triggerType: "member_level_upgrade",
      triggerData: { orderId: order.id, from: previousLevel, to: user.level },
      priority: "high"
    });
  }
  await persistUser(user);
}

async function ensureReviewPaymentForOrder(order) {
  let payment = latestPaymentForOrder(order.id);
  if (payment) return payment;
  const paymentId = nextId(db.payments);
  payment = {
    id: paymentId,
    orderId: order.id,
    userId: order.userId || 0,
    amount: Number(order.total || 0),
    method: normalizePaymentMethod(order.paymentMethod),
    status: "submitted",
    transactionNo: transactionNo(order.id, paymentId),
    submittedAt: order.paymentSubmittedAt || nowText(),
    confirmedAt: "",
    expiredAt: "",
    createdAt: order.createdAt || nowText()
  };
  db.payments.push(payment);
  await persistPayment(payment);
  return payment;
}

async function confirmPayment(payment, order, adminId = 0) {
  if (!payment) throw new Error("支付记录不存在");
  if (payment.status === "confirmed") return payment;
  if (payment.status !== "submitted") throw new Error("只有待确认收款的支付记录可以确认");
  const confirmedAt = nowText();
  await awardOrderBenefits(order);
  payment.status = "confirmed";
  payment.confirmedAt = confirmedAt;
  order.status = "paid";
  order.paidAt = confirmedAt;
  order.paymentMethod = payment.method;
  order.paymentReviewStatus = "approved";
  order.paymentReviewedAt = confirmedAt;
  order.paymentReviewedBy = adminId;
  await persistPayment(payment);
  await persistOrder(order);
  return payment;
}

async function confirmOrderPayment(order, adminId = 0) {
  const payment = await ensureReviewPaymentForOrder(order);
  return confirmPayment(payment, order, adminId);
}

async function rejectPayment(payment, order, adminId = 0, nextOrderStatus = "pending_payment") {
  if (!payment) throw new Error("支付记录不存在");
  if (payment.status !== "submitted") throw new Error("只有待确认收款的支付记录可以驳回");
  const reviewedAt = nowText();
  payment.status = "failed";
  order.status = nextOrderStatus === "cancelled" ? "cancelled" : "pending_payment";
  order.cancelledAt = order.status === "cancelled" ? reviewedAt : "";
  order.paymentReviewStatus = "rejected";
  order.paymentReviewedAt = reviewedAt;
  order.paymentReviewedBy = adminId;
  order.paidAt = "";
  await persistPayment(payment);
  await persistOrder(order);
  return payment;
}

async function rejectOrderPayment(order, adminId = 0, nextOrderStatus = "pending_payment") {
  const payment = await ensureReviewPaymentForOrder(order);
  return rejectPayment(payment, order, adminId, nextOrderStatus);
}

function adminPaymentRows(status = "submitted") {
  const normalized = String(status || "submitted");
  return db.payments
    .filter((payment) => normalized === "all" || payment.status === normalized)
    .sort((a, b) => String(b.submittedAt || b.createdAt).localeCompare(String(a.submittedAt || a.createdAt)))
    .map((payment) => {
      const order = db.orders.find((item) => item.id === payment.orderId);
      const user = db.users.find((item) => item.id === payment.userId);
      return {
        ...payment,
        amount: Number(payment.amount || order?.total || 0),
        userName: user?.name || order?.userName || "",
        userPhone: user?.phone || "",
        orderStatus: order?.status || "",
        orderPaymentReviewStatus: order?.paymentReviewStatus || "",
        orderCreatedAt: order?.createdAt || ""
      };
    });
}

module.exports = {
  ORDER_STATUSES,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  adminPaymentRows,
  apiBaseFromRequest,
  cancelPayment,
  confirmOrderPayment,
  confirmPayment,
  createPayment,
  findPaymentById,
  latestPaymentForOrder,
  markPaymentExpiredIfNeeded,
  normalizeOrderStatus,
  normalizePaymentMethod,
  normalizePaymentStatus,
  paymentPayload,
  rejectOrderPayment,
  rejectPayment,
  submitPayment
};
