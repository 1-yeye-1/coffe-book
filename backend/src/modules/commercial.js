const { db, today } = require("../shared/data");
const { nextId } = require("../shared/validators");
const { createNotification } = require("./notifications");

const DEFAULT_MEMBER_LEVELS = [
  {
    code: "LV1",
    name: "Lv1 新读者",
    minGrowth: 0,
    maxGrowth: 499,
    discountRate: 1,
    pointsMultiplier: 1,
    prioritySignup: 0,
    benefits: ["每日签到积分", "基础积分兑换", "活动报名提醒"]
  },
  {
    code: "LV2",
    name: "Lv2 咖啡爱好者",
    minGrowth: 500,
    maxGrowth: 1499,
    discountRate: 0.98,
    pointsMultiplier: 1.1,
    prioritySignup: 1,
    benefits: ["文创商城 98 折", "积分 1.1 倍", "活动提前报名 1 次/月"]
  },
  {
    code: "LV3",
    name: "Lv3 资深书友",
    minGrowth: 1500,
    maxGrowth: 2999,
    discountRate: 0.95,
    pointsMultiplier: 1.2,
    prioritySignup: 2,
    benefits: ["文创商城 95 折", "积分 1.2 倍", "读书会优先席位"]
  },
  {
    code: "LV4",
    name: "Lv4 黄金会员",
    minGrowth: 3000,
    maxGrowth: 5999,
    discountRate: 0.9,
    pointsMultiplier: 1.5,
    prioritySignup: 3,
    benefits: ["文创商城 9 折", "积分 1.5 倍", "生日咖啡券", "热门活动优先报名"]
  },
  {
    code: "LV5",
    name: "Lv5 黑金会员",
    minGrowth: 6000,
    maxGrowth: null,
    discountRate: 0.85,
    pointsMultiplier: 2,
    prioritySignup: 5,
    benefits: ["文创商城 85 折", "积分 2 倍", "专属客服", "黑金活动优先席位"]
  }
];

const DEFAULT_COUPONS = [
  {
    id: 1,
    name: "新人首单礼券",
    type: "newcomer",
    value: 20,
    threshold: 59,
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    totalQuantity: 1000,
    receivedQuantity: 0,
    scope: "all",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: 2,
    name: "满 99 减 15",
    type: "full_reduction",
    value: 15,
    threshold: 99,
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    totalQuantity: 800,
    receivedQuantity: 0,
    scope: "shop",
    status: "active",
    createdAt: "2026-01-01T00:00:00.000Z"
  },
  {
    id: 3,
    name: "黄金以上会员专属 9 折券",
    type: "member_exclusive",
    value: 0.9,
    threshold: 129,
    validFrom: "2026-01-01",
    validTo: "2026-12-31",
    totalQuantity: 500,
    receivedQuantity: 0,
    scope: "shop",
    status: "active",
    minLevelCode: "LV4",
    createdAt: "2026-01-01T00:00:00.000Z"
  }
];

let ensuringCommercialData = false;

function ensureCommercialData() {
  if (ensuringCommercialData) return;
  ensuringCommercialData = true;
  db.memberLevels = Array.isArray(db.memberLevels) ? db.memberLevels : [];
  db.memberGrowthLogs = Array.isArray(db.memberGrowthLogs) ? db.memberGrowthLogs : [];
  db.coupons = Array.isArray(db.coupons) ? db.coupons : [];
  db.userCoupons = Array.isArray(db.userCoupons) ? db.userCoupons : [];
  if (!db.memberLevels.length) db.memberLevels.push(...DEFAULT_MEMBER_LEVELS.map((item) => ({ ...item, benefits: [...item.benefits] })));
  if (!db.coupons.length) db.coupons.push(...DEFAULT_COUPONS.map((item) => ({ ...item })));
  for (const user of db.users) syncUserLevelRaw(user);
  ensuringCommercialData = false;
}

function activeLevels() {
  ensureCommercialData();
  return [...db.memberLevels].sort((a, b) => Number(a.minGrowth || 0) - Number(b.minGrowth || 0));
}

