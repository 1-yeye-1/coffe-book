const { ok, fail } = require("./shared/response");
const { parseBody } = require("./shared/request-body");
const { db } = require("./shared/data");
const { clearLoginFailures, currentAdmin, loginAllowed, recordLoginFailure, sign } = require("./shared/auth");
const { hashPassword, needsUpgrade, verifyPassword } = require("./shared/password");
const {
  deleteBook,
  deleteActivity,
  deleteComment,
  deleteNotice,
  deleteOrder,
  deletePost,
  deleteProduct,
  deleteReservation,
  deleteUser,
  persistBook,
  persistActivity,
  persistComment,
  persistOrder,
  persistAdmin,
  persistNotice,
  persistPost,
  persistProduct,
  persistReservation,
  persistUser
} = require("./shared/mysql");
const { adminSummary } = require("./modules/admin-summary");
const {
  couponStats,
  createCoupon,
  ensureCommercialData,
  memberLevelDistribution,
  upsertMemberLevel
} = require("./modules/commercial");
const {
  ensureEngagementData,
  upsertBadge,
  upsertTaskRule
} = require("./modules/engagement");
const {
  activityFunnelAnalysis,
  funnels: businessFunnels,
  memberLevelAnalysis,
  memberAnalytics,
  overview: businessOverview,
  productRepeatAnalysis,
  recommendationAnalytics,
  trends: businessTrends,
  userSegmentationAnalysis
} = require("./modules/business");
const { findSeatConflicts } = require("./modules/reservations");
const { restoreOrderStock } = require("./modules/orders");
const {
  adminPaymentRows,
  confirmOrderPayment,
  confirmPayment,
  findPaymentById,
  rejectOrderPayment,
  rejectPayment
} = require("./modules/payments");
const {
  deleteAnnouncement,
  ensureNotificationData,
  notificationStats,
  sendNotification,
  upsertAnnouncement
} = require("./modules/notifications");
const { auditActivity } = require("./shared/audit");
const { nextId, validBirthday, validDateString, validEmail, validEnum, validNonNegativeInteger, validNonNegativeNumber, validPeople, validPhone, validTextLength, validTimeLabel } = require("./shared/validators");

function findById(items, url) {
  return items.find((item) => item.id === Number(url.pathname.split("/").pop()));
}

const ORDER_STATUS_VALUES = ["pending_payment", "payment_review", "paid", "cancelled", "completed", "待支付", "支付审核中", "已支付", "已取消", "已完成"];
const PAYMENT_METHOD_VALUES = ["", "wechat", "alipay", "mock", "微信支付", "支付宝", "模拟支付", "线上支付", "smoke-test"];
const ACTIVITY_STATUS_VALUES = ["draft", "open", "closed"];

