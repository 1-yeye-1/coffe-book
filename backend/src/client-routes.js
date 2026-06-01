const { corsOrigin, ok, fail } = require("./shared/response");
const { parseBody } = require("./shared/request-body");
const { clearLoginFailures, currentUser, loginAllowed, publicUser, recordLoginFailure, sign } = require("./shared/auth");
const { hashPassword, needsUpgrade, verifyPassword } = require("./shared/password");
const { dashboardData, db, homeData, recordRealtime, seatStatus, today } = require("./shared/data");
const {
  persistActivity,
  persistActivityApplication,
  persistAuditLog,
  persistCartItem,
  persistComment,
  persistOrder,
  persistPost,
  persistProduct,
  persistReservation,
  persistUser
} = require("./shared/mysql");
const { createCaptcha, createSliderChallenge, createSmsCode, verifyCaptcha, verifySliderChallenge, verifySmsCode } = require("./shared/verification-store");
const QRCode = require("qrcode");

function nextId(items) {
  return items.length ? Math.max(...items.map((item) => item.id)) + 1 : 1;
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

function validStrongPassword(password) {
  const value = String(password || "");
  return value.length >= 8
    && value.length <= 32
    && /[a-z]/.test(value)
    && /[A-Z]/.test(value)
    && /\d/.test(value)
    && /[^A-Za-z0-9]/.test(value);
}

function validInteger(value, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max;
}

function asTime(value) {
  return new Date(String(value || "").replace(" ", "T")).getTime();
}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function safeImage(image, maxBytes = 1.5 * 1024 * 1024) {
  const value = String(image || "");
  if (!value) return "";
  if (!value.startsWith("data:image/")) throw new Error("仅支持上传图片文件");
  if (value.length > maxBytes) throw new Error("图片过大，请压缩后上传");
  return value;
}

function communityProfile(user) {
  return { id: user.id, name: user.name, avatar: user.avatar || "", level: user.level, showProfile: user.showProfile !== false };
}

function publicComment(comment, viewer) {
  const likedBy = Array.isArray(comment.likedBy) ? comment.likedBy : [];
  return {
    id: comment.id,
    userId: comment.userId,
    user: comment.user,
    avatar: comment.avatar || "",
    content: comment.content,
    likes: Number(comment.likes || 0),
    liked: Boolean(viewer && likedBy.includes(viewer.id))
  };
}

function publicPost(post, viewer) {
  const likedBy = Array.isArray(post.likedBy) ? post.likedBy : [];
  const comments = (post.comments || []).filter((comment) => comment.status === "approved" && db.users.some((user) => user.id === comment.userId));
  return {
    id: post.id,
    userId: post.userId,
    author: post.author,
    avatar: post.avatar || "",
    title: post.title,
    content: post.content,
    image: post.image || "",
    likes: Number(post.likes || 0),
    liked: Boolean(viewer && likedBy.includes(viewer.id)),
    comments: comments.map((comment) => publicComment(comment, viewer))
  };
}

const memberLevelDefinitions = [
  {
    name: "普通会员",
    min: 0,
    next: 500,
    benefits: [
      { key: "check-in", label: "每日签到 +10 积分" },
      { key: "shop-discount", label: "文创商品 95 折券兑换" },
      { key: "event-reminder", label: "活动报名提醒" }
    ]
  },
  {
    name: "黄金会员",
    min: 500,
    next: 1500,
    benefits: [
      { key: "check-in", label: "每日签到提升至 +15 积分" },
      { key: "shop-discount", label: "文创商品折扣提升至 9 折" },
      { key: "event-priority", label: "活动优先报名" },
      { key: "birthday-coffee", label: "生日咖啡券" }
    ]
  },
  {
    name: "钻石会员",
    min: 1500,
    next: null,
    benefits: [
      { key: "check-in", label: "每日签到提升至 +20 积分" },
      { key: "shop-discount", label: "文创商品折扣提升至 85 折" },
      { key: "event-quota", label: "活动专属名额" },
      { key: "monthly-coffee", label: "每月精品咖啡体验" }
    ]
  }
];

const memberLevels = memberLevelDefinitions.map((level, index) => {
  const inheritedBenefits = new Map();
  for (const item of memberLevelDefinitions.slice(0, index + 1)) {
    for (const benefit of item.benefits) inheritedBenefits.set(benefit.key, benefit.label);
  }
  return {
    name: level.name,
    min: level.min,
    next: level.next,
    inheritedFrom: memberLevelDefinitions.slice(0, index).map((item) => item.name),
    benefits: [...inheritedBenefits.values()]
  };
});

const pointRewards = [
  { id: "coffee-coupon", title: "精品咖啡兑换券", cost: 300, desc: "可兑换任意标准杯饮品 1 杯", type: "饮品券" },
  { id: "shop-10", title: "文创商城 10 元优惠券", cost: 500, desc: "满 59 元可用", type: "优惠券" },
  { id: "event-priority", title: "活动优先报名券", cost: 800, desc: "热门活动开放前优先锁定名额", type: "活动券" }
];

function normalizeMember(user) {
  user.levelProgress = Number(user.levelProgress || 0);
  const level = [...memberLevels].reverse().find((item) => user.levelProgress >= item.min) || memberLevels[0];
  user.level = level.name;
  user.points = Number(user.points || 0);
  user.favorites = Array.isArray(user.favorites) ? user.favorites : [];
  user.notes = Array.isArray(user.notes) ? user.notes : [];
  user.notifications = Array.isArray(user.notifications) ? user.notifications : [];
  user.gifts = Array.isArray(user.gifts) ? user.gifts : [];
  return level;
}

function membershipData(user) {
  const level = normalizeMember(user);
  const index = memberLevels.findIndex((item) => item.name === level.name);
  const next = memberLevels[index + 1] || null;
  const span = next ? next.min - level.min : 1;
  const current = Math.max(0, user.levelProgress - level.min);
  return {
    level: level.name,
    levelProgress: user.levelProgress,
    current,
    target: next ? span : current,
    nextLevel: next?.name || "已达最高等级",
    need: next ? Math.max(0, next.min - user.levelProgress) : 0,
    benefits: level.benefits,
    allLevels: memberLevels,
    rewards: pointRewards,
    checkedInToday: user.lastCheckIn === today()
  };
}

function earlySignupQuota(user) {
  const level = normalizeMember(user);
  if (level.name === "钻石会员") return 3;
  if (level.name === "黄金会员") return 2;
  return 1;
}

function memberData(user) {
  normalizeMember(user);
  const comments = db.posts.flatMap((post) => post.comments || []).filter((comment) => comment.userId === user.id);
  return {
    ...publicUser(user),
    reservations: db.reservations.filter((item) => item.userId === user.id),
    orders: db.orders.filter((item) => item.userId === user.id),
    favorites: user.favorites,
    notes: user.notes,
    notifications: user.notifications,
    gifts: user.gifts,
    stats: {
      favoriteBooks: user.favorites.length,
      publishedComments: comments.length,
      orderCount: db.orders.filter((item) => item.userId === user.id).length
    },
    membership: membershipData(user)
  };
}

async function handleFrontApi(req, res, url) {
  const method = req.method;

  if (method === "GET" && url.pathname === "/api/qr") {
    const data = String(url.searchParams.get("data") || "").trim();
    if (!data || data.length > 240) return fail(res, 400, "二维码内容不正确");
    const svg = await QRCode.toString(data, { type: "svg", margin: 2, width: 260, errorCorrectionLevel: "M" });
    res.writeHead(200, {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Access-Control-Allow-Origin": corsOrigin(res),
      "Vary": "Origin",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    });
    res.end(svg);
    return;
  }
  if (method === "GET" && url.pathname === "/api/auth/captcha") return ok(res, await createCaptcha());
  if (method === "GET" && url.pathname === "/api/auth/slider") return ok(res, await createSliderChallenge());
  if (method === "GET" && url.pathname === "/api/home") return ok(res, homeData());
  if (method === "GET" && url.pathname === "/api/products") return ok(res, db.products);
  if (method === "GET" && url.pathname.startsWith("/api/products/")) {
    const product = db.products.find((item) => item.id === Number(url.pathname.split("/").pop()));
    return product ? ok(res, product) : fail(res, 404, "商品不存在");
  }
  if (method === "GET" && url.pathname === "/api/books") return ok(res, db.books);
  if (method === "GET" && url.pathname.match(/^\/api\/books\/\d+$/)) {
    const book = db.books.find((item) => item.id === Number(url.pathname.split("/").pop()));
    return book ? ok(res, book) : fail(res, 404, "书籍不存在");
  }
  if (method === "GET" && url.pathname === "/api/seats/status") return ok(res, seatStatus(url.searchParams.get("date") || today(), url.searchParams.get("time") || ""));
  if (method === "GET" && url.pathname === "/api/activities") return ok(res, db.activities);
  if (method === "GET" && url.pathname.match(/^\/api\/activities\/\d+$/)) {
    const activity = db.activities.find((item) => item.id === Number(url.pathname.split("/").pop()));
    return activity ? ok(res, activity) : fail(res, 404, "活动不存在");
  }
  if (method === "GET" && url.pathname === "/api/posts") {
    const viewer = currentUser(req);
    const posts = db.posts.filter((post) => db.users.some((user) => user.id === post.userId));
    return ok(res, posts.map((post) => publicPost(post, viewer)));
  }
  if (method === "GET" && url.pathname.match(/^\/api\/community\/users\/\d+$/)) {
    const user = db.users.find((item) => item.id === Number(url.pathname.split("/").pop()));
    if (!user) return fail(res, 404, "用户不存在");
    const viewer = currentUser(req);
    if (user.showProfile === false && viewer?.id !== user.id) return fail(res, 403, "该用户已关闭个人主页展示");
    const posts = db.posts.filter((post) => post.userId === user.id).map((post) => publicPost(post, viewer));
    return ok(res, { ...communityProfile(user), posts, postCount: posts.length, likeCount: posts.reduce((sum, post) => sum + post.likes, 0) });
  }
  if (method === "GET" && url.pathname === "/api/dashboard") return ok(res, dashboardData());
  if (method === "GET" && url.pathname === "/api/member") {
    const user = currentUser(req);
    return user ? ok(res, memberData(user)) : fail(res, 401, "请先登录");
  }
  if (method === "GET" && url.pathname.match(/^\/api\/orders\/\d+\/payment-status$/)) {
    const user = currentUser(req);
    if (!user) return fail(res, 401, "请先登录后再查询支付状态");
    const id = Number(url.pathname.split("/")[3]);
    const order = db.orders.find((item) => item.id === id);
    if (!order) return fail(res, 404, "订单不存在");
    if (order.userId !== user.id) return fail(res, 403, "不能查询其他用户的订单");
    return ok(res, order);
  }

  const body = await parseBody(req);

  if (method === "POST" && url.pathname === "/api/auth/sms-code") {
    if (!validPhone(body.phone)) return fail(res, 400, "请输入正确的手机号");
    const captchaPassed = await verifyCaptcha(body.captchaToken, body.captchaAnswer);
    const sliderPassed = await verifySliderChallenge(body.sliderToken, body.sliderValue);
    if (!captchaPassed && !sliderPassed) return fail(res, 400, "请先完成验证码校验");
    try {
      const result = await createSmsCode(body.phone);
      return ok(res, result, "验证码已发送");
    } catch (error) {
      return fail(res, 429, error.message);
    }
  }

  if (method === "POST" && url.pathname === "/api/auth/register") {
    if (!body.phone || !body.password || !body.smsCode) return fail(res, 400, "手机号、密码和短信验证码必填");
    if (!validPhone(body.phone)) return fail(res, 400, "请输入正确的手机号");
    if (!validStrongPassword(body.password)) return fail(res, 400, "密码需为 8 到 32 位，并包含大写字母、小写字母、数字和特殊字符");
    if (String(body.name || "").trim().length < 2 || String(body.name).trim().length > 30) return fail(res, 400, "昵称需为 2 到 30 个字符");
    if (db.users.some((item) => item.phone === body.phone)) return fail(res, 409, "手机号已注册");
    const smsPassed = await verifySmsCode(body.phone, body.smsCode);
    if (!smsPassed) return fail(res, 400, "短信验证码错误或已过期");

    const user = {
      id: nextId(db.users),
      name: body.name || "新会员",
      phone: body.phone,
      password: hashPassword(body.password),
      role: "member",
      level: "普通会员",
      points: 100,
      avatar: "",
      email: "",
      birthday: "",
      bio: "",
      coffeePreference: "",
      bookPreference: "",
      address: "",
      showProfile: true,
      levelProgress: 80,
      lastCheckIn: "",
      favorites: [],
      notes: [],
      notifications: ["欢迎加入咖啡书屋会员"],
      gifts: []
    };
    await persistUser(user);
    db.users.push(user);
    await auditActivity("注册账号", { actorType: "user", actorId: user.id, actorName: user.name, targetType: "user", targetId: user.id, detail: `新会员 ${user.name} 完成注册` });
    return ok(res, { user: publicUser(user), token: sign({ id: user.id, type: "user" }) }, "注册成功");
  }

  if (method === "POST" && url.pathname === "/api/auth/login") {
    const attemptKey = `user:${String(body.phone || "").trim()}`;
    if (!loginAllowed(attemptKey)) return fail(res, 429, "登录失败次数过多，请稍后再试");
    if (!validPhone(body.phone) || !String(body.password || "").trim()) return fail(res, 400, "手机号或密码格式不正确");
    const user = db.users.find((item) => item.phone === body.phone);
    if (!user || !verifyPassword(body.password, user.password)) {
      recordLoginFailure(attemptKey);
      return fail(res, 401, "手机号或密码不正确");
    }
    clearLoginFailures(attemptKey);
    if (needsUpgrade(user.password)) {
      user.password = hashPassword(body.password);
      await persistUser(user);
    }
    return ok(res, { user: publicUser(user), token: sign({ id: user.id, type: "user" }) }, "登录成功");
  }

  if (method === "POST" && url.pathname === "/api/auth/sms-login") {
    if (!validPhone(body.phone) || !body.smsCode) return fail(res, 400, "手机号和短信验证码必填");
    const user = db.users.find((item) => item.phone === body.phone);
    if (!user) return fail(res, 404, "账号不存在，请先注册");
    if (!await verifySmsCode(body.phone, body.smsCode)) return fail(res, 400, "短信验证码错误或已过期");
    return ok(res, { user: publicUser(user), token: sign({ id: user.id, type: "user" }) }, "短信登录成功");
  }

  if (method === "PATCH" && url.pathname === "/api/member/profile") {
    const user = currentUser(req);
    if (!user) return fail(res, 401, "请先登录");
    if (!body.name || !body.phone) return fail(res, 400, "昵称和手机号必填");
    if (!validPhone(body.phone)) return fail(res, 400, "请输入正确的手机号");
    if (!validEmail(body.email)) return fail(res, 400, "请输入正确的邮箱地址");
    if (!validBirthday(body.birthday)) return fail(res, 400, "生日必须是有效且不晚于今天的日期");
    if (String(body.name).trim().length < 2 || String(body.name).trim().length > 30) return fail(res, 400, "昵称需为 2 到 30 个字符");
    if (String(body.bio || "").length > 200) return fail(res, 400, "个人简介不能超过 200 个字符");
    if (String(body.coffeePreference || "").length > 60 || String(body.bookPreference || "").length > 60) return fail(res, 400, "偏好设置不能超过 60 个字符");
    if (String(body.address || "").length > 160) return fail(res, 400, "收货地址不能超过 160 个字符");
    if (String(body.avatar || "").length > 1.5 * 1024 * 1024) return fail(res, 400, "头像图片过大");
    const duplicated = db.users.some((item) => item.id !== user.id && item.phone === body.phone);
    if (duplicated) return fail(res, 409, "该手机号已被其他账号使用");

    let avatar;
    try {
      avatar = safeImage(body.avatar);
    } catch (error) {
      return fail(res, 400, error.message);
    }
    user.name = String(body.name).trim();
    user.phone = String(body.phone).trim();
    user.email = String(body.email || "").trim();
    user.birthday = String(body.birthday || "").trim();
    user.avatar = avatar;
    user.bio = String(body.bio || "").trim();
    user.coffeePreference = String(body.coffeePreference || "").trim();
    user.bookPreference = String(body.bookPreference || "").trim();
    user.address = String(body.address || "").trim();
    await persistUser(user);
    for (const post of db.posts.filter((item) => item.userId === user.id)) {
      post.author = user.name;
      post.avatar = user.avatar;
      await persistPost(post);
    }
    for (const post of db.posts) {
      for (const comment of post.comments.filter((item) => item.userId === user.id)) {
        comment.user = user.name;
        comment.avatar = user.avatar;
        await persistComment(post.id, comment);
      }
    }
    await auditActivity("更新个人资料", { actorType: "user", actorId: user.id, actorName: user.name, targetType: "user", targetId: user.id, detail: "更新了个人资料" });
    return ok(res, publicUser(user), "个人资料已保存");
  }

  if (method === "PATCH" && url.pathname === "/api/member/security") {
    const user = currentUser(req);
    if (!user) return fail(res, 401, "请先登录");
    user.showProfile = body.showProfile === true || body.showProfile === "true" || body.showProfile === "on";
    await persistUser(user);
    await auditActivity("更新安全设置", { actorType: "user", actorId: user.id, actorName: user.name, targetType: "user", targetId: user.id, detail: `个人主页展示已${user.showProfile ? "开启" : "关闭"}` });
    return ok(res, publicUser(user), "安全设置已保存");
  }

  if (method === "POST" && url.pathname === "/api/member/password") {
    const user = currentUser(req);
    if (!user) return fail(res, 401, "请先登录");
    if (!verifyPassword(body.currentPassword, user.password)) return fail(res, 401, "当前密码不正确");
    if (!validStrongPassword(body.newPassword)) return fail(res, 400, "新密码需为 8 到 32 位，并包含大写字母、小写字母、数字和特殊字符");
    user.password = hashPassword(body.newPassword);
    await persistUser(user);
    await auditActivity("修改登录密码", { actorType: "user", actorId: user.id, actorName: user.name, targetType: "user", targetId: user.id, detail: "更新了登录密码" });
    return ok(res, null, "密码已修改");
  }

  if (method === "PATCH" && url.pathname === "/api/member/list") {
    const user = currentUser(req);
    if (!user) return fail(res, 401, "请先登录");
    const allowed = ["favorites", "notes", "notifications"];
    if (!allowed.includes(body.type)) return fail(res, 400, "不支持的内容类型");
    if (!Array.isArray(body.items)) return fail(res, 400, "内容格式错误");
    user[body.type] = body.items.map((item) => String(item).trim()).filter(Boolean).slice(0, 30);
    await persistUser(user);
    return ok(res, memberData(user), "内容已保存");
  }

  if (method === "POST" && url.pathname === "/api/member/check-in") {
    const user = currentUser(req);
    if (!user) return fail(res, 401, "请先登录");
    normalizeMember(user);
    if (user.lastCheckIn === today()) return fail(res, 409, "今天已经签到过了");
    const level = memberLevels.find((item) => item.name === user.level) || memberLevels[0];
    const pointGain = level.name === "钻石会员" ? 20 : level.name === "黄金会员" ? 15 : 10;
    user.points += pointGain;
    user.levelProgress += 35;
    user.lastCheckIn = today();
    normalizeMember(user);
    user.notifications = [`签到成功，获得 ${pointGain} 积分和 35 等级度`, ...(user.notifications || [])].slice(0, 30);
    await persistUser(user);
    await auditActivity("每日签到", { actorType: "user", actorId: user.id, actorName: user.name, targetType: "user", targetId: user.id, detail: `完成每日签到，获得 ${pointGain} 积分` });
    return ok(res, memberData(user), "签到成功");
  }

  if (method === "POST" && url.pathname === "/api/member/redeem") {
    const user = currentUser(req);
    if (!user) return fail(res, 401, "请先登录");
    const reward = pointRewards.find((item) => item.id === body.rewardId);
    if (!reward) return fail(res, 404, "兑换商品不存在");
    if (user.points < reward.cost) return fail(res, 400, "积分不足，暂时无法兑换");
    user.points -= reward.cost;
    user.gifts.unshift({
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      verifyCode: `COFFEE-BOOK-GIFT-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      rewardId: reward.id,
      title: reward.title,
      desc: reward.desc,
      type: reward.type,
      status: "未使用",
      redeemedAt: new Date().toISOString(),
      usedAt: ""
    });
    user.notifications = [`已兑换：${reward.title}`, ...(user.notifications || [])].slice(0, 30);
    await persistUser(user);
    await auditActivity("积分兑换", { actorType: "user", actorId: user.id, actorName: user.name, targetType: "reward", targetId: reward.id, detail: `使用 ${reward.cost} 积分兑换 ${reward.title}` });
    return ok(res, memberData(user), "兑换成功");
  }

  if (method === "POST" && url.pathname.match(/^\/api\/member\/gifts\/[^/]+\/use$/)) {
    const user = currentUser(req);
    if (!user) return fail(res, 401, "请先登录");
    normalizeMember(user);
    const giftId = decodeURIComponent(url.pathname.split("/")[4]);
    const gift = user.gifts.find((item) => item.id === giftId);
    if (!gift) return fail(res, 404, "礼品不存在");
    if (gift.status === "已使用") return fail(res, 409, "该礼券已经使用");
    gift.status = "已使用";
    gift.usedAt = new Date().toISOString();
    user.notifications = [`已使用：${gift.title}`, ...(user.notifications || [])].slice(0, 30);
    await persistUser(user);
    await auditActivity("使用礼券", { actorType: "user", actorId: user.id, actorName: user.name, targetType: "gift", targetId: gift.id, detail: `使用礼券 ${gift.title}` });
    return ok(res, memberData(user), "礼券使用成功");
  }

  if (method === "POST" && url.pathname === "/api/cart") {
    const user = currentUser(req);
    if (!user) return fail(res, 401, "请先登录后再加入购物车");
    const product = db.products.find((item) => item.id === Number(body.productId));
    if (!product) return fail(res, 404, "商品不存在");
    const key = user.id;
    const quantity = Number(body.quantity || 1);
    if (product.stock < 1) return fail(res, 409, "商品已售罄");
    if (!validInteger(quantity, 1, product.stock)) return fail(res, 400, `商品数量必须是 1 到 ${product.stock} 之间的整数`);
    const cart = db.carts.get(key) || [];
    const currentQuantity = cart
      .filter((item) => item.productId === product.id)
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
    if (currentQuantity + quantity > product.stock) return fail(res, 409, `购物车中的该商品数量必须是 1 到 ${product.stock} 之间的整数`);
    cart.push({ productId: product.id, quantity });
    db.carts.set(key, cart);
    await persistCartItem(key, product.id, quantity);
    return ok(res, cart, "加入购物车成功");
  }

  if (method === "POST" && url.pathname === "/api/orders") {
    const user = currentUser(req);
    if (!user) return fail(res, 401, "请先登录后再提交订单");
    const items = Array.isArray(body.items) ? body.items : [];
    if (!items.length) return fail(res, 400, "订单商品不能为空");
    if (items.length > 30) return fail(res, 400, "单次订单商品种类不能超过 30 个");
    const quantities = new Map();
    for (const item of items) {
      const product = db.products.find((productItem) => productItem.id === Number(item.productId));
      if (!product) return fail(res, 404, "商品不存在");
      const quantity = Number(item.quantity || 1);
      if (!validInteger(quantity, 1, product.stock)) return fail(res, 400, `${product.name} 数量必须是 1 到 ${product.stock} 之间的整数`);
      quantities.set(product.id, Number(quantities.get(product.id) || 0) + quantity);
    }
    const orderItems = [...quantities.entries()].map(([productId, quantity]) => {
      const product = db.products.find((item) => item.id === productId);
      return { productId: product.id, name: product.name, price: product.price, quantity };
    });
    const overStockItem = orderItems.find((item) => db.products.find((product) => product.id === item.productId).stock < item.quantity);
    if (overStockItem) {
      const product = db.products.find((item) => item.id === overStockItem.productId);
      return fail(res, 409, `${product.name} 数量必须是 1 到 ${product.stock} 之间的整数`);
    }
    for (const item of orderItems) {
      const product = db.products.find((productItem) => productItem.id === item.productId);
      product.stock -= item.quantity;
    }
    const total = orderItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const order = {
      id: nextId(db.orders),
      userId: user.id,
      userName: user.name,
      items: orderItems,
      total,
      status: "待支付",
      paymentReviewStatus: "not_submitted",
      paymentSubmittedAt: "",
      paymentReviewedAt: "",
      paymentReviewedBy: 0,
      createdAt: new Date().toISOString(),
      earnedPoints: 0,
      earnedProgress: 0
    };
    db.orders.push(order);
    for (const item of orderItems) {
      const product = db.products.find((productItem) => productItem.id === item.productId);
      if (product) await persistProduct(product);
    }
    await persistOrder(order);
    await auditActivity("提交订单", { actorType: "user", actorId: user.id, actorName: user.name, targetType: "order", targetId: order.id, detail: `提交订单 #${order.id}，金额 ￥${total.toFixed(2)}` });
    return ok(res, order, "订单已创建，请完成支付");
  }

  if (method === "POST" && url.pathname.match(/^\/api\/orders\/\d+\/pay$/)) {
    const id = Number(url.pathname.split("/")[3]);
    const order = db.orders.find((item) => item.id === id);
    if (!order) return fail(res, 404, "订单不存在");
    const user = currentUser(req);
    if (!user) return fail(res, 401, "请先登录后再支付订单");
    if (order.userId && order.userId !== user.id) return fail(res, 403, "不能支付其他用户的订单");
    if (order.status === "已取消") return fail(res, 409, "订单已取消，不能继续支付");
    if (order.status === "已支付" || order.paymentReviewStatus === "approved") return ok(res, order, "订单已经支付");
    if (order.paymentReviewStatus === "pending") return ok(res, order, "付款信息已提交，请等待后台审核");
    order.status = "支付审核中";
    order.paymentMethod = body.paymentMethod || "线上支付";
    order.paymentReviewStatus = "pending";
    order.paymentSubmittedAt = new Date().toISOString();
    order.paymentReviewedAt = "";
    order.paymentReviewedBy = 0;
    await persistOrder(order);
    await auditActivity("提交付款审核", { actorType: "user", actorId: user.id, actorName: user.name, targetType: "order", targetId: order.id, detail: `订单 #${order.id} 已提交付款审核，支付方式：${order.paymentMethod}` });
    return ok(res, order, "付款信息已提交，请等待后台审核");
  }

  if (method === "POST" && url.pathname === "/api/reservations") {
    const date = body.date || today();
    const time = body.time || "14:00";
    const people = Number(body.people || 1);
    const phone = String(body.phone || "").trim();
    if (!validPhone(phone)) return fail(res, 400, "请填写正确的预留手机号");
    if (!validInteger(people, 1, 20)) return fail(res, 400, "预约人数必须是 1 到 20 之间的整数");
    const seatIds = Array.isArray(body.seatIds) ? [...new Set(body.seatIds.map(String))] : String(body.seatId || "").split(",").filter(Boolean);
    if (seatIds.length < people) return fail(res, 400, `当前选择了 ${seatIds.length} 个座位，还需要选择 ${people - seatIds.length} 个座位`);
    if (seatIds.length > people) return fail(res, 400, `预约 ${people} 人只能选择 ${people} 个座位`);
    const available = seatStatus(date, time).filter((item) => item.status === "free").map((item) => item.id);
    if (available.length < people) return fail(res, 409, `该时段仅剩 ${available.length} 个空位，无法满足 ${people} 人预约`);
    const blocked = seatIds.filter((id) => !available.includes(id));
    if (blocked.length) return fail(res, 409, `座位 ${blocked.join("、")} 已被占用或预约，请重新选择`);
    const user = currentUser(req);
    const reservation = {
      id: nextId(db.reservations),
      userId: user?.id || 0,
      phone,
      seatId: seatIds.join(","),
      date,
      time,
      people: String(people),
      purpose: body.purpose || "阅读自习",
      note: body.note || "",
      status: "已预约"
    };
    db.reservations.push(reservation);
    await persistReservation(reservation);
    await auditActivity("预约座位", { actorType: user ? "user" : "guest", actorId: user?.id || 0, actorName: user?.name || phone, targetType: "reservation", targetId: reservation.id, detail: `完成 ${reservation.seatId} 座位预约` });
    return ok(res, reservation, "预约成功");
  }

  if (method === "DELETE" && url.pathname.startsWith("/api/reservations/")) {
    const id = Number(url.pathname.split("/").pop());
    const reservation = db.reservations.find((item) => item.id === id);
    if (!reservation) return fail(res, 404, "预约不存在");
    const user = currentUser(req);
    if (!user) return fail(res, 401, "请先登录后再取消预约");
    if (reservation.userId !== user.id) return fail(res, 403, "不能取消其他用户的预约");
    reservation.status = "已取消";
    await persistReservation(reservation);
    return ok(res, reservation, "预约已取消");
  }

  if (method === "POST" && url.pathname.match(/^\/api\/activities\/\d+\/apply$/)) {
    const id = Number(url.pathname.split("/")[3]);
    const activity = db.activities.find((item) => item.id === id);
    if (!activity) return fail(res, 404, "活动不存在");
    const user = currentUser(req);
    const kind = body.kind === "early" ? "early" : "regular";
    const phone = String(user?.phone || body.phone || "").trim();
    const people = Number(body.people || 1);
    if (!validPhone(phone)) return fail(res, 400, "未登录报名请填写正确的手机号");
    if (!validInteger(people, 1, 20)) return fail(res, 400, "报名人数必须是 1 到 20 之间的整数");
    const now = Date.now();
    if (kind === "regular" && activity.registrationStart && now < asTime(activity.registrationStart)) {
      return fail(res, 409, `直接报名将于 ${activity.registrationStart} 开放`);
    }
    if (kind === "early") {
      if (!user) return fail(res, 401, "提前报名仅限登录会员使用");
      if (activity.earlyStart && now < asTime(activity.earlyStart)) return fail(res, 409, `提前报名将于 ${activity.earlyStart} 开放`);
      const quota = earlySignupQuota(user);
      const used = db.activityApplications.filter((item) => item.userId === user.id && item.kind === "early" && String(item.createdAt).slice(0, 7) === currentMonth()).length;
      if (used >= quota) return fail(res, 409, `${user.level}每月可提前报名 ${quota} 次，您本月已用完`);
    }
    if (activity.applied + people > activity.capacity) return fail(res, 409, `活动仅剩 ${activity.capacity - activity.applied} 个名额`);
    const duplicated = db.activityApplications.some((item) => item.activityId === activity.id && ((user && item.userId === user.id) || item.phone === phone));
    if (duplicated) return fail(res, 409, "您已经报名过该活动");
    const application = { id: nextId(db.activityApplications), activityId: activity.id, userId: user?.id || 0, phone, people, kind, createdAt: new Date().toISOString() };
    db.activityApplications.push(application);
    activity.applied += people;
    await persistActivity(activity);
    await persistActivityApplication(application);
    await auditActivity("活动报名", { actorType: user ? "user" : "guest", actorId: user?.id || 0, actorName: user?.name || phone, targetType: "activity", targetId: activity.id, detail: `${activity.title} 新增 ${people} 人报名` });
    return ok(res, { activity, application }, kind === "early" ? "提前报名成功" : "报名成功");
  }

  if (method === "POST" && url.pathname === "/api/posts") {
    if (!body.title || !body.content) return fail(res, 400, "标题和内容必填");
    if (String(body.title).trim().length > 80 || String(body.content).trim().length > 2000) return fail(res, 400, "动态标题或内容过长");
    const user = currentUser(req);
    if (!user) return fail(res, 401, "请先登录后再发布动态");
    let image;
    try {
      image = safeImage(body.image);
    } catch (error) {
      return fail(res, 400, error.message);
    }
    const post = {
      id: nextId(db.posts),
      userId: user.id,
      author: user.name,
      avatar: user.avatar || "",
      title: String(body.title).trim(),
      content: String(body.content).trim(),
      image,
      likes: 0,
      likedBy: [],
      comments: []
    };
    db.posts.unshift(post);
    await persistPost(post);
    await auditActivity("发布社区动态", { actorType: "user", actorId: user.id, actorName: user.name, targetType: "post", targetId: post.id, detail: `发布动态《${post.title}》` });
    return ok(res, publicPost(post, user), "发布成功");
  }

  if (method === "POST" && url.pathname.match(/^\/api\/posts\/\d+\/comments$/)) {
    const id = Number(url.pathname.split("/")[3]);
    const post = db.posts.find((item) => item.id === id);
    if (!post) return fail(res, 404, "动态不存在");
    const user = currentUser(req);
    if (!user) return fail(res, 401, "请先登录后再评论");
    if (!String(body.content || "").trim()) return fail(res, 400, "评论内容不能为空");
    if (String(body.content).trim().length > 500) return fail(res, 400, "评论不能超过 500 个字符");
    const allComments = db.posts.flatMap((item) => item.comments);
    const comment = { id: nextId(allComments), userId: user.id, user: user.name, avatar: user.avatar || "", content: String(body.content).trim(), likes: 0, likedBy: [], status: "pending" };
    post.comments.push(comment);
    await persistComment(post.id, comment);
    await auditActivity("提交评论", { actorType: "user", actorId: user.id, actorName: user.name, targetType: "comment", targetId: comment.id, detail: `在动态 #${post.id} 下提交待审核评论` });
    return ok(res, publicPost(post, user), "评论已提交，审核通过后展示");
  }

  if (method === "POST" && url.pathname.match(/^\/api\/posts\/\d+\/like$/)) {
    const id = Number(url.pathname.split("/")[3]);
    const post = db.posts.find((item) => item.id === id);
    if (!post) return fail(res, 404, "动态不存在");
    const user = currentUser(req);
    if (!user) return fail(res, 401, "请先登录后再点赞");
    post.likedBy = Array.isArray(post.likedBy) ? post.likedBy : [];
    if (post.likedBy.includes(user.id)) return fail(res, 409, "您已经点过赞了");
    post.likedBy.push(user.id);
    post.likes = post.likedBy.length;
    await persistPost(post);
    return ok(res, publicPost(post, user), "点赞成功");
  }

  if (method === "POST" && url.pathname.match(/^\/api\/posts\/\d+\/comments\/\d+\/like$/)) {
    const [, , , postId, , commentId] = url.pathname.split("/");
    const post = db.posts.find((item) => item.id === Number(postId));
    const comment = post?.comments.find((item) => item.id === Number(commentId));
    if (!post || !comment) return fail(res, 404, "评论不存在");
    const user = currentUser(req);
    if (!user) return fail(res, 401, "请先登录后再点赞");
    comment.likedBy = Array.isArray(comment.likedBy) ? comment.likedBy : [];
    if (comment.likedBy.includes(user.id)) return fail(res, 409, "您已经点过赞了");
    comment.likedBy.push(user.id);
    comment.likes = comment.likedBy.length;
    await persistComment(post.id, comment);
    return ok(res, publicComment(comment, user), "评论点赞成功");
  }

  return fail(res, 404, "接口不存在");
}

module.exports = { handleFrontApi };
