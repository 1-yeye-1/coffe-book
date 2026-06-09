const { db, today } = require("../shared/data");
const { ensureCommercialData, memberLevelDistribution } = require("./commercial");
const { ensureEngagementData } = require("./engagement");

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

function monthKey(value = new Date()) {
  return toDateKey(value).slice(0, 7);
}

function weekStartKey() {
  const date = new Date(`${today()}T00:00:00`);
  const day = date.getDay() || 7;
  date.setDate(date.getDate() - day + 1);
  return toDateKey(date);
}

function isPaidOrder(order) {
  return ["paid", "completed", "已支付", "已完成"].includes(String(order?.status || "")) || Boolean(order?.paidAt);
}

function dateInRange(value, startKey, endKey = today()) {
  const key = toDateKey(value);
  return key && key >= startKey && key <= endKey;
}

function ensureBusinessData() {
  ensureCommercialData();
  ensureEngagementData();
  db.businessMetricsDaily = Array.isArray(db.businessMetricsDaily) ? db.businessMetricsDaily : [];
}

function orderDate(order) {
  return toDateKey(order.paidAt || order.paymentReviewedAt || order.createdAt);
}

function paidOrders() {
  return db.orders.filter(isPaidOrder);
}

function orderAmount(order) {
  const direct = Number(order.subtotal ?? order.total ?? 0);
  if (direct > 0) return direct;
  return (order.items || []).reduce((sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0), 0);
}

function uniqueActiveUsers(startKey, endKey = today()) {
  const ids = new Set();
  const collect = (userId, value) => {
    if (Number(userId || 0) > 0 && dateInRange(value, startKey, endKey)) ids.add(Number(userId));
  };
  for (const order of db.orders) collect(order.userId, order.createdAt);
  for (const reservation of db.reservations) collect(reservation.userId, reservation.date || reservation.createdAt);
  for (const application of db.activityApplications) collect(application.userId, application.createdAt);
  for (const post of db.posts) {
    collect(post.userId, post.createdAt);
    for (const comment of post.comments || []) collect(comment.userId, comment.createdAt || post.createdAt);
  }
  for (const item of db.userBrowseHistory || []) collect(item.userId, item.createdAt);
  for (const item of db.userTasks || []) collect(item.userId, item.completedAt || item.createdAt);
  for (const item of db.inviteRecords || []) {
    collect(item.inviterUserId, item.createdAt || item.convertedAt);
    collect(item.inviteeUserId, item.convertedAt || item.createdAt);
  }
  return ids;
}

function newUsers(startKey, endKey = today()) {
  return db.users.filter((user) => {
    const key = toDateKey(user.createdAt || user.registeredAt || "");
    return key && key >= startKey && key <= endKey;
  }).length;
}

function incomeFor(startKey, endKey = today()) {
  return paidOrders()
    .filter((order) => dateInRange(order.paidAt || order.paymentReviewedAt || order.createdAt, startKey, endKey))
    .reduce((sum, order) => sum + Number(order.total || 0), 0);
}

function summarizeOrders() {
  const paid = paidOrders();
  const paidUserCounts = new Map();
  for (const order of paid) paidUserCounts.set(order.userId, Number(paidUserCounts.get(order.userId) || 0) + 1);
  const paidUsers = [...paidUserCounts.values()];
  const totalIncome = paid.reduce((sum, order) => sum + Number(order.total || 0), 0);
  return {
    total: db.orders.length,
    paidCount: paid.length,
    totalIncome,
    conversionRate: db.orders.length ? Number(((paid.length / db.orders.length) * 100).toFixed(1)) : 0,
    averageOrderValue: paid.length ? Number((totalIncome / paid.length).toFixed(2)) : 0,
    repurchaseRate: paidUsers.length ? Number(((paidUsers.filter((count) => count >= 2).length / paidUsers.length) * 100).toFixed(1)) : 0
  };
}

function activitySignupCount() {
  if ((db.activityApplications || []).length) {
    return { value: db.activityApplications.length, source: "activity_applications", type: "real" };
  }
  return {
    value: db.activities.reduce((sum, item) => sum + Number(item.applied || 0), 0),
    source: "activities.applied",
    type: "derived"
  };
}

