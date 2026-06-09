const { db, today } = require("../shared/data");
const { nextId } = require("../shared/validators");
const { issueCoupon } = require("./commercial");
const { createNotification, ensureNotificationData, listNotificationsForUser } = require("./notifications");

const DAILY_TASKS = [
  { actionKey: "daily_check_in", title: "每日签到", description: "完成今日签到，累积连续签到天数。", rewardPoints: 10, type: "daily" },
  { actionKey: "browse_book", title: "浏览一本书", description: "进入任意书籍详情页。", rewardPoints: 5, type: "daily" },
  { actionKey: "browse_product", title: "浏览一个商品", description: "进入任意文创或咖啡商品详情页。", rewardPoints: 5, type: "daily" },
  { actionKey: "browse_activity", title: "浏览一个活动", description: "进入任意活动详情页。", rewardPoints: 5, type: "daily" },
  { actionKey: "like_post", title: "点赞一次动态", description: "为社区动态点一次赞。", rewardPoints: 5, type: "daily" },
  { actionKey: "comment_post", title: "评论一次动态", description: "在社区动态下提交一条评论。", rewardPoints: 8, type: "daily" }
];

const GROWTH_TASKS = [
  { actionKey: "complete_profile", title: "完善个人资料", description: "填写邮箱、生日、偏好或个人简介。", rewardPoints: 30, type: "growth" },
  { actionKey: "first_order", title: "首次下单", description: "完成第一笔商城订单创建。", rewardPoints: 50, type: "growth" },
  { actionKey: "first_reservation", title: "首次预约", description: "完成第一次座位预约。", rewardPoints: 30, type: "growth" },
  { actionKey: "first_activity_signup", title: "首次活动报名", description: "完成第一次活动报名。", rewardPoints: 40, type: "growth" },
  { actionKey: "first_redeem_gift", title: "首次兑换礼品", description: "使用积分兑换任意礼品。", rewardPoints: 40, type: "growth" }
];

const DEFAULT_BADGES = [
  { id: 1, code: "reader", name: "阅读达人", description: "浏览书籍并沉淀阅读兴趣", icon: "读", rule: "browse_book", status: "active" },
  { id: 2, code: "coffee", name: "咖啡鉴赏家", description: "持续浏览咖啡商品与咖啡内容", icon: "咖", rule: "browse_product", status: "active" },
  { id: 3, code: "event", name: "活动先锋", description: "报名并参与书屋活动", icon: "活", rule: "first_activity_signup", status: "active" },
  { id: 4, code: "community", name: "社区达人", description: "点赞、评论并参与社区互动", icon: "社", rule: "comment_post", status: "active" },
  { id: 5, code: "black-gold", name: "黑金会员", description: "达到 Lv5 黑金会员等级", icon: "黑", rule: "LV5", status: "active" }
];

const CHECK_IN_REWARDS = [
  { days: 1, points: 10, label: "1 天" },
  { days: 3, points: 20, label: "3 天" },
  { days: 7, points: 50, label: "7 天" },
  { days: 15, points: 120, label: "15 天" },
  { days: 30, points: 300, label: "30 天" }
];

function ensureEngagementData() {
  db.recommendRecords = Array.isArray(db.recommendRecords) ? db.recommendRecords : [];
  db.userBrowseHistory = Array.isArray(db.userBrowseHistory) ? db.userBrowseHistory : [];
  db.inviteRecords = Array.isArray(db.inviteRecords) ? db.inviteRecords : [];
  db.taskRules = Array.isArray(db.taskRules) ? db.taskRules : [];
  db.userTasks = Array.isArray(db.userTasks) ? db.userTasks : [];
  db.badges = Array.isArray(db.badges) ? db.badges : [];
  db.userBadges = Array.isArray(db.userBadges) ? db.userBadges : [];
  ensureNotificationData();
  if (!db.taskRules.length) db.taskRules.push(...[...DAILY_TASKS, ...GROWTH_TASKS].map((item, index) => ({
    id: index + 1,
    ...item,
    status: "active",
    createdAt: new Date().toISOString()
  })));
  if (!db.badges.length) db.badges.push(...DEFAULT_BADGES.map((item) => ({ ...item, createdAt: new Date().toISOString() })));
  for (const user of db.users) ensureInviteCode(user);
}

function notify(user, type, title, content) {
  ensureEngagementData();
  return createNotification({
    user,
    type,
    title,
    content,
    link: "/notifications",
    source: "automation",
    triggerType: type,
    triggerData: {},
    priority: ["payment", "order", "reservation"].includes(type) ? "high" : "normal"
  });
}