async function handleAdminApi(req, res, url) {
  const method = req.method;
  const body = await parseBody(req);

  if (method === "POST" && url.pathname === "/api/admin/login") {
    const attemptKey = `admin:${String(body.account || "").trim()}`;
    if (!loginAllowed(attemptKey)) return fail(res, 429, "登录失败次数过多，请稍后再试");
    const admin = db.admins.find((item) => item.account === body.account);
    if (!admin || !verifyPassword(body.password, admin.password)) {
      recordLoginFailure(attemptKey);
      return fail(res, 401, "后台账号或密码错误");
    }
    clearLoginFailures(attemptKey);
    if (needsUpgrade(admin.password)) {
      admin.password = hashPassword(body.password);
      await persistAdmin(admin);
    }
    return ok(res, { user: { id: admin.id, name: admin.name, account: admin.account, role: admin.role }, token: sign({ id: admin.id, type: "admin" }) }, "后台登录成功");
  }

  const admin = currentAdmin(req);
  if (!admin) return fail(res, 401, "管理员登录已失效，请重新登录");
  const auditAdmin = (action, targetType, targetId, detail) => auditActivity(action, {
    actorType: "admin",
    actorId: admin.id,
    actorName: admin.name,
    targetType,
    targetId,
    detail
  });
  if (method === "GET" && url.pathname === "/api/admin/summary") return ok(res, await adminSummary());
  if (method === "GET" && url.pathname === "/api/admin/business/overview") return ok(res, businessOverview());
  if (method === "GET" && url.pathname === "/api/admin/business/trends") return ok(res, businessTrends(Number(url.searchParams.get("days") || 14)));
  if (method === "GET" && url.pathname === "/api/admin/business/funnel") return ok(res, businessFunnels());
  if (method === "GET" && url.pathname === "/api/admin/business/members") return ok(res, memberAnalytics());
  if (method === "GET" && url.pathname === "/api/admin/business/recommendations") return ok(res, recommendationAnalytics());
  if (method === "GET" && url.pathname === "/api/admin/business/activity-funnel") return ok(res, activityFunnelAnalysis());
  if (method === "GET" && url.pathname === "/api/admin/business/user-segmentation") return ok(res, userSegmentationAnalysis());
  if (method === "GET" && url.pathname === "/api/admin/business/product-repeat") return ok(res, productRepeatAnalysis());
  if (method === "GET" && url.pathname === "/api/admin/business/member-analysis") return ok(res, memberLevelAnalysis());
  if (method === "GET" && url.pathname === "/api/admin/notifications") {
    ensureNotificationData();
    return ok(res, { items: db.notificationRecords, announcements: db.announcements || [], stats: notificationStats() });
  }
  if (method === "GET" && url.pathname === "/api/admin/notifications/stats") {
    ensureNotificationData();
    return ok(res, notificationStats());
  }
  if (method === "POST" && url.pathname === "/api/admin/notifications") {
    try {
      const result = sendNotification(body, admin);
      await auditAdmin("手动推送消息", "notification", 0, `手动推送 ${result.count} 条消息`);
      return ok(res, result, "消息已推送");
    } catch (error) {
      return fail(res, 400, error.message);
    }
  }
  if (method === "POST" && url.pathname === "/api/admin/announcements") {
    try {
      const announcement = upsertAnnouncement(body);
      await auditAdmin("发布系统公告", "announcement", announcement.id, `发布公告 ${announcement.title}`);
      return ok(res, announcement, "公告已发布");
    } catch (error) {
      return fail(res, 400, error.message);
    }
  }
  if (method === "PUT" && url.pathname.match(/^\/api\/admin\/announcements\/\d+$/)) {
    try {
      const announcement = upsertAnnouncement({ ...body, id: Number(url.pathname.split("/").pop()) });
      await auditAdmin("编辑系统公告", "announcement", announcement.id, `编辑公告 ${announcement.title}`);
      return ok(res, announcement, "公告已更新");
    } catch (error) {
      return fail(res, 400, error.message);
    }
  }
  if (method === "DELETE" && url.pathname.match(/^\/api\/admin\/announcements\/\d+$/)) {
    const id = Number(url.pathname.split("/").pop());
    if (!deleteAnnouncement(id)) return fail(res, 404, "公告不存在");
    await auditAdmin("删除系统公告", "announcement", id, `删除公告 #${id}`);
    return ok(res, { id }, "公告已删除");
  }
  if (method === "GET" && url.pathname === "/api/admin/member-levels") {
    ensureCommercialData();
    return ok(res, { items: db.memberLevels, distribution: memberLevelDistribution() });
  }
  if (method === "POST" && url.pathname === "/api/admin/member-levels") {
    try {
      const level = upsertMemberLevel(body);
      await auditAdmin("保存会员等级", "member_level", level.code, `保存会员等级 ${level.name}`);
      return ok(res, level, "会员等级已保存");
    } catch (error) {
      return fail(res, 400, error.message);
    }
  }
  if (method === "GET" && url.pathname === "/api/admin/coupons") {
    ensureCommercialData();
    return ok(res, { items: couponStats(), userCoupons: db.userCoupons });
  }
  if (method === "POST" && url.pathname === "/api/admin/coupons") {
    try {
      const coupon = createCoupon(body);
      await auditAdmin("新增优惠券", "coupon", coupon.id, `新增优惠券 ${coupon.name}`);
      return ok(res, coupon, "优惠券已创建");
    } catch (error) {
      return fail(res, 400, error.message);
    }
  }
  if (method === "GET" && url.pathname === "/api/admin/tasks") {
    ensureEngagementData();
    return ok(res, { items: db.taskRules, userTasks: db.userTasks });
  }
  if (method === "POST" && url.pathname === "/api/admin/tasks") {
    try {
      const task = upsertTaskRule(body);
      await auditAdmin("保存任务规则", "task_rule", task.id, `保存任务规则 ${task.title}`);
      return ok(res, task, "任务规则已保存");
    } catch (error) {
      return fail(res, 400, error.message);
    }
  }
  if (method === "GET" && url.pathname === "/api/admin/badges") {
    ensureEngagementData();
    return ok(res, { items: db.badges, userBadges: db.userBadges });
  }
  if (method === "POST" && url.pathname === "/api/admin/badges") {
    try {
      const badge = upsertBadge(body);
      await auditAdmin("保存勋章", "badge", badge.id, `保存勋章 ${badge.name}`);
      return ok(res, badge, "勋章已保存");
    } catch (error) {
      return fail(res, 400, error.message);
    }
  }
  if (method === "GET" && url.pathname === "/api/admin/invites") {
    ensureEngagementData();
    const items = db.inviteRecords.map((item) => ({
      ...item,
      inviterName: db.users.find((user) => user.id === item.inviterUserId)?.name || "",
      inviteeName: db.users.find((user) => user.id === item.inviteeUserId)?.name || ""
    }));
    return ok(res, { items, total: items.length, converted: items.filter((item) => item.status !== "pending").length });
  }
  if (method === "GET" && url.pathname === "/api/admin/payments") {
    return ok(res, adminPaymentRows(url.searchParams.get("status") || "submitted"));
  }
  if (method === "POST" && url.pathname.match(/^\/api\/admin\/payments\/\d+\/confirm$/)) {
    const paymentId = Number(url.pathname.split("/")[4]);
    const payment = findPaymentById(paymentId);
    if (!payment) return fail(res, 404, "支付记录不存在");
    const order = db.orders.find((item) => item.id === payment.orderId);
    if (!order) return fail(res, 404, "订单不存在");
    try {
      await confirmPayment(payment, order, admin.id);
      await auditAdmin("确认收款", "payment", payment.id, `订单 #${order.id} 已确认收款`);
      return ok(res, { payment, order }, "确认收款成功");
    } catch (error) {
      return fail(res, 409, error.message);
    }
  }
  if (method === "POST" && url.pathname.match(/^\/api\/admin\/payments\/\d+\/reject$/)) {
    const paymentId = Number(url.pathname.split("/")[4]);
    const payment = findPaymentById(paymentId);
    if (!payment) return fail(res, 404, "支付记录不存在");
    const order = db.orders.find((item) => item.id === payment.orderId);
    if (!order) return fail(res, 404, "订单不存在");
    try {
      await rejectPayment(payment, order, admin.id, body.orderStatus || "pending_payment");
      await auditAdmin("驳回收款", "payment", payment.id, `订单 #${order.id} 支付审核已驳回`);
      return ok(res, { payment, order }, "支付审核已驳回");
    } catch (error) {
      return fail(res, 409, error.message);
    }
  }
  if (method === "GET" && url.pathname === "/api/admin/realtime") {
    const pageSize = Math.min(30, Math.max(1, Number(url.searchParams.get("pageSize") || 10)));
    const total = db.realtime.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(pages, Math.max(1, Number(url.searchParams.get("page") || 1)));
    return ok(res, { items: db.realtime.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize, pages });
  }
  if (method === "GET" && url.pathname.match(/^\/api\/admin\/realtime\/\d+$/)) {
    const log = db.realtime.find((item) => item.id === Number(url.pathname.split("/").pop()));
    return log ? ok(res, log) : fail(res, 404, "日志不存在");
  }

  if (method === "POST" && url.pathname === "/api/admin/books") {
    if (!body.title || !body.author || !body.summary) return fail(res, 400, "书名、作者和简介必填");
    const book = {
      id: nextId(db.books),
      title: body.title,
      author: body.author,
      category: body.category || "文学",
      ranking: body.ranking || "",
      summary: body.summary,
      publisher: body.publisher || "",
      publishedAt: body.publishedAt || new Date().toISOString().slice(0, 19).replace("T", " "),
      image: body.image || "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=900&q=80"
    };
    db.books.push(book);
    await persistBook(book);
    await auditAdmin("新增书籍", "book", book.id, `新增书籍《${book.title}》`);
    return ok(res, book, "书籍已新增");
  }

  if (method === "PATCH" && url.pathname.match(/^\/api\/admin\/books\/\d+$/)) {
    const book = findById(db.books, url);
    if (!book) return fail(res, 404, "书籍不存在");
    Object.assign(book, {
      title: body.title || book.title,
      author: body.author || book.author,
      category: body.category || book.category,
      ranking: body.ranking ?? book.ranking,
      summary: body.summary || book.summary,
      publisher: body.publisher ?? book.publisher,
      publishedAt: body.publishedAt || book.publishedAt,
      image: body.image || book.image
    });
    await persistBook(book);
    await auditAdmin("更新书籍", "book", book.id, `更新书籍《${book.title}》`);
    return ok(res, book, "书籍已更新");
  }

  if (method === "DELETE" && url.pathname.match(/^\/api\/admin\/books\/\d+$/)) {
    const book = findById(db.books, url);
    if (!book) return fail(res, 404, "书籍不存在");
    db.books = db.books.filter((item) => item.id !== book.id);
    await deleteBook(book.id);
    await auditAdmin("删除书籍", "book", book.id, `删除书籍《${book.title}》`);
    return ok(res, null, "书籍已删除");
  }

  if (method === "POST" && url.pathname === "/api/admin/users") {
    const points = Number(body.points || 0);
    if (!body.name || !body.phone) return fail(res, 400, "昵称和手机号必填");
    if (!validPhone(body.phone)) return fail(res, 400, "请输入正确的 11 位手机号");
    if (!validEmail(body.email)) return fail(res, 400, "请输入正确的邮箱地址");
    if (!validBirthday(body.birthday)) return fail(res, 400, "生日必须是有效且不晚于今天的日期");
    if (!validNonNegativeInteger(points)) return fail(res, 400, "积分必须是大于或等于 0 的整数");
    if (db.users.some((item) => item.phone === body.phone)) return fail(res, 409, "手机号已存在");
    const user = {
      id: nextId(db.users),
      name: body.name,
      phone: body.phone,
      password: hashPassword(body.password || "coffee123"),
      role: "member",
      level: body.level || "普通会员",
      points,
      avatar: "",
      email: body.email || "",
      birthday: body.birthday || "",
      bio: body.bio || "",
      coffeePreference: body.coffeePreference || "",
      bookPreference: body.bookPreference || "",
      address: body.address || "",
      levelProgress: Number(body.levelProgress || 0),
      lastCheckIn: "",
      favorites: [],
      notes: [],
      notifications: [],
      gifts: []
    };
    db.users.push(user);
    await persistUser(user);
    await auditAdmin("新增用户", "user", user.id, `新增用户 #${user.id} ${user.name}`);
    return ok(res, user, "用户已新增");
  }

  if (method === "PATCH" && url.pathname.match(/^\/api\/admin\/users\/\d+$/)) {
    const user = findById(db.users, url);
    if (!user) return fail(res, 404, "用户不存在");
    const phone = body.phone || user.phone;
    const email = body.email ?? user.email;
    const birthday = body.birthday ?? user.birthday;
    const points = Number(body.points ?? user.points);
    if (!validPhone(phone)) return fail(res, 400, "请输入正确的 11 位手机号");
    if (!validEmail(email)) return fail(res, 400, "请输入正确的邮箱地址");
    if (!validBirthday(birthday)) return fail(res, 400, "生日必须是有效且不晚于今天的日期");
    if (!validNonNegativeInteger(points)) return fail(res, 400, "积分必须是大于或等于 0 的整数");
    if (db.users.some((item) => item.id !== user.id && item.phone === phone)) return fail(res, 409, "手机号已存在");
    Object.assign(user, {
      name: body.name || user.name,
      phone,
      email,
      birthday,
      level: body.level || user.level,
      points,
      bio: body.bio ?? user.bio,
      coffeePreference: body.coffeePreference ?? user.coffeePreference,
      bookPreference: body.bookPreference ?? user.bookPreference,
      address: body.address ?? user.address
    });
    await persistUser(user);
    await auditAdmin("更新用户", "user", user.id, `更新用户 #${user.id} ${user.name}`);
    return ok(res, user, "用户已更新");
  }

  if (method === "DELETE" && url.pathname.match(/^\/api\/admin\/users\/\d+$/)) {
    const user = findById(db.users, url);
    if (!user) return fail(res, 404, "用户不存在");
    db.users = db.users.filter((item) => item.id !== user.id);
    await deleteUser(user.id);
    await auditAdmin("删除用户", "user", user.id, `删除用户 #${user.id} ${user.name}`);
    return ok(res, null, "用户已删除");
  }

  if (method === "POST" && url.pathname === "/api/admin/products") {
    const price = Number(body.price || 0);
    const stock = Number(body.stock || 0);
    if (!body.name) return fail(res, 400, "商品名称必填");
    if (!validNonNegativeNumber(price)) return fail(res, 400, "商品价格必须大于或等于 0");
    if (!validNonNegativeInteger(stock)) return fail(res, 400, "商品库存必须是大于或等于 0 的整数");
    const product = {
      id: nextId(db.products),
      name: body.name,
      description: body.description || "暂无描述",
      price,
      stock,
      category: body.category || "creative",
      image: body.image || "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=900&q=80"
    };
    db.products.push(product);
    await persistProduct(product);
    await auditAdmin("新增商品", "product", product.id, `新增商品 #${product.id} ${product.name}`);
    return ok(res, product, "商品已新增");
  }

  if (method === "PATCH" && url.pathname.match(/^\/api\/admin\/products\/\d+$/)) {
    const product = findById(db.products, url);
    if (!product) return fail(res, 404, "商品不存在");
    const price = Number(body.price ?? product.price);
    const stock = Number(body.stock ?? product.stock);
    if (!validNonNegativeNumber(price)) return fail(res, 400, "商品价格必须大于或等于 0");
    if (!validNonNegativeInteger(stock)) return fail(res, 400, "商品库存必须是大于或等于 0 的整数");
    Object.assign(product, {
      name: body.name || product.name,
      description: body.description || product.description,
      price,
      stock,
      category: body.category || product.category,
      image: body.image ?? product.image
    });
    await persistProduct(product);
    await auditAdmin("更新商品", "product", product.id, `更新商品 #${product.id} ${product.name}`);
    return ok(res, product, "商品已更新");
  }

  if (method === "DELETE" && url.pathname.match(/^\/api\/admin\/products\/\d+$/)) {
    const product = findById(db.products, url);
    if (!product) return fail(res, 404, "商品不存在");
    db.products = db.products.filter((item) => item.id !== product.id);
    await deleteProduct(product.id);
    await auditAdmin("删除商品", "product", product.id, `删除商品 #${product.id} ${product.name}`);
    return ok(res, null, "商品已删除");
  }

  if (method === "POST" && url.pathname === "/api/admin/orders") {
    const total = Number(body.total || 0);
    if (!validNonNegativeNumber(total)) return fail(res, 400, "订单金额必须大于或等于 0");
    if (!validEnum(body.status || "pending_payment", ORDER_STATUS_VALUES)) return fail(res, 400, "订单状态不正确");
    if (!validEnum(body.paymentMethod || "", PAYMENT_METHOD_VALUES)) return fail(res, 400, "支付方式不正确");
    const order = {
      id: nextId(db.orders),
      userId: body.userId ? Number(body.userId) : 0,
      userName: body.userName || "线下用户",
      receiver: body.receiver || body.userName || "线下用户",
      phone: body.phone || "",
      address: body.address || "",
      items: Array.isArray(body.items) ? body.items : [],
      total,
      status: body.status || "pending_payment",
      paymentMethod: body.paymentMethod || "",
      paidAt: "",
      cancelledAt: "",
      paymentReviewStatus: "not_submitted",
      paymentSubmittedAt: "",
      paymentReviewedAt: "",
      paymentReviewedBy: 0,
      earnedPoints: 0,
      earnedProgress: 0,
      createdAt: new Date().toISOString()
    };
    db.orders.push(order);
    await persistOrder(order);
    await auditAdmin("新增订单", "order", order.id, `新增订单 #${order.id}`);
    return ok(res, order, "订单已新增");
  }

  if (method === "PATCH" && url.pathname.match(/^\/api\/admin\/orders\/\d+$/)) {
    const order = findById(db.orders, url);
    if (!order) return fail(res, 404, "订单不存在");
    const total = Number(body.total ?? order.total);
    if (!validNonNegativeNumber(total)) return fail(res, 400, "订单金额必须大于或等于 0");
    if (!validEnum(body.status || order.status, ORDER_STATUS_VALUES)) return fail(res, 400, "订单状态不正确");
    if (!validEnum(body.paymentMethod ?? order.paymentMethod ?? "", PAYMENT_METHOD_VALUES)) return fail(res, 400, "支付方式不正确");
    const nextStatus = body.status || order.status;
    const nextPaidAt = nextStatus === "paid" && !order.paidAt ? new Date().toISOString() : (body.paidAt ?? order.paidAt);
    const nextCancelledAt = nextStatus === "cancelled" && !order.cancelledAt ? new Date().toISOString() : order.cancelledAt;
    if (nextStatus === "cancelled" && order.status !== "cancelled") await restoreOrderStock(order);
    Object.assign(order, {
      userName: body.userName || order.userName,
      total,
      status: nextStatus,
      paymentMethod: body.paymentMethod ?? order.paymentMethod,
      paidAt: nextPaidAt,
      cancelledAt: nextCancelledAt
    });
    await persistOrder(order);
    await auditAdmin("更新订单", "order", order.id, `更新订单 #${order.id}，状态：${order.status}`);
    return ok(res, order, "订单已更新");
  }

  if (method === "PATCH" && url.pathname.match(/^\/api\/admin\/orders\/\d+\/payment-review$/)) {
    const orderId = Number(url.pathname.split("/")[4]);
    const order = db.orders.find((item) => item.id === orderId);
    if (!order) return fail(res, 404, "订单不存在");
    if (!["approved", "rejected"].includes(body.status)) return fail(res, 400, "审核状态不正确");
    if (order.paymentReviewStatus !== "pending") {
      return fail(res, 409, order.paymentReviewStatus === "approved" ? "该订单已审核通过" : "该订单当前没有待审核付款");
    }

    if (body.status === "approved") await confirmOrderPayment(order, admin.id);
    else await rejectOrderPayment(order, admin.id, "pending_payment");
    await auditAdmin(body.status === "approved" ? "通过付款审核" : "驳回付款审核", "order", order.id, `订单 #${order.id} 付款审核${body.status === "approved" ? "通过" : "驳回"}`);
    return ok(res, order, body.status === "approved" ? "付款审核已通过" : "付款审核已驳回");
  }

  if (method === "DELETE" && url.pathname.match(/^\/api\/admin\/orders\/\d+$/)) {
    const order = findById(db.orders, url);
    if (!order) return fail(res, 404, "订单不存在");
    db.orders = db.orders.filter((item) => item.id !== order.id);
    await deleteOrder(order.id);
    await auditAdmin("删除订单", "order", order.id, `删除订单 #${order.id}`);
    return ok(res, null, "订单已删除");
  }

  if (method === "POST" && url.pathname === "/api/admin/reservations") {
    if (!body.seatId || !body.date || !body.time) return fail(res, 400, "座位、日期和时间必填");
    if (!validPhone(body.phone)) return fail(res, 400, "请输入正确的 11 位手机号");
    if (!validPeople(body.people || 1)) return fail(res, 400, "预约人数必须是 1 到 20 之间的整数");
    if (!validDateString(body.date, { allowPast: true })) return fail(res, 400, "预约日期格式不正确");
    if (!validTimeLabel(body.time)) return fail(res, 400, "预约时间格式不正确");
    if (!/^[A-C][1-6](,[A-C][1-6])*$/.test(String(body.seatId || ""))) return fail(res, 400, "座位编号不正确");
    if (!validTextLength(body.note || "", 0, 120)) return fail(res, 400, "预约备注不能超过 120 个字符");
    if (String(body.status || "已预约") !== "已取消" && findSeatConflicts({ seatIds: body.seatId, date: body.date, time: body.time }).length) {
      return fail(res, 409, "所选座位在该时段已被预约");
    }
    const reservation = {
      id: nextId(db.reservations),
      userId: Number(body.userId || 0),
      phone: body.phone || "",
      seatId: body.seatId,
      date: body.date,
      time: body.time,
      people: String(body.people || 1),
      purpose: body.purpose || "后台预约",
      note: body.note || "",
      status: body.status || "已预约"
    };
    db.reservations.push(reservation);
    await persistReservation(reservation);
    await auditAdmin("新增预约", "reservation", reservation.id, `新增预约 #${reservation.id}，座位：${reservation.seatId}`);
    return ok(res, reservation, "预约已新增");
  }

  if (method === "PATCH" && url.pathname.match(/^\/api\/admin\/reservations\/\d+$/)) {
    const reservation = findById(db.reservations, url);
    if (!reservation) return fail(res, 404, "预约不存在");
    const phone = body.phone || reservation.phone;
    const people = body.people || reservation.people;
    if (!validPhone(phone)) return fail(res, 400, "请输入正确的 11 位手机号");
    if (!validPeople(people)) return fail(res, 400, "预约人数必须是 1 到 20 之间的整数");
    if (!validDateString(body.date || reservation.date, { allowPast: true })) return fail(res, 400, "预约日期格式不正确");
    if (!validTimeLabel(body.time || reservation.time)) return fail(res, 400, "预约时间格式不正确");
    if (!/^[A-C][1-6](,[A-C][1-6])*$/.test(String(body.seatId || reservation.seatId || ""))) return fail(res, 400, "座位编号不正确");
    if (!validTextLength(body.note ?? reservation.note ?? "", 0, 120)) return fail(res, 400, "预约备注不能超过 120 个字符");
    if (String(body.status || reservation.status) !== "已取消" && findSeatConflicts({
      seatIds: body.seatId || reservation.seatId,
      date: body.date || reservation.date,
      time: body.time || reservation.time,
      ignoreId: reservation.id
    }).length) {
      return fail(res, 409, "所选座位在该时段已被其他预约占用");
    }
    Object.assign(reservation, {
      seatId: body.seatId || reservation.seatId,
      phone,
      date: body.date || reservation.date,
      time: body.time || reservation.time,
      people: String(people),
      purpose: body.purpose || reservation.purpose,
      note: body.note ?? reservation.note,
      status: body.status || reservation.status
    });
    await persistReservation(reservation);
    await auditAdmin("更新预约", "reservation", reservation.id, `更新预约 #${reservation.id}，状态：${reservation.status}`);
    return ok(res, reservation, "预约已更新");
  }

  if (method === "DELETE" && url.pathname.match(/^\/api\/admin\/reservations\/\d+$/)) {
    const reservation = findById(db.reservations, url);
    if (!reservation) return fail(res, 404, "预约不存在");
    db.reservations = db.reservations.filter((item) => item.id !== reservation.id);
    await deleteReservation(reservation.id);
    await auditAdmin("删除预约", "reservation", reservation.id, `删除预约 #${reservation.id}`);
    return ok(res, null, "预约已删除");
  }

  if (method === "POST" && url.pathname === "/api/admin/activities") {
    const capacity = Number(body.capacity);
    if (!body.title || !body.date || !body.description) return fail(res, 400, "活动名称、日期和介绍必填");
    if (!Number.isInteger(capacity) || capacity < 1) return fail(res, 400, "活动名额必须是正整数");
    if (!validTextLength(body.title, 2, 80)) return fail(res, 400, "活动名称需为 2 到 80 个字符");
    if (!validDateString(body.date, { allowPast: true })) return fail(res, 400, "活动日期格式不正确");
    if (body.time && !validTimeLabel(body.time)) return fail(res, 400, "活动时间格式不正确");
    if (!validTextLength(body.description, 2, 1000)) return fail(res, 400, "活动介绍需为 2 到 1000 个字符");
    if (!validEnum(body.status || "open", ACTIVITY_STATUS_VALUES)) return fail(res, 400, "活动状态不正确");
    const activity = {
      id: nextId(db.activities),
      title: body.title,
      capacity,
      applied: 0,
      date: body.date,
      time: body.time || "",
      registrationStart: body.registrationStart || "",
      earlyStart: body.earlyStart || "",
      location: body.location || "",
      status: body.status || "open",
      description: body.description
    };
    db.activities.push(activity);
    await persistActivity(activity);
    await auditAdmin("新增活动", "activity", activity.id, `新增活动《${activity.title}》`);
    return ok(res, activity, "活动已新增");
  }

  if (method === "PATCH" && url.pathname.match(/^\/api\/admin\/activities\/\d+$/)) {
    const activity = findById(db.activities, url);
    if (!activity) return fail(res, 404, "活动不存在");
    const capacity = Number(body.capacity ?? activity.capacity);
    if (!Number.isInteger(capacity) || capacity < 1) return fail(res, 400, "活动名额必须是正整数");
    if (capacity < activity.applied) return fail(res, 400, "活动名额不能少于当前报名人数");
    if (!validTextLength(body.title || activity.title, 2, 80)) return fail(res, 400, "活动名称需为 2 到 80 个字符");
    if (!validDateString(body.date || activity.date, { allowPast: true })) return fail(res, 400, "活动日期格式不正确");
    if ((body.time ?? activity.time) && !validTimeLabel(body.time ?? activity.time)) return fail(res, 400, "活动时间格式不正确");
    if (!validTextLength(body.description || activity.description, 2, 1000)) return fail(res, 400, "活动介绍需为 2 到 1000 个字符");
    if (!validEnum(body.status || activity.status || "open", ACTIVITY_STATUS_VALUES)) return fail(res, 400, "活动状态不正确");
    Object.assign(activity, {
      title: body.title || activity.title,
      capacity,
      date: body.date || activity.date,
      time: body.time ?? activity.time,
      registrationStart: body.registrationStart ?? activity.registrationStart,
      earlyStart: body.earlyStart ?? activity.earlyStart,
      location: body.location ?? activity.location,
      status: body.status || activity.status || "open",
      description: body.description || activity.description
    });
    await persistActivity(activity);
    await auditAdmin("更新活动", "activity", activity.id, `更新活动《${activity.title}》`);
    return ok(res, activity, "活动已更新");
  }

  if (method === "DELETE" && url.pathname.match(/^\/api\/admin\/activities\/\d+$/)) {
    const activity = findById(db.activities, url);
    if (!activity) return fail(res, 404, "活动不存在");
    db.activities = db.activities.filter((item) => item.id !== activity.id);
    db.activityApplications = db.activityApplications.filter((item) => item.activityId !== activity.id);
    await deleteActivity(activity.id);
    await auditAdmin("删除活动", "activity", activity.id, `删除活动《${activity.title}》`);
    return ok(res, null, "活动已删除");
  }

  if (method === "PATCH" && url.pathname.match(/^\/api\/admin\/posts\/\d+$/)) {
    const post = findById(db.posts, url);
    if (!post) return fail(res, 404, "动态不存在");
    if (!validTextLength(body.title || post.title, 2, 80) || !validTextLength(body.content || post.content, 2, 2000)) return fail(res, 400, "动态标题或内容长度不正确");
    Object.assign(post, { title: body.title || post.title, content: body.content || post.content });
    await persistPost(post);
    await auditAdmin("更新社区动态", "post", post.id, `更新动态 #${post.id}《${post.title}》`);
    return ok(res, post, "动态已更新");
  }

  if (method === "POST" && url.pathname === "/api/admin/posts") {
    if (!validTextLength(body.title, 2, 80) || !validTextLength(body.content, 2, 2000)) return fail(res, 400, "标题和内容长度不正确");
    const post = { id: nextId(db.posts), userId: 0, author: body.author || "运营团队", avatar: "", title: body.title, content: body.content, image: "", likedBy: [], likes: 0, comments: [] };
    db.posts.unshift(post);
    await persistPost(post);
    await auditAdmin("新增社区动态", "post", post.id, `新增动态 #${post.id}《${post.title}》`);
    return ok(res, post, "内容已新增");
  }

  if (method === "DELETE" && url.pathname.match(/^\/api\/admin\/posts\/\d+$/)) {
    const post = findById(db.posts, url);
    if (!post) return fail(res, 404, "动态不存在");
    db.posts = db.posts.filter((item) => item.id !== post.id);
    await deletePost(post.id);
    await auditAdmin("删除社区动态", "post", post.id, `删除动态 #${post.id}《${post.title}》`);
    return ok(res, null, "动态已删除");
  }

  if (method === "PATCH" && url.pathname.match(/^\/api\/admin\/posts\/\d+\/comments\/\d+$/)) {
    const [, , , , postId, , commentId] = url.pathname.split("/");
    const post = db.posts.find((item) => item.id === Number(postId));
    const comment = post?.comments.find((item) => item.id === Number(commentId));
    if (!comment) return fail(res, 404, "评论不存在");
    if (!["approved", "rejected"].includes(body.status)) return fail(res, 400, "审核状态不正确");
    comment.status = body.status;
    await persistComment(post.id, comment);
    await auditAdmin(body.status === "approved" ? "通过评论审核" : "驳回评论审核", "comment", comment.id, `动态 #${post.id} 下的评论 #${comment.id} 已${body.status === "approved" ? "通过" : "驳回"}`);
    return ok(res, comment, body.status === "approved" ? "评论已通过审核" : "评论已驳回");
  }

  if (method === "DELETE" && url.pathname.match(/^\/api\/admin\/posts\/\d+\/comments\/\d+$/)) {
    const [, , , , postId, , commentId] = url.pathname.split("/");
    const post = db.posts.find((item) => item.id === Number(postId));
    const comment = post?.comments.find((item) => item.id === Number(commentId));
    if (!comment) return fail(res, 404, "评论不存在");
    post.comments = post.comments.filter((item) => item.id !== comment.id);
    await deleteComment(comment.id);
    await auditAdmin("删除评论", "comment", comment.id, `删除动态 #${post.id} 下的评论 #${comment.id}`);
    return ok(res, null, "评论已删除");
  }

  if (method === "POST" && url.pathname === "/api/admin/notices") {
    if (!body.title || !body.summary || !body.date) return fail(res, 400, "标题、摘要和日期必填");
    const notice = { id: nextId(db.notices), title: body.title, summary: body.summary, date: body.date };
    db.notices.unshift(notice);
    await persistNotice(notice);
    await auditAdmin("新增公告", "notice", notice.id, `新增公告《${notice.title}》`);
    return ok(res, notice, "公告已新增");
  }

  if (method === "PATCH" && url.pathname.match(/^\/api\/admin\/notices\/\d+$/)) {
    const notice = findById(db.notices, url);
    if (!notice) return fail(res, 404, "公告不存在");
    Object.assign(notice, { title: body.title || notice.title, summary: body.summary || notice.summary, date: body.date || notice.date });
    await persistNotice(notice);
    await auditAdmin("更新公告", "notice", notice.id, `更新公告《${notice.title}》`);
    return ok(res, notice, "公告已更新");
  }

  if (method === "DELETE" && url.pathname.match(/^\/api\/admin\/notices\/\d+$/)) {
    const notice = findById(db.notices, url);
    if (!notice) return fail(res, 404, "公告不存在");
    db.notices = db.notices.filter((item) => item.id !== notice.id);
    await deleteNotice(notice.id);
    await auditAdmin("删除公告", "notice", notice.id, `删除公告《${notice.title}》`);
    return ok(res, null, "公告已删除");
  }

  return fail(res, 404, "后台接口不存在");
}

module.exports = { handleAdminApi };