function recommendationClickCount(startKey = recentDateKeys(30)[0]) {
  const clickRecords = (db.recommendRecords || []).filter((item) => {
    const action = String(item.action || item.event || item.status || "").toLowerCase();
    return ["click", "clicked"].includes(action) && dateInRange(item.createdAt, startKey);
  });
  if (clickRecords.length) return { value: clickRecords.length, source: "recommend_records(action=click)", type: "real" };
  const recommendationBrowse = (db.userBrowseHistory || []).filter((item) => {
    const source = String(item.source || item.scene || item.from || "").toLowerCase();
    return source.includes("recommend") && dateInRange(item.createdAt, startKey);
  });
  if (recommendationBrowse.length) return { value: recommendationBrowse.length, source: "user_browse_history(source=recommendation)", type: "derived" };
  return {
    value: (db.userBrowseHistory || []).filter((item) => dateInRange(item.createdAt, startKey)).length,
    source: "user_browse_history",
    type: "derived"
  };
}

function activityAttendanceCount() {
  return (db.activityApplications || []).filter((item) => ["attended", "arrived", "completed", "checked_in"].includes(String(item.status || "").toLowerCase())).length;
}

function productRanking(limit = 8) {
  const map = new Map();
  for (const order of db.orders) {
    for (const item of order.items || []) {
      const current = map.get(item.productId) || { id: item.productId, name: item.name, quantity: 0, total: 0 };
      current.quantity += Number(item.quantity || 0);
      current.total += Number(item.price || 0) * Number(item.quantity || 0);
      map.set(item.productId, current);
    }
  }
  return [...map.values()].sort((a, b) => b.quantity - a.quantity).slice(0, limit).map((item) => ({ ...item, total: Number(item.total.toFixed(2)) }));
}