function dateKey(value = new Date()) {
  const date = value instanceof Date ? value : new Date(String(value || "").replace(" ", "T"));
  return Number.isNaN(date.getTime()) ? today() : date.toISOString().slice(0, 10);
}

function ensureInviteCode(user) {
  if (!user) return "";
  if (!user.inviteCode) user.inviteCode = `CB${String(user.id).padStart(4, "0")}${String(user.phone || "").slice(-4)}`;
  return user.inviteCode;
}

function taskDate(rule) {
  return rule.type === "daily" ? today() : "growth";
}

function userTaskFor(user, rule) {
  const date = taskDate(rule);
  let task = db.userTasks.find((item) => item.userId === user.id && item.taskRuleId === rule.id && item.dateKey === date);
  if (!task) {
    task = {
      id: nextId(db.userTasks),
      userId: user.id,
      taskRuleId: rule.id,
      dateKey: date,
      status: "pending",
      progress: 0,
      completedAt: "",
      createdAt: new Date().toISOString()
    };
    db.userTasks.push(task);
  }
  return task;
}

function awardTask(user, rule, task) {
  if (task.status === "completed") return task;
  task.status = "completed";
  task.progress = 1;
  task.completedAt = new Date().toISOString();
  user.points = Number(user.points || 0) + Number(rule.rewardPoints || 0);
  notify(user, "task", "恭喜完成任务", `${rule.title} 完成，获得 ${rule.rewardPoints} 积分`);
  notify(user, "points", "积分到账", `${rule.title} +${rule.rewardPoints} 积分`);
  maybeAwardBadges(user, rule.actionKey);
  return task;
}

function completeTask(user, actionKey) {
  ensureEngagementData();
  if (!user) return null;
  const rules = db.taskRules.filter((item) => item.actionKey === actionKey && item.status !== "disabled");
  let completed = null;
  for (const rule of rules) {
    const task = userTaskFor(user, rule);
    completed = awardTask(user, rule, task);
  }
  return completed;
}

function syncDerivedTasks(user) {
  if (!user) return;
  if (user.email || user.birthday || user.bio || user.coffeePreference || user.bookPreference || user.address) completeTask(user, "complete_profile");
  if (db.orders.some((item) => item.userId === user.id)) completeTask(user, "first_order");
  if (db.reservations.some((item) => item.userId === user.id)) completeTask(user, "first_reservation");
  if (db.activityApplications.some((item) => item.userId === user.id)) completeTask(user, "first_activity_signup");
  if ((user.gifts || []).length) completeTask(user, "first_redeem_gift");
}

function listTasks(user) {
  ensureEngagementData();
  syncDerivedTasks(user);
  return db.taskRules
    .filter((rule) => rule.status !== "disabled")
    .map((rule) => {
      const task = userTaskFor(user, rule);
      return {
        id: rule.id,
        title: rule.title,
        description: rule.description,
        rewardPoints: Number(rule.rewardPoints || 0),
        type: rule.type,
        status: task.status,
        completedAt: task.completedAt,
        actionKey: rule.actionKey
      };
    });
}

function checkInTask(user) {
  ensureEngagementData();
  if (!user) throw new Error("请先登录");
  user.checkInDates = Array.isArray(user.checkInDates) ? user.checkInDates : [];
  if (user.checkInDates.includes(today())) throw new Error("今天已经签到过了");
  const rule = db.taskRules.find((item) => item.actionKey === "daily_check_in");
  const task = userTaskFor(user, rule);
  awardTask(user, rule, task);
  user.checkInDates.push(today());
  user.lastCheckIn = today();
  user.levelProgress = Number(user.levelProgress || 0) + 35;
  const streak = checkInStreak(user);
  const milestone = CHECK_IN_REWARDS.find((item) => item.days === streak);
  if (milestone) {
    user.points = Number(user.points || 0) + milestone.points;
    notify(user, "check_in", "签到奖励", `连续签到 ${milestone.label}，额外获得 ${milestone.points} 积分`);
  } else {
    notify(user, "check_in", "签到成功", `连续签到 ${streak} 天`);
  }
  return { tasks: listTasks(user), checkIn: checkInSummary(user) };
}

function checkInStreak(user) {
  const dates = new Set((user.checkInDates || []).map(String));
  let streak = 0;
  const date = new Date(`${today()}T00:00:00`);
  while (dates.has(date.toISOString().slice(0, 10))) {
    streak += 1;
    date.setDate(date.getDate() - 1);
  }
  return streak;
}

