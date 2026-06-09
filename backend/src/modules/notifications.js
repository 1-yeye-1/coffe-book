const { db } = require("../shared/data");
const { nextId } = require("../shared/validators");

const TYPE_META = {
  system: { label: "系统公告", category: "system" },
  announcement: { label: "系统公告", category: "system" },
  activity: { label: "活动提醒", category: "activity" },
  reservation: { label: "预约提醒", category: "reservation" },
  order: { label: "订单提醒", category: "order" },
  payment: { label: "支付提醒", category: "order" },
  coupon: { label: "优惠券", category: "coupon" },
  coupon_expiring: { label: "优惠券即将过期", category: "coupon" },
  points: { label: "积分到账", category: "growth" },
  check_in: { label: "签到奖励", category: "task" },
  badge: { label: "勋章获得", category: "growth" },
  task: { label: "任务完成", category: "task" },
  invite: { label: "邀请奖励", category: "growth" },
  recommend: { label: "推荐提醒", category: "recommend" },
  member_upgrade: { label: "会员升级提醒", category: "growth" }
};

function ensureNotificationData() {
  db.notificationRecords = Array.isArray(db.notificationRecords) ? db.notificationRecords : [];
  db.announcements = Array.isArray(db.announcements) ? db.announcements : [];
  db.notificationRecords.forEach((item) => normalizeNotification(item));
}

function normalizeNotification(item) {
  const meta = TYPE_META[item.type] || TYPE_META.system;
  item.type = item.type || "system";
  item.title = item.title || meta.label;
  item.content = item.content || "";
  item.link = item.link || "";
  item.status = item.status || (item.isRead ? "read" : "unread");
  item.isRead = Boolean(item.isRead || item.status === "read");
  item.createdAt = item.createdAt || item.created_at || new Date().toISOString();
  item.readAt = item.readAt || item.read_at || "";
  item.source = item.source || "system";
  item.triggerType = item.triggerType || item.trigger_type || "manual";
  item.triggerData = item.triggerData || item.trigger_data || {};
  item.priority = item.priority || "normal";
  item.category = item.category || meta.category;
  item.clickCount = Number(item.clickCount || 0);
  return item;
}

function createNotification(options = {}) {
  ensureNotificationData();
  const type = options.type || "system";
  const meta = TYPE_META[type] || TYPE_META.system;
  const record = normalizeNotification({
    id: nextId(db.notificationRecords),
    userId: Number(options.userId || options.user?.id || 0),
    type,
    title: options.title || meta.label,
    content: options.content || "",
    link: options.link || "",
    status: "unread",
    isRead: false,
    createdAt: new Date().toISOString(),
    readAt: "",
    source: options.source || "automation",
    triggerType: options.triggerType || "manual",
    triggerData: options.triggerData || {},
    priority: options.priority || "normal",
    category: options.category || meta.category,
    clickCount: 0
  });
  db.notificationRecords.unshift(record);
  const user = options.user || db.users.find((item) => item.id === record.userId);
  if (user) user.notifications = [`${record.title}：${record.content}`, ...(user.notifications || [])].slice(0, 30);
  return record;
}

function listNotificationsForUser(user, filters = {}) {
  ensureNotificationData();
  return db.notificationRecords
    .filter((item) => item.userId === user.id || item.userId === 0)
    .filter((item) => !filters.category || filters.category === "all" || item.category === filters.category || item.type === filters.category)
    .filter((item) => !filters.status || filters.status === "all" || (filters.status === "unread" ? !item.isRead : item.isRead))
    .filter((item) => !filters.query || `${item.title} ${item.content} ${item.source}`.toLowerCase().includes(String(filters.query).toLowerCase()))
    .sort((a, b) => {
      const pa = a.priority === "high" ? 1 : 0;
      const pb = b.priority === "high" ? 1 : 0;
      return pb - pa || String(b.createdAt).localeCompare(String(a.createdAt));
    })
    .slice(0, 100);
}

function unreadCount(user) {
  return listNotificationsForUser(user).filter((item) => !item.isRead).length;
}

function markRead(user, ids = []) {
  ensureNotificationData();
  const idSet = new Set((Array.isArray(ids) ? ids : [ids]).map(Number));
  const now = new Date().toISOString();
  const changed = [];
  for (const item of db.notificationRecords) {
    if (!idSet.has(Number(item.id))) continue;
    if (!(item.userId === user.id || item.userId === 0)) continue;
    item.isRead = true;
    item.status = "read";
    item.readAt = item.readAt || now;
    changed.push(item.id);
  }
  return { changed, unreadCount: unreadCount(user) };
}

