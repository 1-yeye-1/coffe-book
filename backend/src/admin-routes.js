const { ok, fail } = require("./shared/response");
const { parseBody } = require("./shared/request-body");
const { dashboardData, db, incomeData, recordRealtime, today } = require("./shared/data");
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
  persistAuditLog,
  persistComment,
  persistOrder,
  persistAdmin,
  persistNotice,
  persistPost,
  persistProduct,
  persistReservation,
  persistUser
} = require("./shared/mysql");
const { getDatabaseOverview, reloadDatabase } = require("./shared/mysql");

function nextId(items) {
  return items.length ? Math.max(...items.map((item) => item.id)) + 1 : 1;
}

function findById(items, url) {
  return items.find((item) => item.id === Number(url.pathname.split("/").pop()));
}

function validPhone(phone) {
  return /^1[3-9]\d{9}$/.test(String(phone || "").trim());
}

function validEmail(email) {
  const value = String(email || "").trim();
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validBirthday(birthday) {
  const value = String(birthday || "").trim();
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day && value <= today();
}

async function auditActivity(action, options = {}) {
  const entry = recordRealtime(action, options);
  await persistAuditLog(entry);
  return entry;
}

function validNonNegativeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0;
}

function validNonNegativeInteger(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 0;
}

function validPeople(value) {
  const number = Number(value);
  return Number.isInteger(number) && number >= 1 && number <= 20;
}

const moduleTableMap = [
  { module: "用户管理", tables: ["users"], fields: "name, phone, email, birthday, level, points, profile_public" },
  { module: "商品管理", tables: ["products"], fields: "name, description, price, stock, category, image" },
  { module: "书籍管理", tables: ["books"], fields: "title, author, category, ranking, publisher, published_at" },
  { module: "订单管理", tables: ["orders", "order_items"], fields: "user_name, total, status, payment_method, payment_review_status, paid_at, items" },
  { module: "预约管理", tables: ["reservations"], fields: "phone, seat_id, date, time, people, purpose, note, status" },
  { module: "活动管理", tables: ["activities", "activity_applications"], fields: "title, capacity, applied, registration_start, early_start, applications" },
  { module: "社区审核", tables: ["posts", "comments"], fields: "author, title, content, likes, comments.status" },
  { module: "内容管理", tables: ["notices"], fields: "title, summary, date" },
  { module: "购物车记录", tables: ["carts"], fields: "user_key, product_id, quantity, created_at" },
  { module: "实时日志", tables: ["audit_logs"], fields: "actor_type, actor_id, actor_name, action, target_type, target_id, detail, created_at" }
];

async function adminSummary() {
  await reloadDatabase();
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
    reservations: db.reservations,
    activities: db.activities,
    activityApplications: db.activityApplications,
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
    dashboard: dashboardData()
  };
}

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
    const order = {
      id: nextId(db.orders),
      userId: body.userId ? Number(body.userId) : 0,
      userName: body.userName || "线下用户",
      receiver: body.receiver || body.userName || "线下用户",
      phone: body.phone || "",
      address: body.address || "",
      items: Array.isArray(body.items) ? body.items : [],
      total: Number(body.total || 0),
      status: body.status || "待支付",
      paymentMethod: body.paymentMethod || "",
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
    Object.assign(order, {
      userName: body.userName || order.userName,
      total: Number(body.total ?? order.total),
      status: body.status || order.status,
      paymentMethod: body.paymentMethod ?? order.paymentMethod,
      paidAt: body.paidAt ?? order.paidAt
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

    order.paymentReviewStatus = body.status;
    order.paymentReviewedAt = new Date().toISOString();
    order.paymentReviewedBy = admin.id;

    if (body.status === "approved") {
      order.status = "已支付";
      order.paidAt = order.paymentReviewedAt;
      const user = db.users.find((item) => item.id === order.userId);
      if (user) {
        order.earnedPoints = Math.max(1, Math.floor(order.total));
        order.earnedProgress = Math.max(1, Math.ceil(order.total * 0.5));
        user.points = Number(user.points || 0) + order.earnedPoints;
        user.levelProgress = Number(user.levelProgress || 0) + order.earnedProgress;
        user.notifications = [`订单 #${order.id} 付款审核已通过，获得 ${order.earnedPoints} 积分和 ${order.earnedProgress} 等级度`, ...(user.notifications || [])].slice(0, 30);
        await persistUser(user);
      }
    } else {
      order.status = "待支付";
      order.paidAt = "";
    }

    await persistOrder(order);
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
    Object.assign(activity, {
      title: body.title || activity.title,
      capacity,
      date: body.date || activity.date,
      time: body.time ?? activity.time,
      registrationStart: body.registrationStart ?? activity.registrationStart,
      earlyStart: body.earlyStart ?? activity.earlyStart,
      location: body.location ?? activity.location,
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
    Object.assign(post, { title: body.title || post.title, content: body.content || post.content });
    await persistPost(post);
    await auditAdmin("更新社区动态", "post", post.id, `更新动态 #${post.id}《${post.title}》`);
    return ok(res, post, "动态已更新");
  }

  if (method === "POST" && url.pathname === "/api/admin/posts") {
    if (!body.title || !body.content) return fail(res, 400, "标题和内容必填");
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
