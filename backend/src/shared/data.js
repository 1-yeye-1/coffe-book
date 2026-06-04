function today() {
  return new Date().toISOString().slice(0, 10);
}

function nowText() {
  return new Date().toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).replaceAll("/", "-");
}

function isPaidOrder(order) {
  return ["已支付", "paid", "completed"].includes(String(order?.status || ""));
}

const db = {
  users: [
    {
      id: 1,
      name: "城市读者",
      phone: "13800000000",
      password: "coffee123",
      role: "member",
      level: "黄金会员",
      points: 2860,
      avatar: "",
      birthday: "",
      showProfile: true,
      levelProgress: 820,
      lastCheckIn: "",
      favorites: ["夜航西飞", "桂花拿铁"],
      notes: ["城市阅读笔记", "手冲课要点"],
      notifications: ["您的预约已确认", "六月新书已上架"],
      gifts: []
    }
  ],
  admins: [
    { id: 1, name: "运营管理员", account: "admin", password: "admin123", role: "admin" }
  ],
  products: [
    {
      id: 1,
      name: "书屋限定手冲杯",
      description: "陶瓷手作杯，适合手冲与拿铁。",
      price: 128,
      stock: 32,
      category: "creative",
      image: "https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=900&q=80"
    },
    {
      id: 2,
      name: "城市阅读帆布袋",
      description: "加厚棉布，可装 3 本书和一杯外带咖啡。",
      price: 69,
      stock: 58,
      category: "creative",
      image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80"
    },
    {
      id: 3,
      name: "精品咖啡豆礼盒",
      description: "云南小粒、埃塞日晒、哥伦比亚水洗三支装。",
      price: 198,
      stock: 20,
      category: "creative",
      image: "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=900&q=80"
    },
    {
      id: 4,
      name: "读书笔记套装",
      description: "横线本、书签、贴纸与索引贴组合。",
      price: 46,
      stock: 76,
      category: "creative",
      image: "https://images.unsplash.com/photo-1519682337058-a94d519337bc?auto=format&fit=crop&w=900&q=80"
    },
    {
      id: 5,
      name: "桂花拿铁",
      description: "季节限定，桂花香气与中深烘豆融合。",
      price: 32,
      stock: 120,
      category: "coffee",
      image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=900&q=80"
    },
    {
      id: 6,
      name: "云南普洱手冲",
      description: "坚果、红糖与柔和酸质，适合慢慢品尝。",
      price: 38,
      stock: 80,
      category: "coffee",
      image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=900&q=80"
    },
    {
      id: 7,
      name: "耶加雪菲手冲",
      description: "柑橘、白花和茶感尾韵，明亮清爽。",
      price: 42,
      stock: 72,
      category: "coffee",
      image: "https://images.unsplash.com/photo-1459755486867-b55449bb39ff?auto=format&fit=crop&w=900&q=80"
    }
  ],
  reservations: [
    { id: 1, userId: 1, phone: "13800000000", seatId: "B2", date: today(), time: "14:00", people: "1", purpose: "阅读自习", note: "", status: "使用中" },
    { id: 2, userId: 1, phone: "13800000000", seatId: "C4,C5", date: today(), time: "19:00", people: "2", purpose: "朋友聚会", note: "靠窗", status: "已预约" }
  ],
  orders: [],
  payments: [],
  books: [
    { id: 1, title: "夜航西飞", author: "柏瑞尔·马卡姆", category: "文学", ranking: "周榜第 1", summary: "一位女性飞行员在非洲大陆上的生命回忆。文字克制而开阔，适合在安静的下午慢慢阅读。", publisher: "人民文学出版社", publishedAt: "2025-08-15 10:00:00", image: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=900&q=80" },
    { id: 2, title: "置身事内", author: "兰小欢", category: "商业", ranking: "月榜第 2", summary: "从地方政府投融资切入，理解中国经济运行的现实逻辑。适合希望建立商业与公共治理视角的读者。", publisher: "上海人民出版社", publishedAt: "2025-11-02 09:30:00", image: "https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=900&q=80" },
    { id: 3, title: "设计中的设计", author: "原研哉", category: "艺术", ranking: "季榜第 3", summary: "重新观察日常事物，从感知、留白与沟通出发理解设计。适合设计爱好者和创意工作者。", publisher: "山东人民出版社", publishedAt: "2026-01-12 14:00:00", image: "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?auto=format&fit=crop&w=900&q=80" },
    { id: 4, title: "日日是好日", author: "森下典子", category: "生活", ranking: "盲盒推荐", summary: "在学习茶道的岁月里体会四季、时间和专注。一本适合与咖啡一起阅读的温柔生活随笔。", publisher: "新星出版社", publishedAt: "2026-03-08 11:20:00", image: "https://images.unsplash.com/photo-1516979187457-637abb4f9353?auto=format&fit=crop&w=900&q=80" }
  ],
  activities: [
    { id: 1, title: "周五夜读会", capacity: 30, applied: 18, date: "2026-06-05", time: "19:30-21:00", registrationStart: "2026-06-01 09:00:00", earlyStart: "2026-05-20 09:00:00", location: "二楼阅读区", description: "围绕城市文学进行主题共读与自由交流，适合希望认识新书友的读者。" },
    { id: 2, title: "手冲咖啡公开课", capacity: 16, applied: 12, date: "2026-06-12", time: "14:00-16:00", registrationStart: "2026-06-03 09:00:00", earlyStart: "2026-05-25 09:00:00", location: "一楼咖啡体验台", description: "从研磨、水温到萃取时间，现场完成一杯自己的手冲咖啡。" },
    { id: 3, title: "城市书评挑战赛", capacity: 60, applied: 41, date: "2026-06-20", time: "10:00-17:00", registrationStart: "2026-06-08 09:00:00", earlyStart: "2026-05-28 09:00:00", location: "共享活动厅", description: "提交短书评并参与现场分享，优秀作品将进入书屋月度推荐栏。" }
  ],
  activityApplications: [],
  posts: [
    { id: 1, userId: 1, author: "城市读者", avatar: "", title: "今天的耶加雪菲很适合配短篇小说", content: "酸质明亮，读完一章正好降温。", image: "", likes: 0, likedBy: [], comments: [] },
    { id: 2, userId: 0, author: "北窗", avatar: "", title: "书屋二楼靠窗座位效率很高", content: "下午的光线很好，插座也足够。", image: "", likes: 0, likedBy: [], comments: [] }
  ],
  carts: new Map(),
  notices: [
    { id: 1, title: "端午节营业时间调整", summary: "节假日门店营业延长至 23:00，夜读区开放预约。", date: "2026-06-01 08:00:00" },
    { id: 2, title: "六月新书上架", summary: "文学、艺术、商业类共 128 册新书加入可借阅库。", date: "2026-06-03 10:30:00" },
    { id: 3, title: "会员积分兑换升级", summary: "积分可兑换手冲课、文创周边与活动优先名额。", date: "2026-06-08 09:00:00" }
  ],
  realtime: [
    { id: 0, actorType: "user", actorId: 1, actorName: "城市读者", action: "活动报名", targetType: "activity", targetId: "1", detail: "报名参加周五夜读会", createdAt: "2026-05-31 14:25:00" },
    { id: 0, actorType: "user", actorId: 1, actorName: "城市读者", action: "发布社区动态", targetType: "post", targetId: "1", detail: "在书友社区发布读书笔记", createdAt: "2026-05-31 14:18:00" },
    { id: 0, actorType: "system", actorId: 0, actorName: "系统", action: "商品售出", targetType: "product", targetId: "3", detail: "精品咖啡豆礼盒售出 1 件", createdAt: "2026-05-31 14:12:00" },
    { id: 0, actorType: "user", actorId: 1, actorName: "城市读者", action: "预约座位", targetType: "reservation", targetId: "1", detail: "完成 A1 座位预约", createdAt: "2026-05-31 14:08:00" }
  ]
};

function recordRealtime(action, options = {}) {
  const entry = {
    id: Number(options.id || 0),
    actorType: options.actorType || "system",
    actorId: Number(options.actorId || 0),
    actorName: options.actorName || "系统",
    action,
    targetType: options.targetType || "",
    targetId: String(options.targetId || ""),
    detail: options.detail || action,
    createdAt: options.createdAt || nowText()
  };
  db.realtime.unshift(entry);
  db.realtime = db.realtime.slice(0, 100);
  return entry;
}

function homeData() {
  return {
    banners: [
      { title: "城市阅读与精品咖啡", image: "https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=1600&q=85" }
    ],
    recommendations: [
      { title: "桂花拿铁", description: "季节限定，桂花香气与中深烘豆融合。", tag: "每日咖啡", image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=900&q=80" },
      { title: "《慢读城市》", description: "本周主推城市散文精选。", tag: "每日书籍", image: "https://images.unsplash.com/photo-1521587760476-6c12a4b040da?auto=format&fit=crop&w=900&q=80" },
      { title: "周末拼桌读书会", description: "围绕旅行文学的开放交流。", tag: "活动推荐", image: "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=900&q=80" }
    ],
    stats: [
      { label: "累计会员", value: String(db.users.length), note: "数据库实时账户" },
      { label: "馆藏书籍", value: String(db.books.length), note: "精品书库实时收录" },
      { label: "预约记录", value: String(db.reservations.length), note: "座位预约实时累计" },
      { label: "活动场次", value: String(db.activities.length), note: "读书会与咖啡课程" }
    ],
    news: db.notices,
    coffees: [
      { title: "云南普洱日晒", description: "坚果、红糖、柔和酸质。", tag: "中国产区", image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=900&q=80" },
      { title: "埃塞俄比亚耶加雪菲", description: "柑橘、白花、茶感尾韵。", tag: "非洲产区", image: "https://images.unsplash.com/photo-1459755486867-b55449bb39ff?auto=format&fit=crop&w=900&q=80" },
      { title: "哥伦比亚蕙兰", description: "焦糖、苹果、平衡甜感。", tag: "南美产区", image: "https://images.unsplash.com/photo-1498804103079-a6351b050096?auto=format&fit=crop&w=900&q=80" }
    ],
    books: db.books
  };
}

function seatStatus(date = today(), time = "") {
  const ids = ["A1", "A2", "A3", "A4", "A5", "A6", "B1", "B2", "B3", "B4", "B5", "B6", "C1", "C2", "C3", "C4", "C5", "C6"];
  const active = db.reservations.filter((item) => item.date === date && (!time || item.time === time) && item.status !== "已取消");
  const statusMap = new Map();
  for (const reservation of active) {
    for (const id of String(reservation.seatId).split(",").filter(Boolean)) {
      statusMap.set(id, reservation.status === "使用中" ? "occupied" : "reserved");
    }
  }
  return ids.map((id) => ({ id, status: statusMap.get(id) || "free" }));
}

function dashboardData() {
  return {
    metrics: [
      { label: "今日访客量", value: "1,482", change: "+18%" },
      { label: "预约订单", value: db.reservations.length, change: "实时累计" },
      { label: "咖啡销量", value: "386", change: "招牌拿铁领先" },
      { label: "活动参与", value: db.activities.reduce((sum, item) => sum + item.applied, 0), change: "活动开放报名" }
    ],
    growth: [36, 42, 52, 48, 64, 72, 86, 80, 94, 100],
    realtime: db.realtime.slice(0, 5),
    realtimeCount: db.realtime.length,
    income: db.orders.filter(isPaidOrder).reduce((sum, item) => sum + Number(item.total || 0), 0)
  };
}

function incomeData() {
  const paidOrders = db.orders.filter(isPaidOrder);
  return {
    total: paidOrders.reduce((sum, item) => sum + Number(item.total || 0), 0),
    count: paidOrders.length,
    orders: paidOrders
  };
}

module.exports = { db, today, homeData, seatStatus, dashboardData, incomeData, recordRealtime };