function bookRanking(limit = 8) {
  const browseMap = new Map();
  for (const item of db.userBrowseHistory || []) {
    if (item.targetType === "book") browseMap.set(item.targetId, Number(browseMap.get(item.targetId) || 0) + 1);
  }
  return db.books
    .map((book) => ({ id: book.id, name: book.title, author: book.author, count: Number(browseMap.get(book.id) || 0) + Number(book.borrowCount || 0) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function activityRanking(limit = 8) {
  const exposureMap = new Map();
  for (const item of db.userBrowseHistory || []) {
    if (item.targetType === "activity") exposureMap.set(item.targetId, Number(exposureMap.get(item.targetId) || 0) + 1);
  }
  return db.activities
    .map((activity) => ({
      id: activity.id,
      name: activity.title,
      exposure: Number(exposureMap.get(activity.id) || 0),
      applied: Number(activity.applied || 0),
      capacity: Number(activity.capacity || 0)
    }))
    .sort((a, b) => b.applied - a.applied || b.exposure - a.exposure)
    .slice(0, limit);
}

function overview() {
  ensureBusinessData();
  const todayKey = today();
  const weekKey = weekStartKey();
  const month = monthKey();
  const orders = summarizeOrders();
  const todayIncome = incomeFor(todayKey);
  const weekIncome = incomeFor(weekKey);
  const monthIncome = paidOrders()
    .filter((order) => orderDate(order).slice(0, 7) === month)
    .reduce((sum, order) => sum + Number(order.total || 0), 0);
  const todayReservations = db.reservations.filter((item) => toDateKey(item.date || item.createdAt) === todayKey);
  const arrivedReservations = db.reservations.filter((item) => ["使用中", "已完成", "completed", "arrived"].includes(String(item.status || "")));
  const recommendationExposure = (db.recommendRecords || []).length;
  const activitySignup = activitySignupCount();
  const activityAttendance = activityAttendanceCount();
  const recommendationClicks = recommendationClickCount();
  const recommendationConversion = orders.paidCount;
  const data = {
    gmv: Number(db.orders.reduce((sum, order) => sum + orderAmount(order), 0).toFixed(2)),
    todayIncome: Number(todayIncome.toFixed(2)),
    weekIncome: Number(weekIncome.toFixed(2)),
    monthIncome: Number(monthIncome.toFixed(2)),
    orderCount: db.orders.length,
    paidOrderCount: orders.paidCount,
    paymentConversionRate: orders.conversionRate,
    averageOrderValue: orders.averageOrderValue,
    repurchaseRate: orders.repurchaseRate,
    dau: uniqueActiveUsers(todayKey).size,
    wau: uniqueActiveUsers(weekKey).size,
    mau: uniqueActiveUsers(`${month}-01`).size,
    newUsers: newUsers(todayKey),
    activeUsers: uniqueActiveUsers(recentDateKeys(30)[0]).size,
    memberLevelDistribution: memberLevelDistribution(),
    activityExposure: (db.userBrowseHistory || []).filter((item) => item.targetType === "activity").length,
    activitySignup: activitySignup.value,
    activityAttendance,
    activityConversionRate: activitySignup.value ? Number(((activityAttendance / activitySignup.value) * 100).toFixed(1)) : 0,
    reservationPeople: db.reservations.reduce((sum, item) => sum + Number(item.people || 1), 0),
    reservationCount: db.reservations.length,
    todayReservationCount: todayReservations.length,
    arrivedReservationCount: arrivedReservations.length,
    reservationArrivalRate: db.reservations.length ? Number(((arrivedReservations.length / db.reservations.length) * 100).toFixed(1)) : 0,
    recommendationExposure,
    recommendationClicks: recommendationClicks.value,
    recommendationConversion,
    recommendationConversionRate: recommendationExposure ? Number(((recommendationConversion / recommendationExposure) * 100).toFixed(1)) : 0,
    metricSources: {
      gmv: { source: "orders.subtotal/orders.total/order_items", type: "real" },
      orderCount: { source: "orders", type: "real" },
      paymentConversionRate: { source: "orders.status + orders.paid_at", type: "real" },
      averageOrderValue: { source: "paid orders total / paid order count", type: "real" },
      newUsers: { source: "users.created_at/users.registered_at", type: "real" },
      activeUsers: { source: "orders/reservations/activity_applications/posts/user_browse_history/user_tasks/invite_records", type: "real" },
      memberLevelDistribution: { source: "member_levels + users.level_progress", type: "real" },
      activitySignup: { source: activitySignup.source, type: activitySignup.type },
      reservationPeople: { source: "reservations.people", type: "real" },
      recommendationClicks: { source: recommendationClicks.source, type: recommendationClicks.type }
    },
    refreshedAt: new Date().toISOString()
  };
  upsertDailyMetric(data);
  return data;
}

function trends(days = 14) {
  ensureBusinessData();
  return recentDateKeys(days).map((date) => {
    const dayOrders = db.orders.filter((order) => toDateKey(order.createdAt) === date);
    const dayPaid = paidOrders().filter((order) => orderDate(order) === date);
    return {
      date,
      label: date.slice(5),
      revenue: Number(dayPaid.reduce((sum, order) => sum + Number(order.total || 0), 0).toFixed(2)),
      gmv: Number(dayOrders.reduce((sum, order) => sum + orderAmount(order), 0).toFixed(2)),
      orders: dayOrders.length,
      paidOrders: dayPaid.length,
      newUsers: newUsers(date),
      activeUsers: uniqueActiveUsers(date).size,
      reservations: db.reservations.filter((item) => toDateKey(item.date || item.createdAt) === date).length,
      activitySignup: db.activityApplications.length
        ? db.activityApplications.filter((item) => toDateKey(item.createdAt) === date).length
        : db.activities.filter((item) => toDateKey(item.date || item.createdAt) === date).reduce((sum, item) => sum + Number(item.applied || 0), 0)
    };
  });
}

function funnels() {
  ensureBusinessData();
  const orderCreated = db.orders.length;
  const submittedPayments = db.payments.filter((item) => ["submitted", "confirmed"].includes(String(item.status))).length;
  const paid = paidOrders().length;
  const activityExposure = (db.userBrowseHistory || []).filter((item) => item.targetType === "activity").length;
  const activitySignup = activitySignupCount().value;
  const activityAttendance = activityAttendanceCount();
  return {
    order: [
      { label: "创建订单", value: orderCreated },
      { label: "提交支付", value: submittedPayments },
      { label: "支付成功", value: paid },
      { label: "完成/复购", value: paidOrders().filter((item) => String(item.status) === "completed").length }
    ],
    activity: [
      { label: "活动曝光", value: activityExposure },
      { label: "活动报名", value: activitySignup },
      { label: "活动到场", value: activityAttendance }
    ]
  };
}

function memberAnalytics() {
  ensureBusinessData();
  return {
    distribution: memberLevelDistribution(),
    highValueUsers: db.users
      .map((user) => ({
        id: user.id,
        name: user.name,
        level: user.level,
        points: Number(user.points || 0),
        orders: db.orders.filter((order) => order.userId === user.id).length,
        paidAmount: paidOrders().filter((order) => order.userId === user.id).reduce((sum, order) => sum + Number(order.total || 0), 0)
      }))
      .sort((a, b) => b.paidAmount - a.paidAmount || b.points - a.points)
      .slice(0, 10)
  };
}

function recommendationAnalytics() {
  ensureBusinessData();
  const exposure = (db.recommendRecords || []).length;
  const clickMetric = recommendationClickCount("1970-01-01");
  const clicks = clickMetric.value;
  const conversion = paidOrders().length;
  return {
    exposure,
    clicks,
    conversion,
    clickRate: exposure ? Number(((clicks / exposure) * 100).toFixed(1)) : 0,
    conversionRate: exposure ? Number(((conversion / exposure) * 100).toFixed(1)) : 0,
    scenes: Object.values((db.recommendRecords || []).reduce((map, item) => {
      const key = item.scene || "home";
      map[key] = map[key] || { scene: key, exposure: 0 };
      map[key].exposure += 1;
      return map;
    }, {}))
  };
}

function rankings() {
  ensureBusinessData();
  return {
    products: productRanking(),
    books: bookRanking(),
    activities: activityRanking()
  };
}

function percent(part, total) {
  return total ? Number(((Number(part || 0) / Number(total || 1)) * 100).toFixed(1)) : 0;
}

function activityFunnelAnalysis() {
  ensureBusinessData();
  const activityBrowse = (db.userBrowseHistory || []).filter((item) => item.targetType === "activity");
  const activityRecommend = (db.recommendRecords || []).filter((item) => String(item.scene || "").includes("activity"));
  const exposure = activityBrowse.length + activityRecommend.length + db.activities.reduce((sum, item) => sum + Number(item.applied || 0), 0);
  const clicks = activityBrowse.length;
  const signups = activitySignupCount().value;
  const attendance = activityAttendanceCount();
  const signupUsers = new Set(db.activityApplications.map((item) => Number(item.userId || 0)).filter(Boolean));
  const repurchaseUsers = [...signupUsers].filter((userId) => paidOrders().filter((order) => Number(order.userId) === userId).length >= 2).length;
  const steps = [
    { label: "活动曝光", key: "exposure", value: exposure },
    { label: "活动点击", key: "click", value: clicks },
    { label: "活动报名", key: "signup", value: signups },
    { label: "活动到场", key: "attendance", value: attendance },
    { label: "活动后复购", key: "repurchase", value: repurchaseUsers }
  ];
  return {
    steps: steps.map((item, index) => ({
      ...item,
      conversionRate: index === 0 ? 100 : percent(item.value, steps[index - 1].value),
      totalRate: percent(item.value, exposure)
    })),
    activities: activityRanking(10).map((item) => ({
      ...item,
      click: activityBrowse.filter((record) => Number(record.targetId) === Number(item.id)).length,
      signupRate: percent(item.applied, item.exposure || exposure || 1),
      attendance: db.activityApplications.filter((record) => Number(record.activityId) === Number(item.id) && ["attended", "arrived", "completed", "checked_in"].includes(String(record.status || "").toLowerCase())).length
    }))
  };
}

function userOrderStats(user) {
  const orders = db.orders.filter((order) => Number(order.userId) === Number(user.id));
  const paid = orders.filter(isPaidOrder);
  const browse = (db.userBrowseHistory || []).filter((item) => Number(item.userId) === Number(user.id));
  const tasks = (db.userTasks || []).filter((item) => Number(item.userId) === Number(user.id) && item.status === "completed");
  const community = db.posts.filter((post) => Number(post.userId) === Number(user.id));
  const paidAmount = paid.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const recentActive = [
    ...orders.map((item) => item.createdAt),
    ...browse.map((item) => item.createdAt),
    ...tasks.map((item) => item.completedAt || item.createdAt),
    ...community.map((item) => item.createdAt)
  ].map(toDateKey).filter(Boolean).sort().pop();
  const activeDaysAgo = recentActive ? Math.max(0, Math.round((new Date(`${today()}T00:00:00`) - new Date(`${recentActive}T00:00:00`)) / 86400000)) : 999;
  const activityScore = browse.length + tasks.length * 2 + community.length * 3 + paid.length * 4;
  return { orders, paid, browse, tasks, paidAmount, activeDaysAgo, activityScore };
}

function userSegmentationAnalysis() {
  ensureBusinessData();
  const users = db.users.map((user) => {
    const stats = userOrderStats(user);
    let segment = "潜力用户";
    if (stats.paidAmount >= 300 || stats.paid.length >= 3 || Number(user.points || 0) >= 2500) segment = "高价值用户";
    else if (stats.activeDaysAgo > 30 && stats.paid.length === 0) segment = "沉睡用户";
    return {
      id: user.id,
      name: user.name,
      level: user.level,
      segment,
      orderCount: stats.orders.length,
      paidOrderCount: stats.paid.length,
      paidAmount: Number(stats.paidAmount.toFixed(2)),
      activeScore: stats.activityScore,
      activeDaysAgo: stats.activeDaysAgo,
      repeatRate: stats.paid.length >= 2 ? 100 : 0
    };
  });
  const segments = ["高价值用户", "潜力用户", "沉睡用户"].map((name) => {
    const list = users.filter((user) => user.segment === name);
    return {
      name,
      count: list.length,
      paidAmount: Number(list.reduce((sum, user) => sum + user.paidAmount, 0).toFixed(2)),
      avgActiveScore: list.length ? Number((list.reduce((sum, user) => sum + user.activeScore, 0) / list.length).toFixed(1)) : 0,
      repeatRate: percent(list.filter((user) => user.paidOrderCount >= 2).length, list.length)
    };
  });
  return {
    totalUsers: users.length,
    segments,
    users: users.sort((a, b) => b.paidAmount - a.paidAmount || b.activeScore - a.activeScore).slice(0, 20)
  };
}

function productRepeatAnalysis() {
  ensureBusinessData();
  const productMap = new Map();
  for (const order of db.orders) {
    for (const item of order.items || []) {
      const productId = Number(item.productId || item.id || 0);
      const current = productMap.get(productId) || {
        id: productId,
        name: item.name || item.productName || `商品 #${productId}`,
        quantity: 0,
        revenue: 0,
        buyers: new Map()
      };
      current.quantity += Number(item.quantity || 0);
      current.revenue += Number(item.price || 0) * Number(item.quantity || 0);
      if (Number(order.userId || 0) > 0) current.buyers.set(Number(order.userId), Number(current.buyers.get(Number(order.userId)) || 0) + 1);
      productMap.set(productId, current);
    }
  }
  const products = [...productMap.values()].map((item) => {
    const buyerCounts = [...item.buyers.values()];
    const repeatBuyers = buyerCounts.filter((count) => count >= 2).length;
    return {
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      revenue: Number(item.revenue.toFixed(2)),
      buyerCount: buyerCounts.length,
      repeatBuyers,
      repeatRate: percent(repeatBuyers, buyerCounts.length),
      purchaseFrequency: buyerCounts.length ? Number((item.quantity / buyerCounts.length).toFixed(2)) : 0
    };
  }).sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue);
  const totalBuyers = new Set(paidOrders().map((order) => Number(order.userId || 0)).filter(Boolean));
  const repeatBuyers = [...totalBuyers].filter((userId) => paidOrders().filter((order) => Number(order.userId) === userId).length >= 2);
  return {
    summary: {
      hotProductCount: products.length,
      totalRevenue: Number(products.reduce((sum, item) => sum + item.revenue, 0).toFixed(2)),
      repeatBuyerCount: repeatBuyers.length,
      repeatRate: percent(repeatBuyers.length, totalBuyers.size)
    },
    products: products.slice(0, 12),
    trend: recentDateKeys(14).map((date) => {
      const dayPaid = paidOrders().filter((order) => orderDate(order) === date);
      const buyers = new Set(dayPaid.map((order) => Number(order.userId || 0)).filter(Boolean));
      const repeat = [...buyers].filter((userId) => paidOrders().filter((order) => Number(order.userId) === userId && orderDate(order) <= date).length >= 2);
      return { date, label: date.slice(5), repeatRate: percent(repeat.length, buyers.size), orders: dayPaid.length };
    })
  };
}

function memberLevelAnalysis() {
  ensureBusinessData();
  const paid = paidOrders();
  const totalAmount = paid.reduce((sum, order) => sum + Number(order.total || 0), 0);
  const levels = memberLevelDistribution().map((level) => {
    const users = db.users.filter((user) => user.level === level.name || String(user.level || "").includes(level.name) || String(level.name || "").includes(user.level || ""));
    const userIds = new Set(users.map((user) => Number(user.id)));
    const levelOrders = paid.filter((order) => userIds.has(Number(order.userId)));
    const amount = levelOrders.reduce((sum, order) => sum + Number(order.total || 0), 0);
    const growthValues = users.map((user) => Number(user.growthValue || user.levelProgress || user.points || 0));
    return {
      code: level.code,
      name: level.name,
      count: users.length || Number(level.count || 0),
      paidAmount: Number(amount.toFixed(2)),
      consumptionShare: percent(amount, totalAmount),
      averageGrowth: growthValues.length ? Math.round(growthValues.reduce((sum, value) => sum + value, 0) / growthValues.length) : 0,
      maxGrowth: growthValues.length ? Math.max(...growthValues) : 0,
      orderCount: levelOrders.length
    };
  });
  return {
    levels,
    totalPaidAmount: Number(totalAmount.toFixed(2)),
    kpiConfigs: db.businessKpiConfigs || []
  };
}

function operationsV2Payload() {
  return {
    activityFunnel: activityFunnelAnalysis(),
    userSegmentation: userSegmentationAnalysis(),
    productRepeat: productRepeatAnalysis(),
    memberAnalysis: memberLevelAnalysis(),
    kpiConfigs: db.businessKpiConfigs || []
  };
}

function upsertDailyMetric(data = overview()) {
  const date = today();
  const existing = db.businessMetricsDaily.find((item) => item.metricDate === date);
  const metric = {
    id: existing?.id || db.businessMetricsDaily.length + 1,
    metricDate: date,
    gmv: data.gmv,
    salesAmount: data.todayIncome,
    orderCount: data.orderCount,
    newUsers: data.newUsers,
    activeUsers: data.activeUsers,
    activitySignup: data.activitySignup,
    reservationCount: data.reservationCount,
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  if (existing) Object.assign(existing, metric);
  else db.businessMetricsDaily.push(metric);
  return metric;
}

function businessPayload() {
  return {
    overview: overview(),
    trends: trends(),
    funnel: funnels(),
    members: memberAnalytics(),
    recommendations: recommendationAnalytics(),
    rankings: rankings(),
    snapshots: db.businessMetricsDaily
  };
}

module.exports = {
  activityFunnelAnalysis,
  businessPayload,
  funnels,
  memberLevelAnalysis,
  memberAnalytics,
  overview,
  operationsV2Payload,
  productRepeatAnalysis,
  rankings,
  recommendationAnalytics,
  trends,
  userSegmentationAnalysis,
  upsertDailyMetric
};