function checkInSummary(user) {
  user.checkInDates = Array.isArray(user.checkInDates) ? user.checkInDates : [];
  return {
    today: today(),
    checkedInToday: user.checkInDates.includes(today()) || user.lastCheckIn === today(),
    streak: checkInStreak(user),
    dates: user.checkInDates.slice(-30),
    rewards: CHECK_IN_REWARDS
  };
}

function badgePayload(user) {
  ensureEngagementData();
  maybeAwardBadges(user);
  const earned = new Map(db.userBadges.filter((item) => item.userId === user.id).map((item) => [item.badgeId, item]));
  return db.badges.map((badge) => ({
    ...badge,
    earned: earned.has(badge.id),
    earnedAt: earned.get(badge.id)?.earnedAt || ""
  }));
}

function maybeAwardBadges(user, trigger = "") {
  ensureEngagementData();
  if (!user) return;
  for (const badge of db.badges.filter((item) => item.status !== "disabled")) {
    if (db.userBadges.some((item) => item.userId === user.id && item.badgeId === badge.id)) continue;
    const shouldAward = badge.rule === trigger
      || (badge.rule === "LV5" && String(user.level || "").includes("Lv5"))
      || (badge.rule === "first_activity_signup" && db.activityApplications.some((item) => item.userId === user.id))
      || (badge.rule === "comment_post" && db.posts.some((post) => (post.comments || []).some((comment) => comment.userId === user.id)));
    if (!shouldAward) continue;
    db.userBadges.push({ id: nextId(db.userBadges), userId: user.id, badgeId: badge.id, earnedAt: new Date().toISOString() });
    notify(user, "badge", "勋章获得", badge.name);
  }
}

function recordBrowse(user, targetType, targetId) {
  ensureEngagementData();
  if (!targetType || !targetId) return null;
  const record = {
    id: nextId(db.userBrowseHistory),
    userId: user?.id || 0,
    targetType,
    targetId: Number(targetId),
    createdAt: new Date().toISOString()
  };
  db.userBrowseHistory.unshift(record);
  db.userBrowseHistory = db.userBrowseHistory.slice(0, 300);
  if (user) completeTask(user, targetType === "book" ? "browse_book" : targetType === "product" ? "browse_product" : targetType === "activity" ? "browse_activity" : "browse_post");
  return record;
}

function historyForUser(user) {
  ensureEngagementData();
  return db.userBrowseHistory
    .filter((item) => !user || !item.userId || item.userId === user.id)
    .slice(0, 20)
    .map((item) => ({ ...item, target: resolveTarget(item.targetType, item.targetId) }))
    .filter((item) => item.target);
}

function resolveTarget(type, id) {
  if (type === "book") return db.books.find((item) => item.id === Number(id));
  if (type === "product") return db.products.find((item) => item.id === Number(id));
  if (type === "activity") return db.activities.find((item) => item.id === Number(id));
  if (type === "post") return db.posts.find((item) => item.id === Number(id));
  return null;
}

function recommendations(user, scene = "home") {
  ensureEngagementData();
  const history = historyForUser(user);
  const boughtIds = new Set(db.orders.filter((order) => order.userId === user?.id).flatMap((order) => order.items || []).map((item) => item.productId));
  const favoriteText = new Set((user?.favorites || []).map(String));
  const products = [...db.products]
    .sort((a, b) => (boughtIds.has(b.id) ? -1 : 0) + Number(b.sales || b.stock || 0) - Number(a.sales || a.stock || 0))
    .slice(0, 4);
  const books = [...db.books]
    .sort((a, b) => (favoriteText.has(String(b.title)) ? 1 : 0) - (favoriteText.has(String(a.title)) ? 1 : 0))
    .slice(0, 4);
  const activities = [...db.activities]
    .sort((a, b) => Number(b.applied || 0) - Number(a.applied || 0))
    .slice(0, 4);
  const payload = {
    scene,
    history: history.slice(0, 6),
    products,
    books,
    activities,
    reason: history.length ? "基于最近浏览、收藏、购买与热门排行" : "基于热门销量、书籍热度和活动报名"
  };
  db.recommendRecords.unshift({ id: nextId(db.recommendRecords), userId: user?.id || 0, scene, targetType: "mixed", targetId: 0, reason: payload.reason, createdAt: new Date().toISOString() });
  db.recommendRecords = db.recommendRecords.slice(0, 300);
  return payload;
}