function memberLevelForProgressRaw(progress = 0) {
  const growth = Number(progress || 0);
  const levels = [...db.memberLevels].sort((a, b) => Number(a.minGrowth || 0) - Number(b.minGrowth || 0));
  return [...levels].reverse().find((level) => growth >= Number(level.minGrowth || 0)) || levels[0] || DEFAULT_MEMBER_LEVELS[0];
}

function memberLevelForProgress(progress = 0) {
  ensureCommercialData();
  return memberLevelForProgressRaw(progress);
}

function syncUserLevelRaw(user) {
  if (!user) return null;
  user.levelProgress = Number(user.levelProgress || 0);
  user.points = Number(user.points || 0);
  const level = db.memberLevels.length ? memberLevelForProgressRaw(user.levelProgress) : DEFAULT_MEMBER_LEVELS[0];
  user.level = level.name;
  return level;
}

function syncUserLevel(user) {
  ensureCommercialData();
  return syncUserLevelRaw(user);
}

function commercialMembershipData(user) {
  ensureCommercialData();
  const level = syncUserLevel(user);
  const levels = activeLevels();
  const index = levels.findIndex((item) => item.code === level.code);
  const next = levels[index + 1] || null;
  const current = Math.max(0, Number(user.levelProgress || 0) - Number(level.minGrowth || 0));
  const target = next ? Number(next.minGrowth || 0) - Number(level.minGrowth || 0) : current || 1;
  return {
    level: level.name,
    levelCode: level.code,
    levelProgress: Number(user.levelProgress || 0),
    current,
    target,
    nextLevel: next?.name || "已达最高等级",
    need: next ? Math.max(0, Number(next.minGrowth || 0) - Number(user.levelProgress || 0)) : 0,
    benefits: level.benefits || [],
    discountRate: Number(level.discountRate || 1),
    pointsMultiplier: Number(level.pointsMultiplier || 1),
    activityPriority: Number(level.prioritySignup || 0),
    allLevels: levels.map((item) => ({
      ...item,
      min: Number(item.minGrowth || 0),
      next: item.maxGrowth === null || item.maxGrowth === undefined ? null : Number(item.maxGrowth) + 1
    })),
    checkedInToday: user.lastCheckIn === today()
  };
}

function isCouponActive(coupon, dateKey = today()) {
  return coupon?.status === "active"
    && (!coupon.validFrom || coupon.validFrom <= dateKey)
    && (!coupon.validTo || coupon.validTo >= dateKey)
    && Number(coupon.receivedQuantity || 0) < Number(coupon.totalQuantity || 0);
}

function userCouponRows(userId) {
  ensureCommercialData();
  return db.userCoupons.filter((item) => Number(item.userId) === Number(userId));
}

function couponPayloadForUser(user, row) {
  const coupon = db.coupons.find((item) => item.id === Number(row.couponId));
  if (!coupon) return null;
  return {
    ...coupon,
    userCouponId: row.id,
    couponId: coupon.id,
    status: row.status,
    receivedAt: row.receivedAt,
    usedAt: row.usedAt || "",
    orderId: row.orderId || 0
  };
}

function listPublicCoupons(user) {
  ensureCommercialData();
  const membership = user ? commercialMembershipData(user) : null;
  return db.coupons.filter((coupon) => {
    if (!isCouponActive(coupon)) return false;
    if (!coupon.minLevelCode || !membership) return true;
    const levelIndex = activeLevels().findIndex((item) => item.code === membership.levelCode);
    const minIndex = activeLevels().findIndex((item) => item.code === coupon.minLevelCode);
    return levelIndex >= minIndex;
  });
}

function listMemberCoupons(user) {
  ensureCommercialData();
  return userCouponRows(user.id)
    .map((row) => couponPayloadForUser(user, row))
    .filter(Boolean)
    .sort((a, b) => String(a.status).localeCompare(String(b.status)) || String(b.receivedAt).localeCompare(String(a.receivedAt)));
}