function markAllRead(user, filters = {}) {
  const items = listNotificationsForUser(user, filters);
  return markRead(user, items.map((item) => item.id));
}

function selectUsers(target = {}) {
  ensureNotificationData();
  const mode = target.mode || "all";
  if (mode === "member" && target.userId) return db.users.filter((user) => Number(user.id) === Number(target.userId));
  if (mode === "level" && target.level) return db.users.filter((user) => String(user.level || "").includes(String(target.level)));
  if (mode === "active") {
    const activeIds = new Set([
      ...db.orders.map((item) => item.userId),
      ...db.reservations.map((item) => item.userId),
      ...db.activityApplications.map((item) => item.userId),
      ...db.userBrowseHistory.map((item) => item.userId)
    ].map(Number).filter(Boolean));
    return db.users.filter((user) => activeIds.has(Number(user.id)));
  }
  return db.users;
}

function sendNotification(payload = {}, admin = null) {
  const users = selectUsers(payload.target || { mode: payload.targetMode || "all", level: payload.level, userId: payload.userId });
  const records = users.map((user) => createNotification({
    user,
    type: payload.type || "system",
    title: payload.title,
    content: payload.content,
    link: payload.link || "/notifications",
    priority: payload.priority || "normal",
    source: admin ? `admin:${admin.id}` : "admin",
    triggerType: "manual_push",
    triggerData: { target: payload.target || payload.targetMode || "all" }
  }));
  return { count: records.length, records };
}

function notificationStats() {
  ensureNotificationData();
  const total = db.notificationRecords.length;
  const read = db.notificationRecords.filter((item) => item.isRead).length;
  const clicks = db.notificationRecords.reduce((sum, item) => sum + Number(item.clickCount || 0), 0);
  const byType = Object.values(db.notificationRecords.reduce((map, item) => {
    const key = item.category || item.type || "system";
    map[key] = map[key] || { type: key, sent: 0, read: 0, clicks: 0 };
    map[key].sent += 1;
    if (item.isRead) map[key].read += 1;
    map[key].clicks += Number(item.clickCount || 0);
    return map;
  }, {})).map((item) => ({
    ...item,
    readRate: item.sent ? Number(((item.read / item.sent) * 100).toFixed(1)) : 0,
    clickRate: item.sent ? Number(((item.clicks / item.sent) * 100).toFixed(1)) : 0,
    conversionRate: item.sent ? Number(((item.read / item.sent) * 100).toFixed(1)) : 0
  }));
  return {
    total,
    read,
    unread: total - read,
    readRate: total ? Number(((read / total) * 100).toFixed(1)) : 0,
    clickRate: total ? Number(((clicks / total) * 100).toFixed(1)) : 0,
    conversionRate: total ? Number(((read / total) * 100).toFixed(1)) : 0,
    byType
  };
}

function upsertAnnouncement(payload = {}) {
  ensureNotificationData();
  const id = Number(payload.id || 0);
  const existing = db.announcements.find((item) => item.id === id);
  const data = {
    id: existing?.id || nextId(db.announcements),
    title: String(payload.title || existing?.title || "").trim(),
    content: String(payload.content || existing?.content || "").trim(),
    link: payload.link || existing?.link || "/notifications",
    pinned: payload.pinned === undefined
      ? Boolean(existing?.pinned)
      : payload.pinned === true || payload.pinned === "true" || payload.pinned === 1 || payload.pinned === "1",
    status: payload.status || existing?.status || "published",
    createdAt: existing?.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  if (!data.title || !data.content) throw new Error("公告标题和内容必填");
  if (existing) Object.assign(existing, data);
  else db.announcements.unshift(data);
  if (data.status === "published" && !existing) {
    createNotification({
      userId: 0,
      type: "announcement",
      title: data.title,
      content: data.content,
      link: data.link,
      priority: data.pinned ? "high" : "normal",
      source: "announcement",
      triggerType: "announcement_publish",
      triggerData: { announcementId: data.id }
    });
  }
  return data;
}

function deleteAnnouncement(id) {
  const before = db.announcements.length;
  db.announcements = db.announcements.filter((item) => Number(item.id) !== Number(id));
  return before !== db.announcements.length;
}

module.exports = {
  TYPE_META,
  createNotification,
  deleteAnnouncement,
  ensureNotificationData,
  listNotificationsForUser,
  markAllRead,
  markRead,
  notificationStats,
  sendNotification,
  unreadCount,
  upsertAnnouncement
};
