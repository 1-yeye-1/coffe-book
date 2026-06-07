const { db, incomeData } = require("../shared/data");
const { getDatabaseOverview, reloadDatabase } = require("../shared/mysql");

const moduleTableMap = [
  { module: "用户管理", tables: ["users"], fields: "name, phone, email, birthday, level, points, profile_public" },
  { module: "商品管理", tables: ["products"], fields: "name, description, price, stock, category, image" },
  { module: "书籍管理", tables: ["books"], fields: "title, author, category, ranking, publisher, published_at" },
  { module: "订单管理", tables: ["orders", "order_items"], fields: "user_name, total, status, payment_method, payment_review_status, paid_at, cancelled_at, items" },
  { module: "支付审核", tables: ["payments", "orders"], fields: "order_id, user_id, amount, method, status, transaction_no, submitted_at, confirmed_at, expired_at" },
  { module: "预约管理", tables: ["reservations"], fields: "phone, seat_id, date, time, people, purpose, note, status" },
  { module: "活动管理", tables: ["activities", "activity_applications"], fields: "title, capacity, applied, registration_start, early_start, applications" },
  { module: "社区审核", tables: ["posts", "comments"], fields: "author, title, content, likes, comments.status" },
  { module: "内容管理", tables: ["notices"], fields: "title, summary, date" },
  { module: "购物车记录", tables: ["carts"], fields: "user_key, product_id, quantity, created_at" },
  { module: "实时日志", tables: ["audit_logs"], fields: "actor_type, actor_id, actor_name, action, target_type, target_id, detail, created_at" }
];

function toDateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(String(value || "").replace(" ", "T"));
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function recentDateKeys(days = 7) {
  return Array.from({ length: days }).map((_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - index - 1));
    return toDateKey(date);
  });
}

function isPaidOrder(order) {
  return ["paid", "completed", "已支付", "已完成"].includes(String(order?.status || "")) || Boolean(order?.paidAt);
}

function orderStatusLabel(status) {
  const labels = {
    pending_payment: "待支付",
    payment_review: "待确认收款",
    paid: "已支付",
    completed: "已完成",
    cancelled: "已取消",
    待支付: "待支付",
    支付审核中: "待确认收款",
    已支付: "已支付",
    已完成: "已完成",
    已取消: "已取消"
  };
  return labels[status] || status || "未知";
}

function enhancedDashboard() {
  const today = toDateKey();
  const paidOrders = db.orders.filter(isPaidOrder);
  const todaysOrders = db.orders.filter((order) => toDateKey(order.createdAt) === today);
  const todayIncome = paidOrders
    .filter((order) => toDateKey(order.paidAt || order.paymentReviewedAt || order.createdAt) === today)
    .reduce((sum, order) => sum + Number(order.total || 0), 0);

  const salesTrend = recentDateKeys().map((date) => {
    const dayOrders = paidOrders.filter((order) => toDateKey(order.paidAt || order.paymentReviewedAt || order.createdAt) === date);
    return {
      date,
      label: date.slice(5),
      total: Number(dayOrders.reduce((sum, order) => sum + Number(order.total || 0), 0).toFixed(2)),
      count: dayOrders.length
    };
  });

  const statusMap = new Map();
  for (const order of db.orders) {
    const label = orderStatusLabel(order.status);
    statusMap.set(label, Number(statusMap.get(label) || 0) + 1);
  }

  const productMap = new Map();
  for (const order of db.orders) {
    for (const item of order.items || []) {
      const current = productMap.get(item.productId) || { productId: item.productId, name: item.name, quantity: 0, total: 0 };
      current.quantity += Number(item.quantity || 0);
      current.total += Number(item.price || 0) * Number(item.quantity || 0);
      productMap.set(item.productId, current);
    }
  }

  const reservationMap = new Map();
  for (const reservation of db.reservations) {
    const key = reservation.time || "未设置";
    reservationMap.set(key, Number(reservationMap.get(key) || 0) + 1);
  }

  return {
    metrics: [
      { label: "订单总数", value: db.orders.length, note: "orders 全量记录" },
      { label: "今日订单", value: todaysOrders.length, note: today },
      { label: "今日收入", value: `￥${todayIncome.toFixed(2)}`, note: "已支付订单" },
      { label: "预约数量", value: db.reservations.length, note: "座位预约" },
      { label: "用户数量", value: db.users.length, note: "会员账户" }
    ],
    salesTrend,
    orderStatusDistribution: [...statusMap.entries()].map(([label, count]) => ({ label, count })),
    hotProducts: [...productMap.values()]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 6)
      .map((item) => ({ ...item, total: Number(item.total.toFixed(2)) })),
    reservationTimeStats: [...reservationMap.entries()]
      .map(([time, count]) => ({ time, count }))
      .sort((a, b) => String(a.time).localeCompare(String(b.time))),
    refreshedAt: new Date().toISOString()
  };
}

async function adminSummary() {
  await reloadDatabase();
  const activityApplications = db.activityApplications.map((application) => {
    const user = db.users.find((item) => item.id === Number(application.userId));
    return {
      ...application,
      userName: user?.name || "",
      userLevel: user?.level || ""
    };
  });
  return {
    metrics: [
      { label: "用户数", value: db.users.length, note: "会员账户" },
      { label: "商品数", value: db.products.length, note: "文创 SKU" },
      { label: "订单数", value: db.orders.length, note: "实时订单" },
      { label: "待审内容", value: db.posts.length, note: "社区动态" }
    ],
    tasks: [
      { title: "用户管理", desc: "查看会员等级、积分和账号状态", page: "adminUsers" },
      { title: "商品管理", desc: "维护文创商品库存与价格", page: "adminProducts" },
      { title: "预约管理", desc: "检查座位预约冲突与取消记录", page: "adminReservations" },
      { title: "活动管理", desc: "维护活动安排、报名时间和活动名额", page: "adminActivities" },
      { title: "社区审核", desc: "处理社区动态和评论内容", page: "adminCommunity" }
    ],
    users: db.users.map(({ password, ...user }) => user),
    products: db.products,
    orders: db.orders,
    payments: db.payments,
    reservations: db.reservations,
    activities: db.activities,
    activityApplications,
    notices: db.notices,
    books: db.books,
    posts: db.posts,
    carts: [...db.carts.entries()].flatMap(([userKey, items]) => items.map((item) => {
      const product = db.products.find((entry) => entry.id === Number(item.productId));
      const user = db.users.find((entry) => String(entry.id) === String(userKey));
      return { userKey, userName: user?.name || "", productName: product?.name || "", ...item };
    })),
    database: {
      overview: await getDatabaseOverview(),
      moduleTableMap,
      syncedAt: new Date().toISOString()
    },
    income: incomeData(),
    dashboard: enhancedDashboard()
  };
}

module.exports = { adminSummary, moduleTableMap };