function issueCoupon(user, couponId, source = "manual") {
  ensureCommercialData();
  const coupon = db.coupons.find((item) => item.id === Number(couponId));
  if (!coupon) throw new Error("优惠券不存在");
  if (!isCouponActive(coupon)) throw new Error("优惠券不可领取");
  if (coupon.type === "newcomer" && userCouponRows(user.id).some((row) => {
    const current = db.coupons.find((item) => item.id === Number(row.couponId));
    return current?.type === "newcomer";
  })) {
    throw new Error("新人券已领取");
  }
  if (userCouponRows(user.id).some((row) => Number(row.couponId) === Number(coupon.id) && row.status === "unused")) {
    throw new Error("该优惠券已领取");
  }
  const row = {
    id: nextId(db.userCoupons),
    userId: user.id,
    couponId: coupon.id,
    status: "unused",
    source,
    receivedAt: new Date().toISOString(),
    usedAt: "",
    orderId: 0
  };
  db.userCoupons.push(row);
  coupon.receivedQuantity = Number(coupon.receivedQuantity || 0) + 1;
  createNotification({
    user,
    type: "coupon",
    title: "优惠券到账",
    content: `${coupon.name} 已发放到您的账户`,
    link: "/points",
    source,
    triggerType: "coupon_receive",
    triggerData: { couponId: coupon.id, userCouponId: row.id },
    priority: source === "register" ? "high" : "normal"
  });
  return couponPayloadForUser(user, row);
}

function autoIssueNewUserCoupon(user) {
  ensureCommercialData();
  const coupon = db.coupons.find((item) => item.type === "newcomer" && item.status === "active");
  if (!coupon) return null;
  try {
    return issueCoupon(user, coupon.id, "register");
  } catch (error) {
    return null;
  }
}

function calculateCouponDiscount(coupon, amount) {
  const subtotal = Number(amount || 0);
  if (!coupon || subtotal < Number(coupon.threshold || 0)) return 0;
  if (coupon.type === "discount" || (coupon.type === "member_exclusive" && Number(coupon.value) < 1)) {
    return Math.max(0, subtotal - subtotal * Number(coupon.value || 1));
  }
  return Math.min(subtotal, Number(coupon.value || 0));
}

function applyCommercialDiscount(user, subtotal, couponId) {
  ensureCommercialData();
  const membership = commercialMembershipData(user);
  const memberDiscount = Number((Number(subtotal || 0) * (1 - Number(membership.discountRate || 1))).toFixed(2));
  let couponDiscount = 0;
  let couponName = "";
  let userCouponId = 0;
  if (couponId && couponId !== "none") {
    const row = userCouponRows(user.id).find((item) => item.status === "unused" && Number(item.couponId) === Number(couponId));
    if (!row) throw new Error("优惠券不可用或已使用");
    const coupon = db.coupons.find((item) => item.id === Number(row.couponId));
    if (!coupon || !isCouponActive(coupon)) throw new Error("优惠券已失效");
    couponDiscount = Number(calculateCouponDiscount(coupon, subtotal).toFixed(2));
    couponName = coupon.name;
    userCouponId = row.id;
  }
  return {
    subtotal: Number(Number(subtotal || 0).toFixed(2)),
    memberDiscount,
    couponDiscount,
    discountAmount: Number((memberDiscount + couponDiscount).toFixed(2)),
    payAmount: Math.max(0, Number((Number(subtotal || 0) - memberDiscount - couponDiscount).toFixed(2))),
    couponName,
    userCouponId,
    membership
  };
}

function markCouponUsed(userCouponId, orderId) {
  if (!userCouponId) return null;
  const row = db.userCoupons.find((item) => item.id === Number(userCouponId));
  if (!row || row.status !== "unused") return null;
  row.status = "used";
  row.usedAt = new Date().toISOString();
  row.orderId = Number(orderId || 0);
  return row;
}