function inviteSummary(user, baseUrl = "") {
  ensureEngagementData();
  const inviteCode = ensureInviteCode(user);
  const records = db.inviteRecords.filter((item) => item.inviterUserId === user.id);
  const ranking = db.users.map((entry) => ({
    userId: entry.id,
    name: entry.name,
    inviteCode: ensureInviteCode(entry),
    count: db.inviteRecords.filter((item) => item.inviterUserId === entry.id && item.status !== "pending").length
  })).sort((a, b) => b.count - a.count).slice(0, 10);
  return {
    inviteCode,
    inviteLink: `${baseUrl || "http://localhost:5173"}/register?invite=${inviteCode}`,
    records,
    ranking,
    rewardRules: [
      { title: "邀请注册", reward: "+100 积分" },
      { title: "好友首单", reward: "+优惠券" }
    ]
  };
}

function bindInvite(user, inviteCode) {
  ensureEngagementData();
  const inviter = db.users.find((item) => ensureInviteCode(item) === String(inviteCode || "").trim());
  if (!inviter || inviter.id === user.id) throw new Error("邀请码无效");
  if (db.inviteRecords.some((item) => item.inviteeUserId === user.id)) throw new Error("已绑定邀请关系");
  const record = { id: nextId(db.inviteRecords), inviterUserId: inviter.id, inviteeUserId: user.id, inviteCode: inviter.inviteCode, status: "registered", rewardPoints: 100, rewardCouponId: 0, createdAt: new Date().toISOString(), convertedAt: new Date().toISOString() };
  db.inviteRecords.push(record);
  inviter.points = Number(inviter.points || 0) + 100;
  notify(inviter, "invite", "邀请奖励", `${user.name} 完成注册，获得 100 积分`);
  return record;
}

function awardInviteFirstOrder(user) {
  ensureEngagementData();
  const record = db.inviteRecords.find((item) => item.inviteeUserId === user.id && item.status === "registered");
  if (!record) return null;
  const inviter = db.users.find((item) => item.id === record.inviterUserId);
  if (!inviter) return null;
  try {
    const coupon = issueCoupon(inviter, 2, "invite_first_order");
    record.status = "first_order";
    record.rewardCouponId = coupon.couponId;
    record.convertedAt = new Date().toISOString();
    notify(inviter, "invite", "邀请首单奖励", `${user.name} 完成首单，奖励优惠券 ${coupon.name}`);
  } catch (error) {
    record.status = "first_order";
  }
  return record;
}

function notificationList(user) {
  ensureEngagementData();
  return listNotificationsForUser(user);
}

function upsertTaskRule(payload) {
  ensureEngagementData();
  const id = Number(payload.id || 0);
  const existing = db.taskRules.find((item) => item.id === id);
  const data = {
    id: existing?.id || nextId(db.taskRules),
    title: String(payload.title || existing?.title || "").trim(),
    description: String(payload.description || existing?.description || "").trim(),
    rewardPoints: Number(payload.rewardPoints ?? existing?.rewardPoints ?? 0),
    type: String(payload.type || existing?.type || "daily").trim(),
    actionKey: String(payload.actionKey || existing?.actionKey || "").trim(),
    status: String(payload.status || existing?.status || "active").trim(),
    createdAt: existing?.createdAt || new Date().toISOString()
  };
  if (!data.title || !data.actionKey) throw new Error("任务标题和动作标识必填");
  if (existing) Object.assign(existing, data);
  else db.taskRules.push(data);
  return data;
}

function upsertBadge(payload) {
  ensureEngagementData();
  const id = Number(payload.id || 0);
  const existing = db.badges.find((item) => item.id === id);
  const data = {
    id: existing?.id || nextId(db.badges),
    code: String(payload.code || existing?.code || `badge-${Date.now()}`).trim(),
    name: String(payload.name || existing?.name || "").trim(),
    description: String(payload.description || existing?.description || "").trim(),
    icon: String(payload.icon || existing?.icon || "章").trim(),
    rule: String(payload.rule || existing?.rule || "").trim(),
    status: String(payload.status || existing?.status || "active").trim(),
    createdAt: existing?.createdAt || new Date().toISOString()
  };
  if (!data.name) throw new Error("勋章名称必填");
  if (existing) Object.assign(existing, data);
  else db.badges.push(data);
  return data;
}

module.exports = {
  CHECK_IN_REWARDS,
  awardInviteFirstOrder,
  badgePayload,
  bindInvite,
  checkInSummary,
  checkInTask,
  completeTask,
  ensureEngagementData,
  historyForUser,
  inviteSummary,
  listTasks,
  notificationList,
  notify,
  recommendations,
  recordBrowse,
  upsertBadge,
  upsertTaskRule
};
