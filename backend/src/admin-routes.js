const { ok, fail } = require("./shared/response");
const { parseBody } = require("./shared/request-body");
const { dashboardData, db, incomeData } = require("./shared/data");
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

function nextId(items) {
  return items.length ? Math.max(...items.map((item) => item.id)) + 1 : 1;
}

function findById(items, url) {
  return items.find((item) => item.id === Number(url.pathname.split("/").pop()));
}

function adminSummary() {
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
    orders: db.orders,
    reservations: db.reservations,
    activities: db.activities,
    notices: db.notices,
    books: db.books,
    posts: db.posts,
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

  if (!currentAdmin(req)) return fail(res, 401, "管理员登录已失效，请重新登录");
  if (method === "GET" && url.pathname === "/api/admin/summary") return ok(res, adminSummary());
  if (method === "GET" && url.pathname === "/api/admin/realtime") {
    const pageSize = Math.min(30, Math.max(1, Number(url.searchParams.get("pageSize") || 10)));
    const total = db.realtime.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(pages, Math.max(1, Number(url.searchParams.get("page") || 1)));
    return ok(res, { items: db.realtime.slice((page - 1) * pageSize, page * pageSize), total, page, pageSize, pages });
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
    return ok(res, book, "书籍已更新");
  }

  if (method === "DELETE" && url.pathname.match(/^\/api\/admin\/books\/\d+$/)) {
    const book = findById(db.books, url);
    if (!book) return fail(res, 404, "书籍不存在");
    db.books = db.books.filter((item) => item.id !== book.id);
    await deleteBook(book.id);
    return ok(res, null, "书籍已删除");
  }

  if (method === "POST" && url.pathname === "/api/admin/users") {
    if (!body.name || !body.phone) return fail(res, 400, "昵称和手机号必填");
    if (db.users.some((item) => item.phone === body.phone)) return fail(res, 409, "手机号已存在");
    const user = {
      id: nextId(db.users),
      name: body.name,
      phone: body.phone,
      password: hashPassword(body.password || "coffee123"),
      role: "member",
      level: body.level || "普通会员",
      points: Number(body.points || 0),
      avatar: "",
      levelProgress: Number(body.levelProgress || 0),
      lastCheckIn: "",
      favorites: [],
      notes: [],
      notifications: [],
      gifts: []
    };
    db.users.push(user);
    await persistUser(user);
    return ok(res, user, "用户已新增");
  }

  if (method === "PATCH" && url.pathname.match(/^\/api\/admin\/users\/\d+$/)) {
    const user = findById(db.users, url);
    if (!user) return fail(res, 404, "用户不存在");
    Object.assign(user, {
      name: body.name || user.name,
      phone: body.phone || user.phone,
      level: body.level || user.level,
      points: Number(body.points ?? user.points)
    });
    await persistUser(user);
    return ok(res, user, "用户已更新");
  }

  if (method === "DELETE" && url.pathname.match(/^\/api\/admin\/users\/\d+$/)) {
    const user = findById(db.users, url);
    if (!user) return fail(res, 404, "用户不存在");
    db.users = db.users.filter((item) => item.id !== user.id);
    await deleteUser(user.id);
    return ok(res, null, "用户已删除");
  }

  if (method === "POST" && url.pathname === "/api/admin/products") {
    if (!body.name) return fail(res, 400, "商品名称必填");
    const product = {
      id: nextId(db.products),
      name: body.name,
      description: body.description || "暂无描述",
      price: Number(body.price || 0),
      stock: Number(body.stock || 0),
      category: body.category || "creative",
      image: body.image || "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=900&q=80"
    };
    db.products.push(product);
    await persistProduct(product);
    return ok(res, product, "商品已新增");
  }

  if (method === "PATCH" && url.pathname.match(/^\/api\/admin\/products\/\d+$/)) {
    const product = findById(db.products, url);
    if (!product) return fail(res, 404, "商品不存在");
    Object.assign(product, {
      name: body.name || product.name,
      description: body.description || product.description,
      price: Number(body.price ?? product.price),
      stock: Number(body.stock ?? product.stock),
      category: body.category || product.category
    });
    await persistProduct(product);
    return ok(res, product, "商品已更新");
  }

  if (method === "DELETE" && url.pathname.match(/^\/api\/admin\/products\/\d+$/)) {
    const product = findById(db.products, url);
    if (!product) return fail(res, 404, "商品不存在");
    db.products = db.products.filter((item) => item.id !== product.id);
    await deleteProduct(product.id);
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
      createdAt: new Date().toISOString()
    };
    db.orders.push(order);
    await persistOrder(order);
    return ok(res, order, "订单已新增");
  }

  if (method === "PATCH" && url.pathname.match(/^\/api\/admin\/orders\/\d+$/)) {
    const order = findById(db.orders, url);
    if (!order) return fail(res, 404, "订单不存在");
    Object.assign(order, {
      userName: body.userName || order.userName,
      total: Number(body.total ?? order.total),
      status: body.status || order.status
    });
    await persistOrder(order);
    return ok(res, order, "订单已更新");
  }

  if (method === "DELETE" && url.pathname.match(/^\/api\/admin\/orders\/\d+$/)) {
    const order = findById(db.orders, url);
    if (!order) return fail(res, 404, "订单不存在");
    db.orders = db.orders.filter((item) => item.id !== order.id);
    await deleteOrder(order.id);
    return ok(res, null, "订单已删除");
  }

  if (method === "POST" && url.pathname === "/api/admin/reservations") {
    if (!body.seatId || !body.date || !body.time) return fail(res, 400, "座位、日期和时间必填");
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
    return ok(res, reservation, "预约已新增");
  }

  if (method === "PATCH" && url.pathname.match(/^\/api\/admin\/reservations\/\d+$/)) {
    const reservation = findById(db.reservations, url);
    if (!reservation) return fail(res, 404, "预约不存在");
    Object.assign(reservation, {
      seatId: body.seatId || reservation.seatId,
      phone: body.phone || reservation.phone,
      date: body.date || reservation.date,
      time: body.time || reservation.time,
      people: String(body.people || reservation.people),
      purpose: body.purpose || reservation.purpose,
      note: body.note ?? reservation.note,
      status: body.status || reservation.status
    });
    await persistReservation(reservation);
    return ok(res, reservation, "预约已更新");
  }

  if (method === "DELETE" && url.pathname.match(/^\/api\/admin\/reservations\/\d+$/)) {
    const reservation = findById(db.reservations, url);
    if (!reservation) return fail(res, 404, "预约不存在");
    db.reservations = db.reservations.filter((item) => item.id !== reservation.id);
    await deleteReservation(reservation.id);
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
    return ok(res, activity, "活动已更新");
  }

  if (method === "DELETE" && url.pathname.match(/^\/api\/admin\/activities\/\d+$/)) {
    const activity = findById(db.activities, url);
    if (!activity) return fail(res, 404, "活动不存在");
    db.activities = db.activities.filter((item) => item.id !== activity.id);
    db.activityApplications = db.activityApplications.filter((item) => item.activityId !== activity.id);
    await deleteActivity(activity.id);
    return ok(res, null, "活动已删除");
  }

  if (method === "PATCH" && url.pathname.match(/^\/api\/admin\/posts\/\d+$/)) {
    const post = findById(db.posts, url);
    if (!post) return fail(res, 404, "动态不存在");
    Object.assign(post, { title: body.title || post.title, content: body.content || post.content });
    await persistPost(post);
    return ok(res, post, "动态已更新");
  }

  if (method === "POST" && url.pathname === "/api/admin/posts") {
    if (!body.title || !body.content) return fail(res, 400, "标题和内容必填");
    const post = { id: nextId(db.posts), userId: 0, author: body.author || "运营团队", avatar: "", title: body.title, content: body.content, image: "", likedBy: [], likes: 0, comments: [] };
    db.posts.unshift(post);
    await persistPost(post);
    return ok(res, post, "内容已新增");
  }

  if (method === "DELETE" && url.pathname.match(/^\/api\/admin\/posts\/\d+$/)) {
    const post = findById(db.posts, url);
    if (!post) return fail(res, 404, "动态不存在");
    db.posts = db.posts.filter((item) => item.id !== post.id);
    await deletePost(post.id);
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
    return ok(res, comment, body.status === "approved" ? "评论已通过审核" : "评论已驳回");
  }

  if (method === "DELETE" && url.pathname.match(/^\/api\/admin\/posts\/\d+\/comments\/\d+$/)) {
    const [, , , , postId, , commentId] = url.pathname.split("/");
    const post = db.posts.find((item) => item.id === Number(postId));
    const comment = post?.comments.find((item) => item.id === Number(commentId));
    if (!comment) return fail(res, 404, "评论不存在");
    post.comments = post.comments.filter((item) => item.id !== comment.id);
    await deleteComment(comment.id);
    return ok(res, null, "评论已删除");
  }

  if (method === "POST" && url.pathname === "/api/admin/notices") {
    if (!body.title || !body.summary || !body.date) return fail(res, 400, "标题、摘要和日期必填");
    const notice = { id: nextId(db.notices), title: body.title, summary: body.summary, date: body.date };
    db.notices.unshift(notice);
    await persistNotice(notice);
    return ok(res, notice, "公告已新增");
  }

  if (method === "PATCH" && url.pathname.match(/^\/api\/admin\/notices\/\d+$/)) {
    const notice = findById(db.notices, url);
    if (!notice) return fail(res, 404, "公告不存在");
    Object.assign(notice, { title: body.title || notice.title, summary: body.summary || notice.summary, date: body.date || notice.date });
    await persistNotice(notice);
    return ok(res, notice, "公告已更新");
  }

  if (method === "DELETE" && url.pathname.match(/^\/api\/admin\/notices\/\d+$/)) {
    const notice = findById(db.notices, url);
    if (!notice) return fail(res, 404, "公告不存在");
    db.notices = db.notices.filter((item) => item.id !== notice.id);
    await deleteNotice(notice.id);
    return ok(res, null, "公告已删除");
  }

  return fail(res, 404, "后台接口不存在");
}

module.exports = { handleAdminApi };