function addGrowthLog(user, value, source, relatedId = 0) {
  ensureCommercialData();
  const log = {
    id: nextId(db.memberGrowthLogs),
    userId: user.id,
    growthValue: Number(value || 0),
    source,
    relatedId,
    createdAt: new Date().toISOString()
  };
  db.memberGrowthLogs.push(log);
  return log;
}

function couponStats() {
  ensureCommercialData();
  return db.coupons.map((coupon) => {
    const received = db.userCoupons.filter((row) => Number(row.couponId) === Number(coupon.id)).length;
    const used = db.userCoupons.filter((row) => Number(row.couponId) === Number(coupon.id) && row.status === "used").length;
    return {
      ...coupon,
      receivedQuantity: received || Number(coupon.receivedQuantity || 0),
      usedQuantity: used,
      conversionRate: received ? Number(((used / received) * 100).toFixed(1)) : 0
    };
  });
}

function memberLevelDistribution() {
  ensureCommercialData();
  const map = new Map(activeLevels().map((level) => [level.name, { name: level.name, code: level.code, count: 0 }]));
  for (const user of db.users) {
    const level = syncUserLevel(user);
    const current = map.get(level.name) || { name: level.name, code: level.code, count: 0 };
    current.count += 1;
    map.set(level.name, current);
  }
  return [...map.values()];
}

function upsertMemberLevel(payload) {
  ensureCommercialData();
  const code = String(payload.code || "").trim().toUpperCase();
  if (!code) throw new Error("会员等级编码必填");
  const existing = db.memberLevels.find((item) => item.code === code);
  const benefits = Array.isArray(payload.benefits)
    ? payload.benefits
    : String(payload.benefits || "").split(/[,，\n]/).map((item) => item.trim()).filter(Boolean);
  const data = {
    code,
    name: String(payload.name || existing?.name || code).trim(),
    minGrowth: Number(payload.minGrowth ?? existing?.minGrowth ?? 0),
    maxGrowth: payload.maxGrowth === "" || payload.maxGrowth === null || payload.maxGrowth === undefined ? null : Number(payload.maxGrowth),
    discountRate: Number(payload.discountRate ?? existing?.discountRate ?? 1),
    pointsMultiplier: Number(payload.pointsMultiplier ?? existing?.pointsMultiplier ?? 1),
    prioritySignup: Number(payload.prioritySignup ?? existing?.prioritySignup ?? 0),
    benefits: benefits.length ? benefits : existing?.benefits || []
  };
  if (existing) Object.assign(existing, data);
  else db.memberLevels.push(data);
  for (const user of db.users) syncUserLevel(user);
  return data;
}

function createCoupon(payload) {
  ensureCommercialData();
  const coupon = {
    id: nextId(db.coupons),
    name: String(payload.name || "").trim(),
    type: String(payload.type || "full_reduction").trim(),
    value: Number(payload.value || 0),
    threshold: Number(payload.threshold || 0),
    validFrom: String(payload.validFrom || today()).slice(0, 10),
    validTo: String(payload.validTo || "2026-12-31").slice(0, 10),
    totalQuantity: Number(payload.totalQuantity || payload.quantity || 100),
    receivedQuantity: 0,
    scope: String(payload.scope || "all").trim(),
    status: String(payload.status || "active").trim(),
    minLevelCode: String(payload.minLevelCode || "").trim(),
    createdAt: new Date().toISOString()
  };
  if (!coupon.name) throw new Error("优惠券名称必填");
  if (!coupon.value) throw new Error("优惠券面额必填");
  db.coupons.push(coupon);
  return coupon;
}

module.exports = {
  DEFAULT_MEMBER_LEVELS,
  addGrowthLog,
  applyCommercialDiscount,
  autoIssueNewUserCoupon,
  commercialMembershipData,
  couponStats,
  createCoupon,
  ensureCommercialData,
  issueCoupon,
  listMemberCoupons,
  listPublicCoupons,
  markCouponUsed,
  memberLevelDistribution,
  memberLevelForProgress,
  syncUserLevel,
  upsertMemberLevel
};
