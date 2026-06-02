const { dashboardData, db, incomeData } = require("../shared/data");
const { getDatabaseOverview, reloadDatabase } = require("../shared/mysql");

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

module.exports = { adminSummary, moduleTableMap };
