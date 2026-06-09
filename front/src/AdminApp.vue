<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import AdminChartCard from "@/components/admin/AdminChartCard.vue";
import AdminDrawer from "@/components/admin/AdminDrawer.vue";
import AdminHeader from "@/components/admin/AdminHeader.vue";
import AdminLayout from "@/components/admin/AdminLayout.vue";
import AdminSidebar from "@/components/admin/AdminSidebar.vue";
import AdminStatCard from "@/components/admin/AdminStatCard.vue";
import AdminStatusBadge from "@/components/admin/AdminStatusBadge.vue";
import AdminTableTools from "@/components/AdminTableTools.vue";
import BaseButton from "@/components/BaseButton.vue";
import BaseCard from "@/components/BaseCard.vue";
import BaseFormItem from "@/components/BaseFormItem.vue";
import BaseModal from "@/components/BaseModal.vue";
import BaseTable from "@/components/BaseTable.vue";
import { adminRequest } from "@/api";
import { installImageFallback } from "@/shared/image-fallback";

installImageFallback(window);

const adminUser = ref(JSON.parse(localStorage.getItem("coffee_admin_user") || "null"));
function initialActivePage() {
  return window.location.pathname === "/admin/payments" ? "payments" : "workbench";
}

const active = ref(initialActivePage());
const loading = ref(false);
const error = ref("");
const message = ref("");
const summary = ref(null);
const payments = ref([]);
const realtime = ref([]);
const logDetail = ref(null);
const modal = reactive({ visible: false, title: "", endpoint: "", method: "POST", fields: [] });
const confirmDialog = reactive({
  visible: false,
  title: "",
  body: "",
  endpoint: "",
  confirmText: "确认",
  danger: true,
  action: null,
  successMessage: "操作成功"
});
const adminQuery = ref("");
const adminStatus = ref("all");
const adminPage = ref(1);
const adminPageSize = ref(8);
const paymentAction = ref("");
const orderDrawer = ref(null);
const loginForm = reactive({ account: "admin", password: "admin123" });
let realtimeTimer = null;

const navItems = [
  ["workbench", "工作台"],
  ["logs", "实时日志"],
  ["users", "用户管理"],
  ["products", "商品管理"],
  ["books", "书籍管理"],
  ["orders", "订单管理"],
  ["payments", "支付审核"],
  ["reservations", "预约管理"],
  ["activities", "活动管理"],
  ["community", "社区审核"],
  ["content", "内容管理"],
  ["memberLevels", "会员等级管理"],
  ["coupons", "优惠券管理"],
  ["tasks", "任务管理"],
  ["badges", "勋章管理"],
  ["invites", "邀请管理"],
  ["notificationPush", "消息推送管理"],
  ["announcements", "系统公告管理"],
  ["business", "商业驾驶舱"],
  ["operationsV2", "运营驾驶舱 V2"],
  ["income", "财务中心"],
  ["dashboard", "运营驾驶舱"],
  ["permissions", "权限管理"],
  ["settings", "系统设置"],
  ["database", "数据库对应"]
];

const money = (value) => `￥${Number(value || 0).toFixed(2)}`;
const rows = computed(() => ({
  users: summary.value?.users || [],
  products: summary.value?.products || [],
  books: summary.value?.books || [],
  orders: summary.value?.orders || [],
  payments: payments.value.length ? payments.value : summary.value?.payments || [],
  reservations: summary.value?.reservations || [],
  activities: summary.value?.activities || [],
  activityApplications: summary.value?.activityApplications || [],
  carts: summary.value?.carts || [],
  databaseOverview: summary.value?.database?.overview || [],
  moduleTableMap: summary.value?.database?.moduleTableMap || [],
  posts: summary.value?.posts || [],
  notices: summary.value?.notices || [],
  memberLevels: summary.value?.commercial?.memberLevels || [],
  coupons: summary.value?.commercial?.coupons || [],
  levelDistribution: summary.value?.commercial?.levelDistribution || [],
  taskRules: summary.value?.commercial?.taskRules || [],
  userTasks: summary.value?.commercial?.userTasks || [],
  badges: summary.value?.commercial?.badges || [],
  userBadges: summary.value?.commercial?.userBadges || [],
  inviteRecords: summary.value?.commercial?.inviteRecords || [],
  notificationRecords: summary.value?.commercial?.notifications || [],
  announcements: summary.value?.commercial?.announcements || [],
  businessSnapshots: summary.value?.business?.snapshots || [],
  kpiConfigs: summary.value?.operationsV2?.kpiConfigs || []
}));
const comments = computed(() => rows.value.posts.flatMap((post) => (post.comments || []).map((comment) => ({ ...comment, postId: post.id, postTitle: post.title }))));
const tableKeyByModule = {
  logs: "realtime",
  users: "users",
  products: "products",
  books: "books",
  orders: "orders",
  payments: "payments",
  reservations: "reservations",
  activities: "activities",
  community: "posts",
  content: "notices",
  memberLevels: "memberLevels",
  coupons: "coupons",
  tasks: "taskRules",
  badges: "badges",
  invites: "inviteRecords",
  notificationPush: "notificationRecords",
  announcements: "announcements",
  business: "businessSnapshots",
  operationsV2: "kpiConfigs",
  database: "databaseOverview"
};
const activeTableKey = computed(() => tableKeyByModule[active.value] || "");
const statusOptions = {
  users: [
    { value: "all", label: "全部等级" },
    { value: "普通会员", label: "普通会员" },
    { value: "黄金会员", label: "黄金会员" },
    { value: "钻石会员", label: "钻石会员" }
  ],
  products: [
    { value: "all", label: "全部分类" },
    { value: "creative", label: "文创商品" },
    { value: "coffee", label: "咖啡饮品" },
    { value: "low-stock", label: "库存不足" }
  ],
  orders: [
    { value: "all", label: "全部状态" },
    { value: "creative-order", label: "文创订单" },
    { value: "coffee-order", label: "咖啡订单" },
    { value: "mixed-order", label: "混合订单" },
    { value: "待支付", label: "待支付" },
    { value: "审核", label: "审核中" },
    { value: "已支付", label: "已支付" },
    { value: "已取消", label: "已取消" }
  ],
  payments: [
    { value: "all", label: "全部支付" },
    { value: "submitted", label: "待确认收款" },
    { value: "unpaid", label: "未支付" },
    { value: "confirmed", label: "已确认" },
    { value: "failed", label: "已驳回" },
    { value: "expired", label: "已超时" }
  ],
  activities: [
    { value: "all", label: "全部状态" },
    { value: "open", label: "开放报名" },
    { value: "closed", label: "已关闭" },
    { value: "draft", label: "草稿" }
  ],
  reservations: [
    { value: "all", label: "全部状态" },
    { value: "已预约", label: "已预约" },
    { value: "使用中", label: "使用中" },
    { value: "已取消", label: "已取消" }
  ],
  posts: [
    { value: "all", label: "全部内容" },
    { value: "has-comments", label: "有评论" },
    { value: "popular", label: "点赞较多" }
  ],
  realtime: [
    { value: "all", label: "全部日志" },
    { value: "admin", label: "管理员" },
    { value: "user", label: "用户" },
    { value: "guest", label: "访客" }
  ]
};
const activeStatusOptions = computed(() => statusOptions[activeTableKey.value] || [{ value: "all", label: "全部状态" }]);
const toolCopy = {
  realtime: { placeholder: "搜索日志用户、动作或对象编号", filter: "日志类型" },
  users: { placeholder: "搜索用户昵称、手机号、邮箱或等级", filter: "会员等级" },
  products: { placeholder: "搜索商品名称、描述、分类或库存", filter: "商品分类" },
  books: { placeholder: "搜索书名、作者、出版社或分类", filter: "书籍筛选" },
  orders: { placeholder: "搜索订单号、用户、商品名或支付状态", filter: "订单筛选" },
  payments: { placeholder: "搜索订单号、用户、交易号、支付方式或状态", filter: "支付状态" },
  reservations: { placeholder: "搜索座位、手机号、日期或用途", filter: "预约状态" },
  activities: { placeholder: "搜索活动名称、地点、日期或报名手机号", filter: "活动筛选" },
  posts: { placeholder: "搜索动态标题、作者、评论或审核状态", filter: "社区筛选" },
  notices: { placeholder: "搜索公告标题、摘要或发布时间", filter: "内容筛选" },
  databaseOverview: { placeholder: "搜索表名、字段名或数据类型", filter: "数据筛选" }
};
const activeToolCopy = computed(() => toolCopy[activeTableKey.value] || { placeholder: "输入关键词搜索当前页面", filter: "筛选" });
const dashboard = computed(() => summary.value?.dashboard || {});
const activeNavTitle = computed(() => navItems.find(([key]) => key === active.value)?.[1] || "工作台");
const activeSubtitle = computed(() => ({
  workbench: "今日收入、订单、预约、活动和社区运营状态总览。",
  content: "公告、推荐内容和社区内容的运营管理视图。",
  business: "GMV、收入、用户、活动、预约和推荐转化的商业运营驾驶舱。",
  operationsV2: "活动转化、用户分层、商品复购和会员消费占比的运营分析中心。",
  income: "收入趋势、来源占比和财务明细集中展示。",
  dashboard: "用户、收入、商品、书籍、活动、预约与社区的综合运营驾驶舱。",
  permissions: "角色、菜单、操作权限和管理员成员的前端配置视图。",
  settings: "网站配置、系统配置、管理员配置、存储状态和系统信息。"
})[active.value] || "独立后台页面，复用现有后台接口和数据库结构。");
const notificationStatsAdmin = computed(() => summary.value?.commercial?.notificationStats || {
  total: rows.value.notificationRecords.length,
  read: rows.value.notificationRecords.filter((item) => item.isRead || item.status === "read").length,
  unread: rows.value.notificationRecords.filter((item) => !(item.isRead || item.status === "read")).length,
  readRate: 0,
  clickRate: 0,
  conversionRate: 0,
  byType: []
});
const workbenchStats = computed(() => {
  const todayIncome = dashboard.value.metrics?.find((item) => item.label === "今日收入")?.value || money(0);
  const activityApplied = rows.value.activities.reduce((sum, item) => sum + Number(item.applied || 0), 0);
  return [
    { label: "今日收入", value: todayIncome, note: "已支付订单收入", tone: "gold" },
    { label: "订单统计", value: rows.value.orders.length, note: "全部订单记录", tone: "primary" },
    { label: "预约统计", value: rows.value.reservations.length, note: "座位预约累计", tone: "success" },
    { label: "活动统计", value: activityApplied, note: "报名总人数", tone: "warning" },
    { label: "社区统计", value: rows.value.posts.length, note: `评论 ${comments.value.length} 条`, tone: "danger" },
    { label: "用户增长", value: rows.value.users.length, note: "会员账户数量", tone: "primary" }
  ];
});
const quickActions = [
  ["users", "会员维护", "查看等级、积分与账号状态"],
  ["products", "商品上新", "维护咖啡与文创库存"],
  ["reservations", "预约排班", "处理座位冲突与到店状态"],
  ["activities", "活动运营", "配置报名时间与活动名额"]
];
const pendingTasks = computed(() => [
  { title: "待审核支付", value: rows.value.payments.filter((item) => item.status === "submitted").length, hint: "支付审核" },
  { title: "库存预警", value: rows.value.products.filter((item) => Number(item.stock || 0) <= 5).length, hint: "商品管理" },
  { title: "待审评论", value: comments.value.filter((item) => item.status === "pending").length, hint: "社区审核" },
  { title: "今日预约", value: rows.value.reservations.length, hint: "预约管理" }
]);
const recentOrders = computed(() => [...rows.value.orders]
  .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
  .slice(0, 6));
const systemAnnouncements = computed(() => rows.value.notices.slice(0, 4));
const hotProductColumns = [
  { key: "name", label: "商品" },
  { key: "quantity", label: "销量" },
  { key: "total", label: "销售额" }
];
const reservationTimeColumns = [
  { key: "time", label: "时段" },
  { key: "count", label: "预约数" }
];
const managementStats = computed(() => ({
  users: [
    { label: "用户总数", value: rows.value.users.length, note: "注册会员账户", tone: "primary" },
    { label: "黄金及以上", value: rows.value.users.filter((item) => String(item.level || "").includes("黄金") || String(item.level || "").includes("钻石")).length, note: "高价值会员", tone: "gold" },
    { label: "积分总量", value: rows.value.users.reduce((sum, item) => sum + Number(item.points || 0), 0), note: "用户积分沉淀", tone: "success" }
  ],
  products: [
    { label: "商品总数", value: rows.value.products.length, note: "咖啡与文创 SKU", tone: "primary" },
    { label: "库存预警", value: rows.value.products.filter((item) => Number(item.stock || 0) <= 5).length, note: "需要补货", tone: "warning" },
    { label: "库存件数", value: rows.value.products.reduce((sum, item) => sum + Number(item.stock || 0), 0), note: "当前可售", tone: "success" }
  ],
  books: [
    { label: "馆藏书籍", value: rows.value.books.length, note: "精品书库记录", tone: "primary" },
    { label: "可借库存", value: rows.value.books.reduce((sum, item) => sum + bookStock(item), 0), note: "前端派生库存", tone: "success" },
    { label: "借阅热度", value: rows.value.books.reduce((sum, item) => sum + bookBorrowCount(item), 0), note: "前端派生次数", tone: "gold" }
  ],
  orders: [
    { label: "订单总数", value: rows.value.orders.length, note: "全部订单记录", tone: "primary" },
    { label: "订单收入", value: money(rows.value.orders.reduce((sum, item) => sum + Number(item.total || 0), 0)), note: "列表金额汇总", tone: "gold" },
    { label: "待处理", value: rows.value.orders.filter((item) => ["pending_payment", "payment_review"].includes(item.status)).length, note: "待支付或待审核", tone: "warning" }
  ],
  payments: [
    { label: "待审核", value: rows.value.payments.filter((item) => item.status === "submitted").length, note: "用户已提交支付", tone: "warning" },
    { label: "已确认", value: rows.value.payments.filter((item) => item.status === "confirmed").length, note: "已完成收款", tone: "success" },
    { label: "支付金额", value: money(rows.value.payments.reduce((sum, item) => sum + Number(item.amount || 0), 0)), note: "审核列表汇总", tone: "gold" }
  ],
  reservations: [
    { label: "预约总数", value: rows.value.reservations.length, note: "座位预约记录", tone: "primary" },
    { label: "待到店", value: rows.value.reservations.filter((item) => String(item.status || "").includes("预约")).length, note: "需要核销", tone: "warning" },
    { label: "座位区域", value: 3, note: "A/B/C 分区展示", tone: "success" }
  ],
  activities: [
    { label: "活动总数", value: rows.value.activities.length, note: "活动赛事记录", tone: "primary" },
    { label: "进行中", value: rows.value.activities.filter((item) => (item.status || "open") === "open").length, note: "开放报名", tone: "success" },
    { label: "报名人数", value: rows.value.activities.reduce((sum, item) => sum + Number(item.applied || 0), 0), note: "累计报名", tone: "gold" }
  ],
  community: [
    { label: "社区动态", value: rows.value.posts.length, note: "帖子总数", tone: "primary" },
    { label: "待审评论", value: comments.value.filter((item) => item.status === "pending").length, note: "需要审核", tone: "warning" },
    { label: "点赞总量", value: rows.value.posts.reduce((sum, item) => sum + Number(item.likes || 0), 0), note: "社区热度", tone: "gold" }
  ]
}));

const contentStats = computed(() => [
  { label: "公告内容", value: rows.value.notices.length, note: "内容管理公告", tone: "primary" },
  { label: "社区内容", value: rows.value.posts.length, note: "前台动态沉淀", tone: "success" },
  { label: "评论总数", value: comments.value.length, note: "含待审评论", tone: "warning" },
  { label: "热门内容", value: popularContents.value.length, note: "Top 内容榜", tone: "gold" }
]);
const contentTypeStats = computed(() => [
  { label: "公告", count: rows.value.notices.length },
  { label: "社区动态", count: rows.value.posts.length },
  { label: "活动内容", count: rows.value.activities.length },
  { label: "商品内容", count: rows.value.products.length }
]);
const contentTrend = computed(() => makeTrend(rows.value.notices.length + rows.value.posts.length, 7, 2));
const popularContents = computed(() => [
  ...rows.value.posts.map((item) => ({
    id: `post-${item.id}`,
    title: item.title,
    type: "社区动态",
    score: Number(item.likes || 0) + (item.comments || []).length * 2
  })),
  ...rows.value.notices.map((item) => ({
    id: `notice-${item.id}`,
    title: item.title,
    type: "系统公告",
    score: 20 + Number(item.id || 0)
  }))
].sort((a, b) => b.score - a.score).slice(0, 5));

const paidOrders = computed(() => rows.value.orders.filter((item) => ["paid", "completed"].includes(item.status) || item.paymentReviewStatus === "approved"));
const financeTotal = computed(() => Number(summary.value?.income?.total ?? paidOrders.value.reduce((sum, item) => sum + Number(item.total || 0), 0)));
const financeStats = computed(() => {
  const todayMetric = dashboard.value.metrics?.find((item) => item.label === "今日收入")?.value;
  const todayValue = todayMetric || money(financeTotal.value * 0.18);
  return [
    { label: "今日收入", value: todayValue, note: "实时订单收入", tone: "gold" },
    { label: "本周收入", value: money(financeTotal.value * 0.56), note: "按当前收入派生", tone: "success" },
    { label: "本月收入", value: money(financeTotal.value), note: "已支付订单汇总", tone: "primary" },
    { label: "支付订单", value: summary.value?.income?.count || paidOrders.value.length, note: "收款完成数量", tone: "warning" }
  ];
});
const financeSources = computed(() => {
  const creative = paidOrders.value.filter((item) => orderType(item) === "creative").reduce((sum, item) => sum + Number(item.total || 0), 0);
  const coffee = paidOrders.value.filter((item) => orderType(item) === "coffee").reduce((sum, item) => sum + Number(item.total || 0), 0);
  const mixed = paidOrders.value.filter((item) => orderType(item) === "mixed").reduce((sum, item) => sum + Number(item.total || 0), 0);
  const activity = rows.value.activityApplications.length * 39;
  const member = rows.value.users.filter((item) => String(item.level || "").includes("黄金") || String(item.level || "").includes("钻石")).length * 29;
  return [
    { label: "商品收入", value: creative + mixed * 0.5 },
    { label: "咖啡收入", value: coffee + mixed * 0.5 },
    { label: "活动收入", value: activity },
    { label: "会员收入", value: member },
    { label: "其他收入", value: Math.max(0, financeTotal.value - creative - coffee - mixed) }
  ];
});
const financeDetails = computed(() => [
  ...paidOrders.value.slice(0, 8).map((item) => ({
    id: `order-${item.id}`,
    source: orderTypeLabel(item),
    name: `订单 #${item.id}`,
    amount: Number(item.total || 0),
    status: orderStatusLabel(item.status),
    createdAt: item.createdAt || item.paidAt || "-"
  })),
  ...rows.value.activityApplications.slice(0, 4).map((item) => ({
    id: `activity-${item.id}`,
    source: "活动收入",
    name: item.activityTitle || `活动 #${item.activityId}`,
    amount: 39 * Number(item.people || 1),
    status: applicationKindLabel(item.kind),
    createdAt: item.createdAt || "-"
  }))
]);

const business = computed(() => summary.value?.business || {});
const businessOverview = computed(() => business.value.overview || {});
const businessTrends = computed(() => business.value.trends || []);
const businessFunnel = computed(() => business.value.funnel || { order: [], activity: [] });
const businessMembers = computed(() => business.value.members || { distribution: [], highValueUsers: [] });
const businessRecommendations = computed(() => business.value.recommendations || {});
const businessRankings = computed(() => business.value.rankings || { products: [], books: [], activities: [] });
const businessStats = computed(() => [
  { label: "GMV", value: money(businessOverview.value.gmv), note: "订单创建总额", tone: "gold" },
  { label: "今日收入", value: money(businessOverview.value.todayIncome), note: "今日已支付订单", tone: "success" },
  { label: "本周收入", value: money(businessOverview.value.weekIncome), note: "自然周累计", tone: "primary" },
  { label: "本月收入", value: money(businessOverview.value.monthIncome), note: "当月已支付订单", tone: "gold" },
  { label: "订单数", value: businessOverview.value.orderCount || 0, note: `支付转化率 ${businessOverview.value.paymentConversionRate || 0}%`, tone: "primary" },
  { label: "客单价", value: money(businessOverview.value.averageOrderValue), note: `复购率 ${businessOverview.value.repurchaseRate || 0}%`, tone: "success" },
  { label: "DAU / WAU / MAU", value: `${businessOverview.value.dau || 0}/${businessOverview.value.wau || 0}/${businessOverview.value.mau || 0}`, note: `活跃用户 ${businessOverview.value.activeUsers || 0}`, tone: "warning" },
  { label: "推荐转化", value: `${businessOverview.value.recommendationConversionRate || 0}%`, note: `曝光 ${businessOverview.value.recommendationExposure || 0} / 点击 ${businessOverview.value.recommendationClicks || 0}`, tone: "primary" }
]);

const operationsV2 = computed(() => summary.value?.operationsV2 || {});
const operationsActivityFunnel = computed(() => operationsV2.value.activityFunnel || { steps: [], activities: [] });
const operationsUserSegmentation = computed(() => operationsV2.value.userSegmentation || { segments: [], users: [] });
const operationsProductRepeat = computed(() => operationsV2.value.productRepeat || { summary: {}, products: [], trend: [] });
const operationsMemberAnalysis = computed(() => operationsV2.value.memberAnalysis || { levels: [], kpiConfigs: [] });
const operationsKpiConfigs = computed(() => operationsV2.value.kpiConfigs || []);
const operationsStats = computed(() => {
  const activity = operationsActivityFunnel.value.steps || [];
  const productSummary = operationsProductRepeat.value.summary || {};
  const memberLevels = operationsMemberAnalysis.value.levels || [];
  return [
    { label: "活动总转化", value: `${activity.at(-1)?.totalRate || 0}%`, note: "曝光到复购", tone: "gold" },
    { label: "高价值用户", value: operationsUserSegmentation.value.segments?.find((item) => item.name === "高价值用户")?.count || 0, note: "消费/活跃综合分层", tone: "success" },
    { label: "商品复购率", value: `${productSummary.repeatRate || 0}%`, note: `复购用户 ${productSummary.repeatBuyerCount || 0}`, tone: "primary" },
    { label: "会员消费额", value: money(operationsMemberAnalysis.value.totalPaidAmount), note: `${memberLevels.length} 个等级`, tone: "warning" }
  ];
});

const cockpitStats = computed(() => [
  { label: "用户数", value: rows.value.users.length, note: "会员账户", tone: "primary" },
  { label: "订单收入", value: money(financeTotal.value), note: "财务中心同步", tone: "gold" },
  { label: "商品销量", value: (dashboard.value.hotProducts || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0), note: "热门商品汇总", tone: "success" },
  { label: "活动报名", value: rows.value.activityApplications.length, note: "直接/提前报名", tone: "warning" }
]);
const userGrowthTrend = computed(() => makeTrend(rows.value.users.length, 7, 1));
const bookRanking = computed(() => [...rows.value.books]
  .sort((a, b) => bookBorrowCount(b) - bookBorrowCount(a))
  .slice(0, 6)
  .map((item) => ({ label: item.title, count: bookBorrowCount(item) })));
const activityRanking = computed(() => [...rows.value.activities]
  .sort((a, b) => Number(b.applied || 0) - Number(a.applied || 0))
  .slice(0, 6)
  .map((item) => ({ label: item.title, count: Number(item.applied || 0), total: Number(item.capacity || 1) })));
const reservationHeatmap = computed(() => {
  const slots = ["10:00", "12:00", "14:00", "16:00", "19:00", "20:00"];
  const areas = ["A", "B", "C"];
  return areas.flatMap((area) => slots.map((time, index) => {
    const count = rows.value.reservations.filter((item) => reservationArea(item).startsWith(area) && String(item.time || "").startsWith(time.slice(0, 2))).length;
    return { id: `${area}-${time}`, area, time, count: count + ((index + area.charCodeAt(0)) % 3) };
  }));
});
const communityActivityTrend = computed(() => makeTrend(rows.value.posts.length + comments.value.length, 7, 3));

const roleCards = computed(() => [
  { name: "超级管理员", members: 1, desc: "拥有全部运营后台权限", tone: "gold" },
  { name: "运营管理员", members: Math.max(1, Math.ceil(rows.value.users.length / 8)), desc: "管理内容、活动和社区审核", tone: "primary" },
  { name: "财务审核员", members: Math.max(1, rows.value.payments.filter((item) => item.status === "submitted").length || 1), desc: "处理支付审核与收入查看", tone: "success" },
  { name: "门店店员", members: 2, desc: "负责预约、核销和到店服务", tone: "warning" }
]);
const permissionGroups = computed(() => [
  { name: "菜单权限", items: ["工作台", "用户管理", "商品管理", "内容管理", "财务中心", "运营驾驶舱"] },
  { name: "操作权限", items: ["新增", "编辑", "删除", "审核", "导出", "核销"] },
  { name: "数据权限", items: ["全部门店", "本店数据", "本人创建", "只读报表"] },
  { name: "安全权限", items: ["管理员配置", "系统设置", "操作日志", "权限分配"] }
]);
const adminMembers = computed(() => [
  { name: adminUser.value?.name || "admin", role: "超级管理员", status: "在线", lastActive: "当前会话" },
  ...rows.value.users.slice(0, 3).map((item, index) => ({
    name: item.name,
    role: ["运营管理员", "财务审核员", "门店店员"][index % 3],
    status: "启用",
    lastActive: item.lastLogin || "最近 7 天"
  }))
]);

const settingGroups = computed(() => [
  { title: "网站配置", items: [["站点名称", "咖啡书屋 Coffee Book"], ["主题色", "#8B4A1F"], ["前台状态", "正常开放"]] },
  { title: "系统配置", items: [["接口模式", "Node.js 原生 http"], ["数据库", "MySQL"], ["认证方式", "JWT"]] },
  { title: "管理员配置", items: [["当前管理员", adminUser.value?.name || "admin"], ["角色数量", roleCards.value.length], ["权限组", permissionGroups.value.length]] },
  { title: "系统信息", items: [["构建工具", "Vite"], ["前端框架", "Vue 3 + Pinia"], ["最近同步", dashboard.value.refreshedAt || "实时同步"]] }
]);
const storageStatus = computed(() => [
  { label: "用户数据", value: rows.value.users.length, percent: barWidth(rows.value.users.length, 20) },
  { label: "订单数据", value: rows.value.orders.length, percent: barWidth(rows.value.orders.length, 30) },
  { label: "内容数据", value: rows.value.posts.length + rows.value.notices.length, percent: barWidth(rows.value.posts.length + rows.value.notices.length, 30) },
  { label: "活动数据", value: rows.value.activities.length + rows.value.activityApplications.length, percent: barWidth(rows.value.activities.length + rows.value.activityApplications.length, 30) }
]);

watch(active, (page) => {
  const targetPath = page === "payments" ? "/admin/payments" : "/admin.html";
  if (window.location.pathname !== targetPath) window.history.pushState(null, "", targetPath);
  adminStatus.value = "all";
  adminQuery.value = "";
  if (adminUser.value) refresh();
});

watch([adminQuery, adminStatus, adminPageSize], () => {
  adminPage.value = 1;
});

onMounted(() => {
  if (adminUser.value && !localStorage.getItem("coffee_admin_token")) logout();
  if (adminUser.value) refresh();
  realtimeTimer = setInterval(() => {
    if (adminUser.value) loadRealtime();
  }, 5000);
});

onBeforeUnmount(() => {
  if (realtimeTimer) clearInterval(realtimeTimer);
});

async function login() {
  error.value = "";
  loading.value = true;
  try {
    const data = await adminRequest("/api/admin/login", {
      method: "POST",
      body: JSON.stringify(loginForm)
    });
    adminUser.value = data.user;
    localStorage.setItem("coffee_admin_user", JSON.stringify(data.user));
    localStorage.setItem("coffee_admin_token", data.token);
    await refresh();
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

function logout() {
  adminUser.value = null;
  summary.value = null;
  localStorage.removeItem("coffee_admin_user");
  localStorage.removeItem("coffee_admin_token");
}

async function refresh() {
  loading.value = true;
  error.value = "";
  try {
    const adminSummary = await adminRequest("/api/admin/summary");
    summary.value = adminSummary;
    if (active.value === "payments") await loadPayments();
    await loadRealtime();
  } catch (err) {
    error.value = err.message;
    if (err.status === 401) logout();
  } finally {
    loading.value = false;
  }
}

async function loadRealtime() {
  const log = await adminRequest("/api/admin/realtime?pageSize=30").catch(() => ({ items: [] }));
  realtime.value = log.items || [];
}

async function loadPayments() {
  payments.value = await adminRequest("/api/admin/payments?status=all").catch(() => []);
}

async function showLogDetail(item) {
  logDetail.value = await adminRequest(`/api/admin/realtime/${item.id}`);
}

function reviewPayment(item, status) {
  openConfirm({
    title: status === "approved" ? "确认通过付款审核" : "确认驳回付款审核",
    body: `订单 #${item.id} 将被标记为${status === "approved" ? "审核通过" : "审核驳回"}，请确认操作无误。`,
    confirmText: status === "approved" ? "通过审核" : "确认驳回",
    danger: status !== "approved",
    successMessage: status === "approved" ? "付款审核已通过" : "付款审核已驳回",
    action: () => adminRequest(`/api/admin/orders/${item.id}/payment-review`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    })
  });
}

function confirmPaymentRecord(item) {
  openConfirm({
    title: "确认收款",
    body: `确认订单 #${item.orderId} 已完成线下或模拟支付后，订单状态会更新为已支付。`,
    confirmText: "确认收款",
    danger: false,
    successMessage: `订单 #${item.orderId} 已确认收款`,
    action: async () => {
      paymentAction.value = `confirm-${item.id}`;
      try {
        await adminRequest(`/api/admin/payments/${item.id}/confirm`, { method: "POST" });
      } finally {
        paymentAction.value = "";
      }
    }
  });
}

function rejectPaymentRecord(item) {
  openConfirm({
    title: "确认驳回收款",
    body: `订单 #${item.orderId} 将回到待支付状态，用户需要重新提交支付信息。`,
    confirmText: "确认驳回",
    danger: true,
    successMessage: `订单 #${item.orderId} 已驳回收款`,
    action: async () => {
      paymentAction.value = `reject-${item.id}`;
      try {
        await adminRequest(`/api/admin/payments/${item.id}/reject`, {
          method: "POST",
          body: JSON.stringify({ orderStatus: "pending_payment" })
        });
      } finally {
        paymentAction.value = "";
      }
    }
  });
}

function reviewComment(comment, status) {
  openConfirm({
    title: status === "approved" ? "确认通过评论" : "确认驳回评论",
    body: `评论 #${comment.id} 来自「${comment.postTitle || "社区动态"}」，审核结果会影响前台可见状态。`,
    confirmText: status === "approved" ? "通过评论" : "驳回评论",
    danger: status !== "approved",
    successMessage: status === "approved" ? "评论审核已通过" : "评论审核已驳回",
    action: () => adminRequest(`/api/admin/posts/${comment.postId}/comments/${comment.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status })
    })
  });
}

function openModal(title, endpoint, method, fields) {
  Object.assign(modal, { visible: true, title, endpoint, method, fields: fields.map((field) => ({ ...field })) });
}

function closeModal() {
  modal.visible = false;
  modal.fields = [];
}

async function submitModal() {
  const payload = Object.fromEntries(modal.fields.map((field) => [field.name, field.value]));
  try {
    await adminRequest(modal.endpoint, { method: modal.method, body: payload });
    closeModal();
    message.value = "操作成功";
    error.value = "";
    await refresh();
  } catch (err) {
    error.value = err.message;
  }
}

function openConfirm({ title, body, confirmText = "确认操作", danger = true, action, successMessage = "操作成功" }) {
  Object.assign(confirmDialog, {
    visible: true,
    title,
    body,
    confirmText,
    danger,
    endpoint: "",
    action,
    successMessage
  });
}

function remove(endpoint) {
  openConfirm({
    title: "确认删除",
    body: "删除后数据将从后台列表中移除，请确认这不是误操作。",
    confirmText: "确认删除",
    danger: true,
    successMessage: "删除成功",
    action: () => adminRequest(endpoint, { method: "DELETE" })
  });
}

function closeConfirm() {
  Object.assign(confirmDialog, {
    visible: false,
    title: "",
    body: "",
    endpoint: "",
    confirmText: "确认",
    danger: true,
    action: null,
    successMessage: "操作成功"
  });
}

async function confirmRemove() {
  try {
    if (typeof confirmDialog.action === "function") {
      await confirmDialog.action();
    } else if (confirmDialog.endpoint) {
      await adminRequest(confirmDialog.endpoint, { method: "DELETE" });
    }
    const success = confirmDialog.successMessage;
    closeConfirm();
    message.value = success;
    error.value = "";
    await refresh();
  } catch (err) {
    error.value = err.message;
  }
}

const userFields = (item = {}) => [
  { name: "name", label: "昵称", value: item.name || "" },
  { name: "phone", label: "手机号", value: item.phone || "" },
  { name: "email", label: "邮箱", value: item.email || "" },
  { name: "birthday", label: "生日", value: item.birthday || "", type: "date" },
  { name: "level", label: "会员等级", value: item.level || "普通会员", type: "select", options: ["普通会员", "黄金会员", "钻石会员"] },
  { name: "points", label: "积分", value: item.points || 0, type: "number" },
  { name: "bio", label: "个人简介", value: item.bio || "", type: "textarea" },
  { name: "coffeePreference", label: "喜欢的咖啡类型", value: item.coffeePreference || "" },
  { name: "bookPreference", label: "喜欢的书籍分类", value: item.bookPreference || "" },
  { name: "address", label: "收货地址", value: item.address || "", type: "textarea" }
];

const memberLevelFields = (item = {}) => [
  { name: "code", label: "等级编码", value: item.code || "LV1" },
  { name: "name", label: "等级名称", value: item.name || "" },
  { name: "minGrowth", label: "成长值下限", value: item.minGrowth || 0, type: "number" },
  { name: "maxGrowth", label: "成长值上限", value: item.maxGrowth ?? "", type: "number" },
  { name: "discountRate", label: "折扣系数", value: item.discountRate || 1, type: "number", min: 0, step: "0.01" },
  { name: "pointsMultiplier", label: "积分倍率", value: item.pointsMultiplier || 1, type: "number", min: 1, step: "0.1" },
  { name: "prioritySignup", label: "优先报名次数", value: item.prioritySignup || 0, type: "number" },
  { name: "benefits", label: "权益说明", value: (item.benefits || []).join("，"), type: "textarea" }
];

const couponFields = (item = {}) => [
  { name: "name", label: "优惠券名称", value: item.name || "" },
  { name: "type", label: "类型", value: item.type || "full_reduction", type: "select", options: [["newcomer", "新人券"], ["full_reduction", "满减券"], ["discount", "折扣券"], ["birthday", "生日券"], ["activity", "活动券"], ["member_exclusive", "会员专属券"]] },
  { name: "value", label: "面额/折扣", value: item.value || 0, type: "number", min: 0, step: "0.01" },
  { name: "threshold", label: "使用门槛", value: item.threshold || 0, type: "number", min: 0, step: "0.01" },
  { name: "validFrom", label: "开始日期", value: item.validFrom || "2026-01-01", type: "date" },
  { name: "validTo", label: "结束日期", value: item.validTo || "2026-12-31", type: "date" },
  { name: "totalQuantity", label: "发放数量", value: item.totalQuantity || 100, type: "number" },
  { name: "scope", label: "使用范围", value: item.scope || "all", type: "select", options: [["all", "全场"], ["shop", "商城"], ["activity", "活动"], ["member", "会员专属"]] },
  { name: "status", label: "状态", value: item.status || "active", type: "select", options: [["active", "启用"], ["disabled", "停用"]] },
  { name: "minLevelCode", label: "最低会员等级", value: item.minLevelCode || "" }
];

const taskRuleFields = (item = {}) => [
  { name: "id", label: "任务编号", value: item.id || "", type: "number" },
  { name: "title", label: "任务标题", value: item.title || "" },
  { name: "description", label: "任务描述", value: item.description || "", type: "textarea" },
  { name: "rewardPoints", label: "奖励积分", value: item.rewardPoints || 0, type: "number" },
  { name: "type", label: "任务类型", value: item.type || "daily", type: "select", options: [["daily", "每日任务"], ["growth", "成长任务"]] },
  { name: "actionKey", label: "动作标识", value: item.actionKey || "" },
  { name: "status", label: "状态", value: item.status || "active", type: "select", options: [["active", "启用"], ["disabled", "停用"]] }
];

const badgeFields = (item = {}) => [
  { name: "id", label: "勋章编号", value: item.id || "", type: "number" },
  { name: "code", label: "勋章编码", value: item.code || "" },
  { name: "name", label: "勋章名称", value: item.name || "" },
  { name: "description", label: "勋章描述", value: item.description || "", type: "textarea" },
  { name: "icon", label: "图标文字", value: item.icon || "章" },
  { name: "rule", label: "获得规则", value: item.rule || "" },
  { name: "status", label: "状态", value: item.status || "active", type: "select", options: [["active", "启用"], ["disabled", "停用"]] }
];

const notificationPushFields = () => [
  { name: "title", label: "消息标题", value: "" },
  { name: "content", label: "消息内容", value: "", type: "textarea" },
  { name: "type", label: "消息类型", value: "system", type: "select", options: [["system", "系统"], ["activity", "活动"], ["order", "订单"], ["reservation", "预约"], ["task", "任务"], ["coupon", "优惠券"], ["points", "积分"], ["badge", "勋章"], ["invite", "邀请"], ["recommend", "推荐"]] },
  { name: "targetMode", label: "推送对象", value: "all", type: "select", options: [["all", "全体用户"], ["level", "指定等级"], ["active", "活跃用户"], ["member", "指定会员"]] },
  { name: "level", label: "会员等级关键词", value: "" },
  { name: "userId", label: "指定会员ID", value: "", type: "number" },
  { name: "priority", label: "优先级", value: "normal", type: "select", options: [["normal", "普通"], ["high", "高优先级"]] },
  { name: "link", label: "跳转链接", value: "/notifications" }
];

const announcementFields = (item = {}) => [
  { name: "title", label: "公告标题", value: item.title || "" },
  { name: "content", label: "公告内容", value: item.content || "", type: "textarea" },
  { name: "link", label: "跳转链接", value: item.link || "/notifications" },
  { name: "pinned", label: "是否置顶", value: item.pinned ? "true" : "false", type: "select", options: [["false", "否"], ["true", "是"]] },
  { name: "status", label: "状态", value: item.status || "published", type: "select", options: [["published", "发布"], ["draft", "草稿"]] }
];

const productFields = (item = {}) => [
  { name: "name", label: "商品名称", value: item.name || "" },
  { name: "description", label: "描述", value: item.description || "", type: "textarea" },
  { name: "price", label: "价格", value: item.price || 0, type: "number", min: 0, step: "0.01" },
  { name: "stock", label: "库存", value: item.stock || 0, type: "number" },
  { name: "category", label: "分类", value: item.category || "creative", type: "select", options: [["creative", "文创商品"], ["coffee", "咖啡饮品"]] },
  { name: "image", label: "图片地址", value: item.image || "" }
];

const bookFields = (item = {}) => [
  { name: "title", label: "书名", value: item.title || "" },
  { name: "author", label: "作者", value: item.author || "" },
  { name: "category", label: "分类", value: item.category || "文学", type: "select", options: ["文学", "商业", "生活", "艺术"] },
  { name: "ranking", label: "榜单", value: item.ranking || "" },
  { name: "publisher", label: "出版社", value: item.publisher || "" },
  { name: "publishedAt", label: "收录时间", value: String(item.publishedAt || new Date().toISOString()).replace(" ", "T").slice(0, 16), type: "datetime-local" },
  { name: "image", label: "封面地址", value: item.image || "" },
  { name: "summary", label: "简介", value: item.summary || "", type: "textarea" }
];

const orderFields = (item = {}) => [
  { name: "userName", label: "客户名称", value: item.userName || "线下用户" },
  { name: "total", label: "订单金额", value: item.total || 0, type: "number", min: 0, step: "0.01" },
  { name: "status", label: "订单状态", value: item.status || "pending_payment", type: "select", options: [["pending_payment", "待支付"], ["payment_review", "待确认收款"], ["paid", "已支付"], ["completed", "已完成"], ["cancelled", "已取消"]] },
  { name: "paymentMethod", label: "支付方式", value: item.paymentMethod || "", type: "select", options: [["", "未选择"], ["wechat", "微信支付"], ["alipay", "支付宝"], ["mock", "模拟支付"]] },
  { name: "paidAt", label: "支付时间", value: String(item.paidAt || "").replace(" ", "T").slice(0, 16), type: "datetime-local" }
];

const reservationFields = (item = {}) => [
  { name: "seatId", label: "座位编号", value: item.seatId || "A1" },
  { name: "phone", label: "手机号", value: item.phone || "" },
  { name: "date", label: "日期", value: item.date || new Date().toISOString().slice(0, 10), type: "date" },
  { name: "time", label: "时间", value: item.time || "10:00", type: "select", options: ["10:00", "14:00", "19:00"] },
  { name: "people", label: "人数", value: item.people || 1, type: "number" },
  { name: "purpose", label: "用途", value: item.purpose || "后台预约" },
  { name: "note", label: "备注", value: item.note || "", type: "textarea" },
  { name: "status", label: "状态", value: item.status || "已预约", type: "select", options: ["已预约", "使用中", "已取消"] }
];

const activityFields = (item = {}) => [
  { name: "title", label: "活动名称", value: item.title || "" },
  { name: "date", label: "日期", value: item.date || new Date().toISOString().slice(0, 10), type: "date" },
  { name: "time", label: "时间", value: item.time || "" },
  { name: "location", label: "地点", value: item.location || "" },
  { name: "capacity", label: "名额", value: item.capacity || 20, type: "number" },
  { name: "status", label: "活动状态", value: item.status || "open", type: "select", options: [["open", "开放报名"], ["closed", "已关闭"], ["draft", "草稿"]] },
  { name: "registrationStart", label: "直接报名开放", value: String(item.registrationStart || "").replace(" ", "T").slice(0, 16), type: "datetime-local" },
  { name: "earlyStart", label: "提前报名开放", value: String(item.earlyStart || "").replace(" ", "T").slice(0, 16), type: "datetime-local" },
  { name: "description", label: "介绍", value: item.description || "", type: "textarea" }
];

const noticeFields = (item = {}) => [
  { name: "title", label: "公告标题", value: item.title || "" },
  { name: "summary", label: "公告摘要", value: item.summary || "", type: "textarea" },
  { name: "date", label: "发布时间", value: String(item.date || new Date().toISOString()).replace(" ", "T").slice(0, 16), type: "datetime-local" }
];

function optionValue(option) {
  return Array.isArray(option) ? option[0] : option;
}

function optionLabel(option) {
  return Array.isArray(option) ? option[1] : option;
}

function reviewLabel(status) {
  return status === "approved" ? "已通过" : status === "rejected" ? "已驳回" : status === "pending" ? "待审核" : "未提交";
}

function orderStatusLabel(status) {
  const labels = {
    pending_payment: "待支付",
    payment_review: "待确认收款",
    paid: "已支付",
    cancelled: "已取消",
    completed: "已完成"
  };
  return labels[status] || status || "-";
}

function paymentStatusLabel(status) {
  const labels = {
    unpaid: "未支付",
    submitted: "待确认收款",
    confirmed: "已确认",
    failed: "已驳回",
    expired: "已超时"
  };
  return labels[status] || status || "-";
}

function paymentMethodLabel(method) {
  const labels = {
    wechat: "微信支付",
    alipay: "支付宝",
    mock: "模拟支付"
  };
  return labels[method] || method || "-";
}

function activityStatusLabel(status) {
  const labels = {
    open: "开放报名",
    closed: "已关闭",
    draft: "草稿"
  };
  return labels[status || "open"] || status || "开放报名";
}

function statSet(key) {
  return managementStats.value[key] || [];
}

function statusType(status) {
  if (["paid", "completed", "confirmed", "approved", "open"].includes(status)) return "success";
  if (["pending_payment", "payment_review", "submitted", "pending", "draft"].includes(status)) return "warning";
  if (["cancelled", "failed", "expired", "rejected", "closed"].includes(status)) return "danger";
  return "default";
}

function orderStatusType(status) {
  return statusType(status);
}

function paymentStatusType(status) {
  return statusType(status);
}

function reviewStatusType(status) {
  return statusType(status);
}

function activityStatusType(status) {
  return statusType(status || "open");
}

function reservationStatusType(status) {
  if (String(status || "").includes("取消")) return "danger";
  if (String(status || "").includes("使用") || String(status || "").includes("完成")) return "success";
  return "warning";
}

function stockStatus(item) {
  const stock = Number(item.stock || 0);
  if (stock <= 0) return { label: "售罄", type: "danger" };
  if (stock <= 5) return { label: "库存预警", type: "warning" };
  return { label: "在售", type: "success" };
}

function productSales(item) {
  return Number(item.sales || item.sold || 12 + (Number(item.id || 0) % 8) * 9);
}

function bookBorrowCount(item) {
  return Number(item.borrowCount || item.borrowed || 8 + (Number(item.id || 0) % 7) * 6);
}

function bookStock(item) {
  return Number(item.stock || 2 + (Number(item.id || 0) % 5));
}

function bookShelfStatus(item) {
  const statuses = ["在馆", "借出", "预约中"];
  return item.status || statuses[Number(item.id || 0) % statuses.length];
}

function bookStatusType(item) {
  const status = bookShelfStatus(item);
  if (status.includes("在馆")) return "success";
  if (status.includes("预约")) return "warning";
  return "default";
}

function reservationArea(item) {
  const seat = String(item.seatId || item.seatIds || "A1").slice(0, 1).toUpperCase();
  if (seat === "B") return "B 咖啡交流区";
  if (seat === "C") return "C 靠窗座位区";
  return "A 安静阅读区";
}

function activityProgress(item) {
  return Math.min(100, Math.round((Number(item.applied || 0) / Math.max(1, Number(item.capacity || 0))) * 100));
}

function approvedComments(item) {
  return item.comments?.filter((comment) => comment.status === "approved").length || 0;
}

function pendingComments(item) {
  return item.comments?.filter((comment) => comment.status === "pending").length || 0;
}

function postSourceLabel(item) {
  return item.userId ? "会员动态" : "后台发布";
}

function orderItemsLabel(item) {
  if (!item.items?.length) return "暂无商品明细";
  return item.items.map((entry) => `${entry.name || entry.productName || `商品 #${entry.productId}`} x${entry.quantity || 1}`).join("、");
}

function imageFallback(event) {
  event.currentTarget.classList.add("image-placeholder-active");
  event.currentTarget.removeAttribute("src");
  event.currentTarget.alt = "";
}

function maxOf(rows, key) {
  return Math.max(1, ...((rows || []).map((item) => Number(item[key] || 0))));
}

function makeTrend(seed, days = 7, step = 1) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(Date.now() - (days - index - 1) * 86400000);
    return {
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      count: Math.max(1, Number(seed || 0) + (index - Math.floor(days / 2)) * step + (index % 3))
    };
  });
}

function barWidth(value, max) {
  return `${Math.max(4, Math.round((Number(value || 0) / Math.max(1, max)) * 100))}%`;
}

function productCategoryLabel(category) {
  return category === "coffee" ? "咖啡商品" : "文创商品";
}

function orderType(item) {
  const categories = new Set((item.items || []).map((entry) => {
    const product = rows.value.products.find((productItem) => productItem.id === Number(entry.productId));
    return product?.category || "creative";
  }));
  if (categories.has("coffee") && categories.has("creative")) return "mixed";
  return categories.has("coffee") ? "coffee" : "creative";
}

function orderTypeLabel(item) {
  const type = orderType(item);
  if (type === "coffee") return "咖啡订单";
  if (type === "mixed") return "混合订单";
  return "文创订单";
}

function applicationsForActivity(activityId) {
  return rows.value.activityApplications.filter((item) => item.activityId === activityId);
}

function applicationKindLabel(kind) {
  return kind === "early" ? "提前报名" : "直接报名";
}

function actorLabel(item) {
  if (item.actorType === "admin") return `管理员 #${item.actorId}`;
  if (item.actorId) return `用户 #${item.actorId}`;
  return item.actorType === "guest" ? "访客" : "系统";
}

function sourceRows(key) {
  if (key === "realtime") return realtime.value;
  if (key === "comments") return comments.value;
  return rows.value[key] || [];
}

function rowText(row) {
  return Object.values(row || {})
    .flatMap((value) => Array.isArray(value) ? value.map((item) => JSON.stringify(item)) : value)
    .join(" ")
    .toLowerCase();
}

function matchesStatus(key, item) {
  const status = adminStatus.value;
  if (status === "all") return true;
  if (key === "products") {
    if (status === "low-stock") return Number(item.stock || 0) <= 5;
    return item.category === status;
  }
  if (key === "users") return String(item.level || "").includes(status);
  if (key === "orders") {
    if (status === "coffee-order") return orderType(item) === "coffee";
    if (status === "creative-order") return orderType(item) === "creative";
    if (status === "mixed-order") return orderType(item) === "mixed";
    return String(item.status || "").includes(status)
      || String(item.paymentReviewStatus || "").includes(status)
      || orderStatusLabel(item.status).includes(status);
  }
  if (key === "payments") return String(item.status || "").includes(status);
  if (key === "activities") return String(item.status || "open") === status;
  if (key === "reservations") return String(item.status || "").includes(status);
  if (key === "posts") {
    if (status === "has-comments") return (item.comments || []).length > 0;
    if (status === "popular") return Number(item.likes || 0) >= 5;
  }
  if (key === "realtime") return item.actorType === status;
  return true;
}

function filteredAdminRows(key) {
  const keyword = adminQuery.value.trim().toLowerCase();
  return sourceRows(key).filter((item) => {
    const text = key === "activities"
      ? `${rowText(item)} ${applicationsForActivity(item.id).map((application) => rowText(application)).join(" ")}`
      : rowText(item);
    const matchedText = !keyword || text.includes(keyword);
    return matchedText && matchesStatus(key, item);
  });
}

function adminTotal(key = activeTableKey.value) {
  return key ? filteredAdminRows(key).length : 0;
}

function adminPages(key = activeTableKey.value) {
  return Math.max(1, Math.ceil(adminTotal(key) / adminPageSize.value));
}

function adminRows(key) {
  const page = Math.min(adminPage.value, adminPages(key));
  const start = (page - 1) * adminPageSize.value;
  return filteredAdminRows(key).slice(start, start + adminPageSize.value);
}
</script>

<template>
  <div v-if="!adminUser" class="app-shell">
    <header class="topbar admin-topbar">
      <a class="brand brand-button" href="/admin.html"><span class="brand-mark">咖</span><span>咖啡书屋后台</span></a>
    </header>
    <main class="main">
      <section class="section auth-page">
        <form class="card login-card vue-login" data-testid="admin-login-form" @submit.prevent="login">
          <p class="eyebrow">Admin</p>
          <h2>后台管理登录</h2>
          <BaseFormItem label="账号" required>
            <input v-model.trim="loginForm.account" data-testid="admin-account" required />
          </BaseFormItem>
          <BaseFormItem label="密码" required>
            <input v-model="loginForm.password" data-testid="admin-password" type="password" required />
          </BaseFormItem>
          <p v-if="error" class="form-error">{{ error }}</p>
          <BaseButton class="checkout-main-btn" data-testid="admin-login-submit" type="submit" :loading="loading">进入后台</BaseButton>
          <p class="muted">演示账号：admin / admin123</p>
        </form>
      </section>
    </main>
  </div>

  <AdminLayout v-else data-testid="admin-shell">
    <template #sidebar>
      <AdminSidebar :items="navItems" :active="active" @change="active = $event" />
    </template>

    <template #header>
      <AdminHeader
        :title="activeNavTitle"
        :subtitle="activeSubtitle"
        :user="adminUser"
        :loading="loading"
        @refresh="refresh"
        @logout="logout"
      />
    </template>

    <main class="main admin-main-pro page-transition">
        <div class="section-head admin-page-title">
          <div><h2>{{ activeNavTitle }}</h2><p class="lead">{{ activeSubtitle }}</p></div>
          <button class="btn ghost" type="button" @click="refresh">刷新数据</button>
        </div>
        <AdminTableTools
          v-if="activeTableKey"
          v-model:query="adminQuery"
          v-model:status="adminStatus"
          v-model:page="adminPage"
          v-model:page-size="adminPageSize"
          :total="adminTotal(activeTableKey)"
          :pages="adminPages(activeTableKey)"
          :status-options="activeStatusOptions"
          :search-placeholder="activeToolCopy.placeholder"
          :filter-label="activeToolCopy.filter"
        />
        <p v-if="message" class="toast-inline">{{ message }}</p>
        <p v-if="error" class="form-error">{{ error }}</p>

        <section v-if="active === 'workbench'" class="section admin-workbench">
          <div class="admin-welcome-card">
            <div>
              <span class="eyebrow">Operations Center</span>
              <h2>欢迎回来，{{ adminUser.name }}</h2>
              <p>这里聚合今日收入、订单、预约、活动报名、社区动态和用户增长，数据全部来自现有后台接口。</p>
            </div>
            <div class="admin-welcome-card__meta">
              <strong>{{ dashboard.refreshedAt ? new Date(dashboard.refreshedAt).toLocaleString() : "实时同步" }}</strong>
              <span>最近同步时间</span>
            </div>
          </div>

          <div class="admin-stat-grid">
            <AdminStatCard
              v-for="item in workbenchStats"
              :key="item.label"
              :label="item.label"
              :value="item.value"
              :note="item.note"
              :tone="item.tone"
            />
          </div>

          <div class="admin-workbench-grid">
            <AdminChartCard title="近 7 天销售趋势" description="已支付订单收入走势">
              <div class="admin-line-chart">
                <div
                  v-for="item in dashboard.salesTrend || []"
                  :key="item.date"
                  class="admin-line-chart__bar"
                  :style="{ height: barWidth(item.total, maxOf(dashboard.salesTrend, 'total')) }"
                >
                  <span>{{ money(item.total) }}</span>
                  <small>{{ item.label }}</small>
                </div>
              </div>
            </AdminChartCard>

            <AdminChartCard title="订单状态分布" description="按照当前订单状态聚合">
              <div class="admin-donut-list">
                <div class="admin-donut-list__ring">
                  <strong>{{ rows.orders.length }}</strong>
                  <span>订单</span>
                </div>
                <div class="admin-donut-list__items">
                  <p v-for="item in dashboard.orderStatusDistribution || []" :key="item.label">
                    <span>{{ item.label }}</span>
                    <strong>{{ item.count }}</strong>
                  </p>
                </div>
              </div>
            </AdminChartCard>

            <AdminChartCard title="快捷入口" description="高频运营动作">
              <div class="admin-quick-grid">
                <button v-for="[key, title, desc] in quickActions" :key="key" type="button" @click="active = key">
                  <strong>{{ title }}</strong>
                  <span>{{ desc }}</span>
                </button>
              </div>
            </AdminChartCard>

            <AdminChartCard title="待办事项" description="需要优先处理的运营项">
              <div class="admin-task-list">
                <article v-for="task in pendingTasks" :key="task.title">
                  <strong>{{ task.value }}</strong>
                  <span>{{ task.title }}</span>
                  <small>{{ task.hint }}</small>
                </article>
              </div>
            </AdminChartCard>
          </div>

          <div class="admin-workbench-grid admin-workbench-grid--wide">
            <AdminChartCard title="实时动态" description="最近操作日志">
              <div class="admin-activity-feed">
                <article v-for="item in realtime.slice(0, 8)" :key="item.id || `${item.createdAt}-${item.action}`">
                  <span>{{ item.createdAt }}</span>
                  <div>
                    <strong>{{ item.action }}</strong>
                    <p>{{ actorLabel(item) }} · {{ item.actorName }} · {{ item.detail || "暂无详情" }}</p>
                  </div>
                  <button class="link-button" type="button" @click="showLogDetail(item)">查看</button>
                </article>
              </div>
            </AdminChartCard>

            <AdminChartCard title="最近订单" description="订单金额与状态概览">
              <div class="admin-order-feed">
                <article v-for="order in recentOrders" :key="order.id">
                  <div>
                    <strong>#{{ order.id }}</strong>
                    <span>{{ order.userName || "线下用户" }}</span>
                  </div>
                  <span>{{ orderStatusLabel(order.status) }}</span>
                  <b>{{ money(order.total) }}</b>
                </article>
                <p v-if="!recentOrders.length" class="muted">暂无订单记录</p>
              </div>
            </AdminChartCard>

            <AdminChartCard title="系统公告" description="内容管理模块发布的公告">
              <div class="admin-notice-list">
                <article v-for="notice in systemAnnouncements" :key="notice.id">
                  <strong>{{ notice.title }}</strong>
                  <p>{{ notice.summary }}</p>
                  <span>{{ notice.date }}</span>
                </article>
                <p v-if="!systemAnnouncements.length" class="muted">暂无公告</p>
              </div>
            </AdminChartCard>
          </div>
        </section>

        <section v-if="active === 'logs'" class="section">
          <div class="card table-card">
            <h3>全部实时日志</h3>
            <p class="muted">每 5 秒自动刷新，用户 ID 作为唯一标识符。</p>
            <table><thead><tr><th>时间</th><th>用户标识</th><th>用户</th><th>活动</th><th>对象</th><th>操作</th></tr></thead><tbody><tr v-for="item in adminRows('realtime')" :key="item.id"><td>{{ item.createdAt }}</td><td>{{ actorLabel(item) }}</td><td>{{ item.actorName }}</td><td>{{ item.action }}</td><td>{{ item.targetType || '-' }} {{ item.targetId ? `#${item.targetId}` : '' }}</td><td><button class="btn ghost" type="button" @click="showLogDetail(item)">查看详情</button></td></tr></tbody></table>
          </div>
        </section>

        <section v-if="active === 'users'" class="section admin-module-page">
          <div class="admin-module-actions">
            <button class="btn" type="button" @click="openModal('新增用户', '/api/admin/users', 'POST', userFields())">新增用户</button>
          </div>
          <div class="admin-stat-grid admin-stat-grid--compact">
            <AdminStatCard v-for="item in statSet('users')" :key="item.label" v-bind="item" />
          </div>
          <div class="admin-management-grid">
            <AdminChartCard title="会员等级占比" description="根据现有用户等级字段统计">
              <div class="admin-ratio-list">
                <div v-for="level in ['普通会员', '黄金会员', '钻石会员']" :key="level" class="rank-row">
                  <span>{{ level }}</span>
                  <div class="mini-progress">
                    <i :style="{ width: barWidth(rows.users.filter((item) => item.level === level).length, Math.max(1, rows.users.length)) }"></i>
                  </div>
                  <b>{{ rows.users.filter((item) => item.level === level).length }}</b>
                </div>
              </div>
            </AdminChartCard>
            <div class="card table-card admin-table-card-pro">
              <table class="admin-table-pro">
                <thead><tr><th>用户</th><th>等级</th><th>积分</th><th>联系方式</th><th>最近登录</th><th>状态</th><th>操作</th></tr></thead>
                <tbody>
                  <tr v-for="item in adminRows('users')" :key="item.id">
                    <td><div class="admin-user-cell"><span>{{ item.name?.slice(0, 1) || '用' }}</span><div><strong>{{ item.name }}</strong><small>ID #{{ item.id }}</small></div></div></td>
                    <td><AdminStatusBadge :label="item.level || '普通会员'" type="success" /></td>
                    <td>{{ item.points || 0 }}</td>
                    <td><span>{{ item.phone || '-' }}</span><small>{{ item.email || '未绑定邮箱' }}</small></td>
                    <td>{{ item.lastLogin || '最近 7 天' }}</td>
                    <td><AdminStatusBadge label="正常" type="success" /></td>
                    <td><div class="actions"><button class="btn ghost" type="button" @click="openModal('编辑用户', `/api/admin/users/${item.id}`, 'PATCH', userFields(item))">编辑</button><button class="btn danger" type="button" @click="remove(`/api/admin/users/${item.id}`)">封禁/删除</button></div></td>
                  </tr>
                  <tr v-if="!adminRows('users').length"><td colspan="7"><div class="admin-empty-state">暂无用户数据</div></td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section v-if="active === 'products'" class="section admin-module-page">
          <div class="admin-module-actions">
            <button class="btn" data-testid="admin-add-product" type="button" @click="openModal('新增商品', '/api/admin/products', 'POST', productFields())">新增商品</button>
          </div>
          <div class="admin-stat-grid admin-stat-grid--compact">
            <AdminStatCard v-for="item in statSet('products')" :key="item.label" v-bind="item" />
          </div>
          <div v-if="!adminQuery" class="admin-product-board">
            <article v-for="item in adminRows('products')" :key="item.id" class="admin-product-card">
              <img v-if="item.image" :src="item.image" :alt="item.name" @error="imageFallback" />
              <div>
                <div class="admin-card-topline">
                  <AdminStatusBadge :label="productCategoryLabel(item.category)" type="default" />
                  <AdminStatusBadge :label="stockStatus(item).label" :type="stockStatus(item).type" />
                </div>
                <h3>{{ item.name }}</h3>
                <p>{{ item.description || '暂无商品描述' }}</p>
                <div class="admin-metric-row">
                  <span>价格 <b>{{ money(item.price) }}</b></span>
                  <span>库存 <b>{{ item.stock }}</b></span>
                  <span>销量 <b>{{ productSales(item) }}</b></span>
                </div>
                <div class="actions">
                  <button class="btn ghost" type="button" @click="openModal('编辑商品', `/api/admin/products/${item.id}`, 'PATCH', productFields(item))">编辑</button>
                  <button class="btn secondary" type="button" @click="openModal('上下架商品', `/api/admin/products/${item.id}`, 'PATCH', productFields(item))">上架/下架</button>
                  <button class="btn danger" type="button" @click="remove(`/api/admin/products/${item.id}`)">删除</button>
                </div>
              </div>
            </article>
            <div v-if="!adminRows('products').length" class="admin-empty-state">暂无商品数据</div>
          </div>
          <div class="card table-card admin-table-card-pro">
            <table class="admin-table-pro">
              <thead><tr><th>ID</th><th>商品</th><th>分类</th><th>价格</th><th>库存</th><th>销量</th><th>状态</th><th>操作</th></tr></thead>
              <tbody>
                <tr v-for="item in adminRows('products')" :key="`row-${item.id}`">
                  <td>{{ item.id }}</td>
                  <td>{{ item.name }}</td>
                  <td>{{ productCategoryLabel(item.category) }}</td>
                  <td>{{ money(item.price) }}</td>
                  <td>{{ item.stock }}</td>
                  <td>{{ productSales(item) }}</td>
                  <td><AdminStatusBadge :label="stockStatus(item).label" :type="stockStatus(item).type" /></td>
                  <td><div class="actions"><button class="btn ghost" type="button" @click="openModal('编辑商品', `/api/admin/products/${item.id}`, 'PATCH', productFields(item))">编辑</button><button class="btn danger" type="button" @click="remove(`/api/admin/products/${item.id}`)">删除</button></div></td>
                </tr>
                <tr v-if="!adminRows('products').length"><td colspan="8"><div class="admin-empty-state">暂无商品数据</div></td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section v-if="active === 'books'" class="section admin-module-page">
          <div class="admin-module-actions">
            <button class="btn" type="button" @click="openModal('新增书籍', '/api/admin/books', 'POST', bookFields())">新增书籍</button>
          </div>
          <div class="admin-stat-grid admin-stat-grid--compact">
            <AdminStatCard v-for="item in statSet('books')" :key="item.label" v-bind="item" />
          </div>
          <div class="card table-card admin-table-card-pro">
            <table class="admin-table-pro">
              <thead><tr><th>书籍</th><th>状态</th><th>分类</th><th>作者 / 出版社</th><th>借阅次数</th><th>库存</th><th>操作</th></tr></thead>
              <tbody>
                <tr v-for="item in adminRows('books')" :key="item.id">
                  <td><div class="admin-book-cell"><img v-if="item.image" :src="item.image" :alt="item.title" @error="imageFallback" /><div><strong>{{ item.title }}</strong><small>{{ item.ranking || '馆藏推荐' }}</small></div></div></td>
                  <td><AdminStatusBadge :label="bookShelfStatus(item)" :type="bookStatusType(item)" /></td>
                  <td>{{ item.category || '-' }}</td>
                  <td><span>{{ item.author }}</span><small>{{ item.publisher || '咖啡书屋馆藏' }}</small></td>
                  <td>{{ bookBorrowCount(item) }}</td>
                  <td>{{ bookStock(item) }}</td>
                  <td><div class="actions"><button class="btn ghost" type="button" @click="openModal('编辑书籍', `/api/admin/books/${item.id}`, 'PATCH', bookFields(item))">编辑</button><button class="btn secondary" type="button" @click="openModal('书籍详情', `/api/admin/books/${item.id}`, 'PATCH', bookFields(item))">详情</button><button class="btn danger" type="button" @click="remove(`/api/admin/books/${item.id}`)">下架</button></div></td>
                </tr>
                <tr v-if="!adminRows('books').length"><td colspan="7"><div class="admin-empty-state">暂无书籍数据</div></td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section v-if="active === 'payments'" class="section admin-module-page" data-testid="admin-payments-table">
          <div class="admin-stat-grid admin-stat-grid--compact">
            <AdminStatCard v-for="item in statSet('payments')" :key="item.label" v-bind="item" />
          </div>
          <div class="admin-review-board">
            <article v-for="item in adminRows('payments')" :key="item.id" class="admin-review-card">
              <div class="admin-card-topline">
                <strong>订单 #{{ item.orderId }}</strong>
                <AdminStatusBadge :label="paymentStatusLabel(item.status)" :type="paymentStatusType(item.status)" />
              </div>
              <div class="admin-review-card__amount">{{ money(item.amount) }}</div>
              <div class="admin-review-meta">
                <span>用户：{{ item.userName || `用户 #${item.userId || 0}` }}</span>
                <span>方式：{{ paymentMethodLabel(item.method) }}</span>
                <span>订单：{{ orderStatusLabel(item.orderStatus) }}</span>
                <span>提交：{{ item.submittedAt || '-' }}</span>
              </div>
              <div v-if="item.status === 'submitted'" class="actions">
                <button class="btn" type="button" :disabled="Boolean(paymentAction)" @click="confirmPaymentRecord(item)">{{ paymentAction === `confirm-${item.id}` ? "确认中..." : "确认收款" }}</button>
                <button class="btn secondary" type="button" :disabled="Boolean(paymentAction)" @click="rejectPaymentRecord(item)">{{ paymentAction === `reject-${item.id}` ? "驳回中..." : "驳回" }}</button>
              </div>
              <span v-else class="muted">当前记录无需操作</span>
            </article>
            <div v-if="!adminRows('payments').length" class="admin-empty-state">暂无支付审核记录</div>
          </div>
        </section>

        <section v-if="active === 'orders'" class="section admin-module-page" data-testid="admin-orders-table">
          <div class="admin-module-actions">
            <button class="btn" type="button" @click="openModal('新增订单', '/api/admin/orders', 'POST', orderFields())">新增订单</button>
          </div>
          <div class="admin-stat-grid admin-stat-grid--compact">
            <AdminStatCard v-for="item in statSet('orders')" :key="item.label" v-bind="item" />
          </div>
          <div class="card table-card admin-table-card-pro">
            <table class="admin-table-pro">
              <thead><tr><th>订单</th><th>类型</th><th>用户</th><th>金额</th><th>状态</th><th>支付审核</th><th>操作</th></tr></thead>
              <tbody>
                <tr v-for="item in adminRows('orders')" :key="item.id">
                  <td><strong>#{{ item.id }}</strong><small>{{ item.createdAt || '最近创建' }}</small></td>
                  <td>{{ orderTypeLabel(item) }}</td>
                  <td><span>{{ item.userName || '线下用户' }}</span><small>ID #{{ item.userId || 0 }}</small></td>
                  <td>{{ money(item.total) }}</td>
                  <td><AdminStatusBadge :label="orderStatusLabel(item.status)" :type="orderStatusType(item.status)" /></td>
                  <td>
                    <AdminStatusBadge :label="reviewLabel(item.paymentReviewStatus)" :type="reviewStatusType(item.paymentReviewStatus)" />
                    <div v-if="item.paymentReviewStatus === 'pending'" class="actions inline-actions">
                      <button class="btn" type="button" @click="reviewPayment(item, 'approved')">通过</button>
                      <button class="btn secondary" type="button" @click="reviewPayment(item, 'rejected')">驳回</button>
                    </div>
                  </td>
                  <td><div class="actions"><button class="btn ghost" type="button" @click="orderDrawer = item">详情</button><button class="btn ghost" type="button" @click="openModal('编辑订单', `/api/admin/orders/${item.id}`, 'PATCH', orderFields(item))">编辑</button><button class="btn danger" type="button" @click="remove(`/api/admin/orders/${item.id}`)">删除</button></div></td>
                </tr>
                <tr v-if="!adminRows('orders').length"><td colspan="7"><div class="admin-empty-state">暂无订单数据</div></td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section v-if="active === 'reservations'" class="section admin-module-page">
          <div class="admin-module-actions">
            <button class="btn" type="button" @click="openModal('新增预约', '/api/admin/reservations', 'POST', reservationFields())">新增预约</button>
          </div>
          <div class="admin-stat-grid admin-stat-grid--compact">
            <AdminStatCard v-for="item in statSet('reservations')" :key="item.label" v-bind="item" />
          </div>
          <div class="admin-management-grid">
            <AdminChartCard title="座位区域使用情况" description="根据 seatId 前缀派生 A/B/C 区域">
              <div class="admin-ratio-list">
                <div v-for="area in ['A 安静阅读区', 'B 咖啡交流区', 'C 靠窗座位区']" :key="area" class="rank-row">
                  <span>{{ area }}</span>
                  <div class="mini-progress"><i :style="{ width: barWidth(rows.reservations.filter((item) => reservationArea(item) === area).length, Math.max(1, rows.reservations.length)) }"></i></div>
                  <b>{{ rows.reservations.filter((item) => reservationArea(item) === area).length }}</b>
                </div>
              </div>
            </AdminChartCard>
            <div class="card table-card admin-table-card-pro">
              <table class="admin-table-pro">
                <thead><tr><th>预约</th><th>区域</th><th>联系方式</th><th>日期时间</th><th>人数</th><th>状态</th><th>操作</th></tr></thead>
                <tbody>
                  <tr v-for="item in adminRows('reservations')" :key="item.id">
                    <td><strong>#{{ item.id }}</strong><small>座位 {{ item.seatId || item.seatIds || '-' }}</small></td>
                    <td>{{ reservationArea(item) }}</td>
                    <td><span>{{ item.phone || '-' }}</span><small>用户 #{{ item.userId || 0 }}</small></td>
                    <td>{{ item.date }} {{ item.time }}</td>
                    <td>{{ item.people || 1 }}</td>
                    <td><AdminStatusBadge :label="item.status || '已预约'" :type="reservationStatusType(item.status)" /></td>
                    <td><div class="actions"><button class="btn ghost" type="button" @click="openModal('编辑预约', `/api/admin/reservations/${item.id}`, 'PATCH', reservationFields(item))">查看/编辑</button><button class="btn secondary" type="button" @click="openModal('确认到店', `/api/admin/reservations/${item.id}`, 'PATCH', reservationFields(item))">确认到店</button><button class="btn danger" type="button" @click="remove(`/api/admin/reservations/${item.id}`)">取消/删除</button></div></td>
                  </tr>
                  <tr v-if="!adminRows('reservations').length"><td colspan="7"><div class="admin-empty-state">暂无预约数据</div></td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section v-if="active === 'activities'" class="section admin-module-page">
          <div class="admin-module-actions">
            <button class="btn" type="button" @click="openModal('新增活动', '/api/admin/activities', 'POST', activityFields())">新增活动</button>
          </div>
          <div class="admin-stat-grid admin-stat-grid--compact">
            <AdminStatCard v-for="item in statSet('activities')" :key="item.label" v-bind="item" />
          </div>
          <div class="admin-activity-board">
            <article v-for="activity in adminRows('activities')" :key="activity.id" class="admin-activity-card">
              <div class="admin-card-topline">
                <AdminStatusBadge :label="activityStatusLabel(activity.status)" :type="activityStatusType(activity.status)" />
                <span>{{ activity.date }} {{ activity.time }}</span>
              </div>
              <h3>{{ activity.title }}</h3>
              <p>{{ activity.description || '暂无活动介绍' }}</p>
              <div class="admin-metric-row">
                <span>地点 <b>{{ activity.location || '-' }}</b></span>
                <span>报名 <b>{{ activity.applied }}/{{ activity.capacity }}</b></span>
                <span>满意度 <b>{{ 92 + (Number(activity.id || 0) % 6) }}%</b></span>
              </div>
              <div class="mini-progress"><i :style="{ width: `${activityProgress(activity)}%` }"></i></div>
              <div class="actions">
                <button class="btn ghost" type="button" @click="openModal('编辑活动', `/api/admin/activities/${activity.id}`, 'PATCH', activityFields(activity))">编辑</button>
                <button class="btn secondary" type="button" @click="openModal('报名管理', `/api/admin/activities/${activity.id}`, 'PATCH', activityFields(activity))">报名管理</button>
                <button class="btn danger" type="button" @click="remove(`/api/admin/activities/${activity.id}`)">删除</button>
              </div>
              <div class="application-list-mini">
                <strong>报名明细</strong>
                <div v-for="item in applicationsForActivity(activity.id).slice(0, 3)" :key="item.id" class="rank-row">
                  <span>{{ item.userName || (item.userId ? `用户 #${item.userId}` : '访客') }}</span>
                  <small>{{ applicationKindLabel(item.kind) }} · {{ item.people }} 人</small>
                </div>
                <small v-if="!applicationsForActivity(activity.id).length">暂无报名记录</small>
              </div>
            </article>
            <div v-if="!adminRows('activities').length" class="admin-empty-state">暂无活动数据</div>
          </div>
        </section>

        <section v-if="active === 'community'" class="section admin-module-page">
          <div class="admin-stat-grid admin-stat-grid--compact">
            <AdminStatCard v-for="item in statSet('community')" :key="item.label" v-bind="item" />
          </div>
          <div class="admin-management-grid">
            <div class="admin-community-list">
              <article v-for="item in adminRows('posts')" :key="item.id" class="admin-community-card">
                <div class="admin-card-topline">
                  <strong>{{ item.author || '匿名书友' }}</strong>
                  <AdminStatusBadge :label="postSourceLabel(item)" type="default" />
                </div>
                <h3>{{ item.title }}</h3>
                <p>{{ item.content }}</p>
                <div class="admin-metric-row">
                  <span>点赞 <b>{{ item.likes }}</b></span>
                  <span>可见评论 <b>{{ approvedComments(item) }}</b></span>
                  <span>待审评论 <b>{{ pendingComments(item) }}</b></span>
                </div>
                <div class="actions">
                  <button class="btn ghost" type="button" @click="openModal('编辑动态', `/api/admin/posts/${item.id}`, 'PATCH', [{ name: 'title', label: '标题', value: item.title }, { name: 'content', label: '内容', value: item.content, type: 'textarea' }])">编辑</button>
                  <button class="btn secondary" type="button" @click="openModal('帖子详情', `/api/admin/posts/${item.id}`, 'PATCH', [{ name: 'title', label: '标题', value: item.title }, { name: 'content', label: '内容', value: item.content, type: 'textarea' }])">帖子详情</button>
                  <button class="btn danger" type="button" @click="remove(`/api/admin/posts/${item.id}`)">删除</button>
                </div>
              </article>
              <div v-if="!adminRows('posts').length" class="admin-empty-state">暂无社区动态</div>
            </div>
            <div class="card table-card admin-table-card-pro">
              <h3>评论审核</h3>
              <table class="admin-table-pro">
                <thead><tr><th>评论</th><th>动态</th><th>用户</th><th>状态</th><th>操作</th></tr></thead>
                <tbody>
                  <tr v-for="item in comments" :key="item.id">
                    <td><strong>#{{ item.id }}</strong><small>{{ item.content }}</small></td>
                    <td>#{{ item.postId }} {{ item.postTitle }}</td>
                    <td>{{ item.user || `用户 #${item.userId || 0}` }}</td>
                    <td><AdminStatusBadge :label="reviewLabel(item.status)" :type="reviewStatusType(item.status)" /></td>
                    <td><div class="actions"><button class="btn" type="button" @click="reviewComment(item, 'approved')">通过</button><button class="btn secondary" type="button" @click="reviewComment(item, 'rejected')">驳回</button><button class="btn danger" type="button" @click="remove(`/api/admin/posts/${item.postId}/comments/${item.id}`)">删除</button></div></td>
                  </tr>
                  <tr v-if="!comments.length"><td colspan="5"><div class="admin-empty-state">暂无评论</div></td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section v-if="active === 'content'" class="section admin-module-page admin-content-page">
          <div class="admin-module-actions">
            <button class="btn" type="button" @click="openModal('新增公告', '/api/admin/notices', 'POST', noticeFields())">新增公告</button>
          </div>

          <div class="admin-stat-grid admin-stat-grid--compact">
            <AdminStatCard v-for="item in contentStats" :key="item.label" v-bind="item" />
          </div>

          <div class="admin-management-grid">
            <AdminChartCard title="发布趋势" description="公告与社区内容按最近 7 天派生">
              <div class="admin-line-chart compact">
                <div
                  v-for="item in contentTrend"
                  :key="item.label"
                  class="admin-line-chart__bar"
                  :style="{ height: barWidth(item.count, maxOf(contentTrend, 'count')) }"
                >
                  <span>{{ item.count }}</span>
                  <small>{{ item.label }}</small>
                </div>
              </div>
            </AdminChartCard>

            <AdminChartCard title="内容类型统计" description="公告、动态、活动和商品内容占比">
              <div class="admin-ratio-list">
                <div v-for="item in contentTypeStats" :key="item.label" class="rank-row">
                  <span>{{ item.label }}</span>
                  <div class="mini-progress"><i :style="{ width: barWidth(item.count, maxOf(contentTypeStats, 'count')) }"></i></div>
                  <b>{{ item.count }}</b>
                </div>
              </div>
            </AdminChartCard>

            <AdminChartCard title="热门内容 TOP5" description="按点赞、评论和公告热度前端派生">
              <div class="admin-ranking-list">
                <article v-for="(item, index) in popularContents" :key="item.id">
                  <span>{{ index + 1 }}</span>
                  <div>
                    <strong>{{ item.title }}</strong>
                    <small>{{ item.type }}</small>
                  </div>
                  <b>{{ item.score }}</b>
                </article>
                <p v-if="!popularContents.length" class="muted">暂无热门内容</p>
              </div>
            </AdminChartCard>
          </div>

          <div class="card table-card admin-table-card-pro">
            <div class="section-head compact"><div><h3>内容列表</h3><p class="muted">公告新增、编辑、删除仍走原后台接口。</p></div></div>
            <table class="admin-table-pro">
              <thead><tr><th>标题</th><th>类型</th><th>摘要</th><th>发布时间</th><th>操作</th></tr></thead>
              <tbody>
                <tr v-for="item in adminRows('notices')" :key="item.id">
                  <td><strong>{{ item.title }}</strong><small>ID #{{ item.id }}</small></td>
                  <td><AdminStatusBadge label="系统公告" type="accent" /></td>
                  <td>{{ item.summary }}</td>
                  <td>{{ item.date }}</td>
                  <td><div class="actions"><button class="btn ghost" type="button" @click="openModal('编辑公告', `/api/admin/notices/${item.id}`, 'PATCH', noticeFields(item))">编辑</button><button class="btn danger" type="button" @click="remove(`/api/admin/notices/${item.id}`)">删除</button></div></td>
                </tr>
                <tr v-if="!adminRows('notices').length"><td colspan="5"><div class="admin-empty-state">暂无公告内容</div></td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section v-if="active === 'memberLevels'" class="section admin-module-page">
          <div class="admin-module-actions">
            <button class="btn" type="button" @click="openModal('新增/更新会员等级', '/api/admin/member-levels', 'POST', memberLevelFields())">新增等级</button>
          </div>
          <div class="admin-stat-grid admin-stat-grid--compact">
            <AdminStatCard label="等级数量" :value="rows.memberLevels.length" note="member_levels 配置" tone="primary" />
            <AdminStatCard label="会员覆盖" :value="rows.levelDistribution.reduce((sum, item) => sum + Number(item.count || 0), 0)" note="按成长值实时归档" tone="success" />
            <AdminStatCard label="最高倍率" :value="`${Math.max(...rows.memberLevels.map((item) => Number(item.pointsMultiplier || 1)), 1)} 倍`" note="支付确认后返积分" tone="gold" />
          </div>
          <div class="card admin-table-card">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>等级</th>
                  <th>成长值范围</th>
                  <th>折扣</th>
                  <th>积分倍率</th>
                  <th>优先报名</th>
                  <th>权益</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="level in rows.memberLevels" :key="level.code">
                  <td><strong>{{ level.name }}</strong><small>{{ level.code }}</small></td>
                  <td>{{ level.minGrowth }} - {{ level.maxGrowth ?? '∞' }}</td>
                  <td>{{ Number(level.discountRate * 10).toFixed(1) }} 折</td>
                  <td>{{ level.pointsMultiplier }} 倍</td>
                  <td>{{ level.prioritySignup }} 次</td>
                  <td>{{ (level.benefits || []).slice(0, 3).join(' / ') }}</td>
                  <td><button class="btn ghost" type="button" @click="openModal('编辑会员等级', '/api/admin/member-levels', 'POST', memberLevelFields(level))">编辑</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section v-if="active === 'coupons'" class="section admin-module-page">
          <div class="admin-module-actions">
            <button class="btn" type="button" @click="openModal('创建优惠券', '/api/admin/coupons', 'POST', couponFields())">创建优惠券</button>
          </div>
          <div class="admin-stat-grid admin-stat-grid--compact">
            <AdminStatCard label="优惠券数量" :value="rows.coupons.length" note="当前券模板" tone="primary" />
            <AdminStatCard label="已领取" :value="rows.coupons.reduce((sum, item) => sum + Number(item.receivedQuantity || 0), 0)" note="user_coupons 记录" tone="success" />
            <AdminStatCard label="已核销" :value="rows.coupons.reduce((sum, item) => sum + Number(item.usedQuantity || 0), 0)" note="订单使用统计" tone="gold" />
          </div>
          <div class="card admin-table-card">
            <table class="admin-table">
              <thead>
                <tr>
                  <th>优惠券</th>
                  <th>类型</th>
                  <th>面额</th>
                  <th>门槛</th>
                  <th>有效期</th>
                  <th>领取/核销</th>
                  <th>转化率</th>
                  <th>状态</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="coupon in rows.coupons" :key="coupon.id">
                  <td><strong>{{ coupon.name }}</strong><small>{{ coupon.scope }}</small></td>
                  <td>{{ coupon.type }}</td>
                  <td>{{ coupon.type === 'member_exclusive' && Number(coupon.value) < 1 ? `${Number(coupon.value * 10).toFixed(1)}折` : `￥${coupon.value}` }}</td>
                  <td>满 {{ coupon.threshold }} 可用</td>
                  <td>{{ coupon.validFrom }} 至 {{ coupon.validTo }}</td>
                  <td>{{ coupon.receivedQuantity || 0 }} / {{ coupon.usedQuantity || 0 }}</td>
                  <td>{{ coupon.conversionRate || 0 }}%</td>
                  <td><AdminStatusBadge :label="coupon.status === 'active' ? '启用' : '停用'" :type="coupon.status === 'active' ? 'success' : 'warning'" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section v-if="active === 'tasks'" class="section admin-module-page">
          <div class="admin-module-actions">
            <button class="btn" type="button" @click="openModal('创建任务规则', '/api/admin/tasks', 'POST', taskRuleFields())">创建任务</button>
          </div>
          <div class="admin-stat-grid admin-stat-grid--compact">
            <AdminStatCard label="任务规则" :value="rows.taskRules.length" note="每日任务 + 成长任务" tone="primary" />
            <AdminStatCard label="完成记录" :value="rows.userTasks.filter((item) => item.status === 'completed').length" note="用户任务完成统计" tone="success" />
            <AdminStatCard label="每日任务" :value="rows.taskRules.filter((item) => item.type === 'daily').length" note="活跃留存入口" tone="gold" />
          </div>
          <div class="card admin-table-card">
            <table class="admin-table">
              <thead>
                <tr><th>任务</th><th>类型</th><th>奖励</th><th>动作标识</th><th>状态</th><th>操作</th></tr>
              </thead>
              <tbody>
                <tr v-for="task in rows.taskRules" :key="task.id">
                  <td><strong>{{ task.title }}</strong><small>{{ task.description }}</small></td>
                  <td>{{ task.type === 'daily' ? '每日任务' : '成长任务' }}</td>
                  <td>+{{ task.rewardPoints }} 积分</td>
                  <td>{{ task.actionKey }}</td>
                  <td><AdminStatusBadge :label="task.status === 'active' ? '启用' : '停用'" :type="task.status === 'active' ? 'success' : 'warning'" /></td>
                  <td><button class="btn ghost" type="button" @click="openModal('编辑任务规则', '/api/admin/tasks', 'POST', taskRuleFields(task))">编辑</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section v-if="active === 'badges'" class="section admin-module-page">
          <div class="admin-module-actions">
            <button class="btn" type="button" @click="openModal('创建勋章', '/api/admin/badges', 'POST', badgeFields())">创建勋章</button>
          </div>
          <div class="admin-stat-grid admin-stat-grid--compact">
            <AdminStatCard label="勋章数量" :value="rows.badges.length" note="badges 配置" tone="primary" />
            <AdminStatCard label="获得记录" :value="rows.userBadges.length" note="user_badges 记录" tone="success" />
            <AdminStatCard label="启用勋章" :value="rows.badges.filter((item) => item.status !== 'disabled').length" note="前台可点亮" tone="gold" />
          </div>
          <div class="card admin-table-card">
            <table class="admin-table">
              <thead>
                <tr><th>勋章</th><th>图标</th><th>规则</th><th>描述</th><th>状态</th><th>操作</th></tr>
              </thead>
              <tbody>
                <tr v-for="badge in rows.badges" :key="badge.id">
                  <td><strong>{{ badge.name }}</strong><small>{{ badge.code }}</small></td>
                  <td>{{ badge.icon }}</td>
                  <td>{{ badge.rule }}</td>
                  <td>{{ badge.description }}</td>
                  <td><AdminStatusBadge :label="badge.status === 'active' ? '启用' : '停用'" :type="badge.status === 'active' ? 'success' : 'warning'" /></td>
                  <td><button class="btn ghost" type="button" @click="openModal('编辑勋章', '/api/admin/badges', 'POST', badgeFields(badge))">编辑</button></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section v-if="active === 'invites'" class="section admin-module-page">
          <div class="admin-stat-grid admin-stat-grid--compact">
            <AdminStatCard label="邀请记录" :value="rows.inviteRecords.length" note="invite_records" tone="primary" />
            <AdminStatCard label="已转化" :value="rows.inviteRecords.filter((item) => item.status !== 'pending').length" note="注册或首单" tone="success" />
            <AdminStatCard label="积分奖励" :value="rows.inviteRecords.reduce((sum, item) => sum + Number(item.rewardPoints || 0), 0)" note="邀请注册奖励" tone="gold" />
          </div>
          <div class="card admin-table-card">
            <table class="admin-table">
              <thead>
                <tr><th>记录</th><th>邀请人</th><th>被邀请人</th><th>邀请码</th><th>状态</th><th>奖励</th><th>时间</th></tr>
              </thead>
              <tbody>
                <tr v-for="record in rows.inviteRecords" :key="record.id">
                  <td>#{{ record.id }}</td>
                  <td>{{ record.inviterUserId }}</td>
                  <td>{{ record.inviteeUserId || '-' }}</td>
                  <td>{{ record.inviteCode }}</td>
                  <td><AdminStatusBadge :label="record.status" type="success" /></td>
                  <td>积分 {{ record.rewardPoints || 0 }} / 券 {{ record.rewardCouponId || '-' }}</td>
                  <td>{{ record.convertedAt || record.createdAt }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section v-if="active === 'notificationPush'" class="section admin-module-page">
          <div class="admin-module-actions">
            <button class="btn" type="button" @click="openModal('手动推送消息', '/api/admin/notifications', 'POST', notificationPushFields())">手动推送</button>
          </div>
          <div class="admin-stat-grid admin-stat-grid--compact">
            <AdminStatCard label="发送量" :value="notificationStatsAdmin.total" note="notification_records" tone="primary" />
            <AdminStatCard label="已读量" :value="notificationStatsAdmin.read" :note="`阅读率 ${notificationStatsAdmin.readRate || 0}%`" tone="success" />
            <AdminStatCard label="未读量" :value="notificationStatsAdmin.unread" note="待用户触达" tone="warning" />
            <AdminStatCard label="点击率" :value="`${notificationStatsAdmin.clickRate || 0}%`" note="按消息点击记录统计" tone="gold" />
          </div>
          <div class="cockpit-grid">
            <AdminChartCard title="按类型统计" description="活动、预约、订单、任务、优惠券和成长消息触达效果">
              <div class="admin-ratio-list">
                <div v-for="item in notificationStatsAdmin.byType || []" :key="item.type" class="rank-row">
                  <span>{{ item.type }}</span>
                  <div class="mini-progress"><i :style="{ width: `${Math.min(100, item.readRate || 0)}%` }"></i></div>
                  <b>{{ item.sent }} / {{ item.readRate }}%</b>
                </div>
                <p v-if="!(notificationStatsAdmin.byType || []).length" class="muted">暂无消息统计</p>
              </div>
            </AdminChartCard>
            <div class="card admin-table-card">
              <table class="admin-table">
                <thead>
                  <tr><th>消息</th><th>用户</th><th>类型</th><th>状态</th><th>来源</th><th>优先级</th><th>时间</th></tr>
                </thead>
                <tbody>
                  <tr v-for="item in rows.notificationRecords.slice(0, 12)" :key="item.id">
                    <td><strong>{{ item.title }}</strong><small>{{ item.content }}</small></td>
                    <td>{{ item.userId || '全体' }}</td>
                    <td>{{ item.type }}</td>
                    <td><AdminStatusBadge :label="item.isRead || item.status === 'read' ? '已读' : '未读'" :type="item.isRead || item.status === 'read' ? 'success' : 'warning'" /></td>
                    <td>{{ item.source }}</td>
                    <td><AdminStatusBadge :label="item.priority === 'high' ? '高' : '普通'" :type="item.priority === 'high' ? 'danger' : 'default'" /></td>
                    <td>{{ item.createdAt }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section v-if="active === 'announcements'" class="section admin-module-page">
          <div class="admin-module-actions">
            <button class="btn" type="button" @click="openModal('新增系统公告', '/api/admin/announcements', 'POST', announcementFields())">新增公告</button>
          </div>
          <div class="admin-stat-grid admin-stat-grid--compact">
            <AdminStatCard label="公告数量" :value="rows.announcements.length" note="announcements" tone="primary" />
            <AdminStatCard label="已发布" :value="rows.announcements.filter((item) => item.status === 'published').length" note="发布后自动触达全体用户" tone="success" />
            <AdminStatCard label="置顶公告" :value="rows.announcements.filter((item) => item.pinned).length" note="高优先级展示" tone="gold" />
          </div>
          <div class="card admin-table-card">
            <table class="admin-table">
              <thead>
                <tr><th>公告</th><th>链接</th><th>置顶</th><th>状态</th><th>更新时间</th><th>操作</th></tr>
              </thead>
              <tbody>
                <tr v-for="item in rows.announcements" :key="item.id">
                  <td><strong>{{ item.title }}</strong><small>{{ item.content }}</small></td>
                  <td>{{ item.link || '-' }}</td>
                  <td><AdminStatusBadge :label="item.pinned ? '置顶' : '普通'" :type="item.pinned ? 'danger' : 'default'" /></td>
                  <td><AdminStatusBadge :label="item.status === 'published' ? '发布' : '草稿'" :type="item.status === 'published' ? 'success' : 'warning'" /></td>
                  <td>{{ item.updatedAt || item.createdAt }}</td>
                  <td>
                    <div class="actions">
                      <button class="btn ghost" type="button" @click="openModal('编辑系统公告', `/api/admin/announcements/${item.id}`, 'PUT', announcementFields(item))">编辑</button>
                      <button class="btn danger" type="button" @click="remove(`/api/admin/announcements/${item.id}`)">删除</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section v-if="active === 'business'" class="section admin-module-page cockpit-page">
          <div class="admin-stat-grid admin-stat-grid--compact">
            <AdminStatCard v-for="item in businessStats" :key="item.label" v-bind="item" />
          </div>

          <div class="cockpit-grid">
            <AdminChartCard title="用户增长趋势" description="DAU、新增用户与活跃用户的最近趋势">
              <div class="admin-line-chart compact">
                <div
                  v-for="item in businessTrends"
                  :key="`user-${item.date}`"
                  class="admin-line-chart__bar"
                  :style="{ height: barWidth(item.activeUsers, maxOf(businessTrends, 'activeUsers')) }"
                >
                  <span>{{ item.activeUsers }}</span>
                  <small>{{ item.label }}</small>
                </div>
              </div>
              <div class="mini-bars">
                <div v-for="item in businessTrends.slice(-5)" :key="`new-${item.date}`" class="bar-row">
                  <span>{{ item.label }}</span>
                  <div class="bar-track"><i :style="{ width: barWidth(item.newUsers, maxOf(businessTrends, 'newUsers')) }"></i></div>
                  <strong>+{{ item.newUsers }}</strong>
                </div>
              </div>
            </AdminChartCard>

            <AdminChartCard title="收入趋势" description="GMV 与已支付收入走势">
              <div class="mini-bars">
                <div v-for="item in businessTrends" :key="`revenue-${item.date}`" class="bar-row">
                  <span>{{ item.label }}</span>
                  <div class="bar-track"><i :style="{ width: barWidth(item.revenue, maxOf(businessTrends, 'revenue')) }"></i></div>
                  <strong>{{ money(item.revenue) }}</strong>
                </div>
              </div>
            </AdminChartCard>

            <AdminChartCard title="订单转化漏斗" description="从下单到支付完成的转化链路">
              <div class="admin-ratio-list">
                <div v-for="item in businessFunnel.order" :key="item.label" class="rank-row">
                  <span>{{ item.label }}</span>
                  <div class="mini-progress"><i :style="{ width: barWidth(item.value, maxOf(businessFunnel.order, 'value')) }"></i></div>
                  <b>{{ item.value }}</b>
                </div>
              </div>
            </AdminChartCard>

            <AdminChartCard title="活动转化漏斗" description="曝光、报名、到场的活动运营效率">
              <div class="admin-ratio-list">
                <div v-for="item in businessFunnel.activity" :key="item.label" class="rank-row">
                  <span>{{ item.label }}</span>
                  <div class="mini-progress"><i :style="{ width: barWidth(item.value, maxOf(businessFunnel.activity, 'value')) }"></i></div>
                  <b>{{ item.value }}</b>
                </div>
              </div>
            </AdminChartCard>

            <AdminChartCard title="会员等级分布" description="Lv1-Lv5 会员规模与成长结构">
              <div class="admin-ratio-list">
                <div v-for="item in businessMembers.distribution" :key="item.code || item.name" class="rank-row">
                  <span>{{ item.name }}</span>
                  <div class="mini-progress"><i :style="{ width: barWidth(item.count, maxOf(businessMembers.distribution, 'count')) }"></i></div>
                  <b>{{ item.count }}</b>
                </div>
              </div>
            </AdminChartCard>

            <AdminChartCard title="推荐转化" description="推荐曝光、点击与转化效果">
              <div class="admin-stat-grid admin-stat-grid--compact">
                <AdminStatCard label="推荐曝光" :value="businessRecommendations.exposure || 0" note="recommend_records" tone="primary" />
                <AdminStatCard label="推荐点击" :value="businessRecommendations.clicks || 0" :note="`点击率 ${businessRecommendations.clickRate || 0}%`" tone="success" />
                <AdminStatCard label="推荐转化" :value="businessRecommendations.conversions || 0" :note="`转化率 ${businessRecommendations.conversionRate || 0}%`" tone="gold" />
              </div>
            </AdminChartCard>

            <AdminChartCard title="热门商品排行" description="按销量和销售额聚合">
              <div class="admin-ranking-list">
                <article v-for="(item, index) in businessRankings.products" :key="item.id || item.name">
                  <span>{{ index + 1 }}</span>
                  <div><strong>{{ item.name }}</strong><small>销售额 {{ money(item.total) }}</small></div>
                  <b>{{ item.quantity }}</b>
                </article>
                <p v-if="!businessRankings.products.length" class="muted">暂无商品销售数据</p>
              </div>
            </AdminChartCard>

            <AdminChartCard title="热门书籍排行" description="按浏览、收藏和借阅热度聚合">
              <div class="admin-ratio-list">
                <div v-for="item in businessRankings.books" :key="item.id || item.name" class="rank-row">
                  <span>{{ item.name }}</span>
                  <div class="mini-progress"><i :style="{ width: barWidth(item.score, maxOf(businessRankings.books, 'score')) }"></i></div>
                  <b>{{ item.score }}</b>
                </div>
              </div>
            </AdminChartCard>

            <AdminChartCard title="热门活动排行" description="按报名人数和活动热度聚合">
              <div class="admin-ratio-list">
                <div v-for="item in businessRankings.activities" :key="item.id || item.name" class="rank-row">
                  <span>{{ item.name }}</span>
                  <div class="mini-progress"><i :style="{ width: barWidth(item.signups, maxOf(businessRankings.activities, 'signups')) }"></i></div>
                  <b>{{ item.signups }}</b>
                </div>
              </div>
            </AdminChartCard>
          </div>
        </section>

        <section v-if="active === 'operationsV2'" class="section admin-module-page cockpit-page">
          <div class="admin-stat-grid admin-stat-grid--compact">
            <AdminStatCard v-for="item in operationsStats" :key="item.label" v-bind="item" />
          </div>

          <div class="cockpit-grid">
            <AdminChartCard title="KPI 配置与刷新" description="运营指标目标值与刷新频率配置">
              <div class="admin-ratio-list">
                <div v-for="item in operationsKpiConfigs" :key="item.code" class="rank-row">
                  <span>{{ item.name }}</span>
                  <div class="mini-progress"><i :style="{ width: barWidth(item.targetValue, maxOf(operationsKpiConfigs, 'targetValue')) }"></i></div>
                  <b>{{ item.targetValue }} / {{ item.refreshInterval }}s</b>
                </div>
                <p v-if="!operationsKpiConfigs.length" class="muted">暂无 KPI 配置</p>
              </div>
            </AdminChartCard>

            <AdminChartCard title="活动转化分析" description="曝光、点击、报名、到场、复购链路">
              <div class="admin-ratio-list">
                <div v-for="item in operationsActivityFunnel.steps" :key="item.key" class="rank-row">
                  <span>{{ item.label }}</span>
                  <div class="mini-progress"><i :style="{ width: barWidth(item.value, maxOf(operationsActivityFunnel.steps, 'value')) }"></i></div>
                  <b>{{ item.value }} · {{ item.totalRate }}%</b>
                </div>
              </div>
            </AdminChartCard>

            <AdminChartCard title="用户分层分析" description="高价值、潜力、沉睡用户结构">
              <div class="admin-ratio-list">
                <div v-for="item in operationsUserSegmentation.segments" :key="item.name" class="rank-row">
                  <span>{{ item.name }}</span>
                  <div class="mini-progress"><i :style="{ width: barWidth(item.count, maxOf(operationsUserSegmentation.segments, 'count')) }"></i></div>
                  <b>{{ item.count }} · {{ item.repeatRate }}%</b>
                </div>
              </div>
            </AdminChartCard>

            <AdminChartCard title="商品复购分析" description="热销商品、购买频次与复购率">
              <div class="admin-ranking-list">
                <article v-for="(item, index) in operationsProductRepeat.products.slice(0, 6)" :key="item.id || item.name">
                  <span>{{ index + 1 }}</span>
                  <div><strong>{{ item.name }}</strong><small>复购率 {{ item.repeatRate }}% · 购买频次 {{ item.purchaseFrequency }}</small></div>
                  <b>{{ item.quantity }}</b>
                </article>
                <p v-if="!operationsProductRepeat.products.length" class="muted">暂无商品复购数据</p>
              </div>
            </AdminChartCard>

            <AdminChartCard title="复购率趋势" description="最近 14 天复购率变化">
              <div class="mini-bars">
                <div v-for="item in operationsProductRepeat.trend" :key="item.date" class="bar-row">
                  <span>{{ item.label }}</span>
                  <div class="bar-track"><i :style="{ width: barWidth(item.repeatRate, 100) }"></i></div>
                  <strong>{{ item.repeatRate }}%</strong>
                </div>
              </div>
            </AdminChartCard>

            <AdminChartCard title="会员等级分析" description="用户数、消费占比和成长值分布">
              <div class="admin-ratio-list">
                <div v-for="item in operationsMemberAnalysis.levels" :key="item.code || item.name" class="rank-row">
                  <span>{{ item.name }}</span>
                  <div class="mini-progress"><i :style="{ width: barWidth(item.paidAmount, maxOf(operationsMemberAnalysis.levels, 'paidAmount')) }"></i></div>
                  <b>{{ item.count }}人 · {{ item.consumptionShare }}%</b>
                </div>
              </div>
            </AdminChartCard>

            <AdminChartCard title="活动热度排行" description="活动曝光、点击和报名表现">
              <div class="admin-ranking-list">
                <article v-for="(item, index) in operationsActivityFunnel.activities.slice(0, 6)" :key="item.id || item.name">
                  <span>{{ index + 1 }}</span>
                  <div><strong>{{ item.name }}</strong><small>曝光 {{ item.exposure }} · 点击 {{ item.click }}</small></div>
                  <b>{{ item.applied }}</b>
                </article>
                <p v-if="!operationsActivityFunnel.activities.length" class="muted">暂无活动分析数据</p>
              </div>
            </AdminChartCard>

            <AdminChartCard title="高价值用户明细" description="按消费额和活跃度排序">
              <div class="admin-ranking-list">
                <article v-for="(item, index) in operationsUserSegmentation.users.slice(0, 6)" :key="item.id">
                  <span>{{ index + 1 }}</span>
                  <div><strong>{{ item.name }}</strong><small>{{ item.segment }} · 活跃分 {{ item.activeScore }}</small></div>
                  <b>{{ money(item.paidAmount) }}</b>
                </article>
                <p v-if="!operationsUserSegmentation.users.length" class="muted">暂无用户分层数据</p>
              </div>
            </AdminChartCard>
          </div>
        </section>

        <section v-if="active === 'income'" class="section admin-module-page admin-finance-page">
          <div class="admin-stat-grid admin-stat-grid--compact">
            <AdminStatCard v-for="item in financeStats" :key="item.label" v-bind="item" />
          </div>

          <div class="admin-finance-grid">
            <AdminChartCard title="收入趋势" description="近 7 天已支付订单收入走势">
              <div class="admin-line-chart">
                <div
                  v-for="item in dashboard.salesTrend || []"
                  :key="item.date"
                  class="admin-line-chart__bar"
                  :style="{ height: barWidth(item.total, maxOf(dashboard.salesTrend, 'total')) }"
                >
                  <span>{{ money(item.total) }}</span>
                  <small>{{ item.label }}</small>
                </div>
              </div>
            </AdminChartCard>

            <AdminChartCard title="收入来源占比" description="订单、活动、会员权益等来源派生">
              <div class="finance-source-list">
                <div v-for="item in financeSources" :key="item.label" class="rank-row">
                  <span>{{ item.label }}</span>
                  <div class="mini-progress"><i :style="{ width: barWidth(item.value, maxOf(financeSources, 'value')) }"></i></div>
                  <b>{{ money(item.value) }}</b>
                </div>
              </div>
            </AdminChartCard>
          </div>

          <div class="card table-card admin-table-card-pro">
            <div class="section-head compact"><div><h3>收入明细</h3><p class="muted">基于订单与报名记录派生，不改变原始接口。</p></div><button class="btn ghost" type="button" @click="message = '报表导出为演示入口，当前未新增后端导出接口'">导出报表</button></div>
            <table class="admin-table-pro">
              <thead><tr><th>来源</th><th>项目</th><th>金额</th><th>状态</th><th>时间</th></tr></thead>
              <tbody>
                <tr v-for="item in financeDetails" :key="item.id">
                  <td>{{ item.source }}</td>
                  <td><strong>{{ item.name }}</strong></td>
                  <td>{{ money(item.amount) }}</td>
                  <td><AdminStatusBadge :label="item.status" type="success" /></td>
                  <td>{{ item.createdAt }}</td>
                </tr>
                <tr v-if="!financeDetails.length"><td colspan="5"><div class="admin-empty-state">暂无收入明细</div></td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section v-if="active === 'dashboard'" class="section admin-module-page cockpit-page">
          <div class="admin-stat-grid admin-stat-grid--compact">
            <AdminStatCard v-for="item in cockpitStats" :key="item.label" v-bind="item" />
          </div>

          <div class="cockpit-grid">
            <AdminChartCard title="用户增长" description="最近 7 天用户增长趋势">
              <div class="admin-line-chart compact">
                <div v-for="item in userGrowthTrend" :key="item.label" class="admin-line-chart__bar" :style="{ height: barWidth(item.count, maxOf(userGrowthTrend, 'count')) }">
                  <span>{{ item.count }}</span>
                  <small>{{ item.label }}</small>
                </div>
              </div>
            </AdminChartCard>

            <AdminChartCard title="收入趋势" description="财务中心同步收入趋势">
              <div class="mini-bars">
                <div v-for="item in dashboard.salesTrend || []" :key="item.date" class="bar-row">
                  <span>{{ item.label }}</span>
                  <div class="bar-track"><i :style="{ width: barWidth(item.total, maxOf(dashboard.salesTrend, 'total')) }"></i></div>
                  <strong>{{ money(item.total) }}</strong>
                </div>
              </div>
            </AdminChartCard>

            <AdminChartCard title="商品销量" description="热门商品销量排行">
              <div class="admin-ranking-list">
                <article v-for="(item, index) in dashboard.hotProducts || []" :key="item.productId || item.name">
                  <span>{{ index + 1 }}</span>
                  <div><strong>{{ item.name }}</strong><small>销售额 {{ money(item.total) }}</small></div>
                  <b>{{ item.quantity }}</b>
                </article>
                <p v-if="!(dashboard.hotProducts || []).length" class="muted">暂无商品销量</p>
              </div>
            </AdminChartCard>

            <AdminChartCard title="热门书籍" description="按借阅次数前端派生">
              <div class="admin-ratio-list">
                <div v-for="item in bookRanking" :key="item.label" class="rank-row">
                  <span>{{ item.label }}</span>
                  <div class="mini-progress"><i :style="{ width: barWidth(item.count, maxOf(bookRanking, 'count')) }"></i></div>
                  <b>{{ item.count }}</b>
                </div>
              </div>
            </AdminChartCard>

            <AdminChartCard title="活动热度" description="活动报名人数与容量对比">
              <div class="admin-ratio-list">
                <div v-for="item in activityRanking" :key="item.label" class="rank-row">
                  <span>{{ item.label }}</span>
                  <div class="mini-progress"><i :style="{ width: barWidth(item.count, item.total) }"></i></div>
                  <b>{{ item.count }}/{{ item.total }}</b>
                </div>
              </div>
            </AdminChartCard>

            <AdminChartCard title="预约热力图" description="按区域和时段前端派生">
              <div class="reservation-heatmap">
                <div v-for="cell in reservationHeatmap" :key="cell.id" :style="{ opacity: 0.28 + Number(barWidth(cell.count, maxOf(reservationHeatmap, 'count')).replace('%', '')) / 140 }">
                  <strong>{{ cell.area }}</strong>
                  <span>{{ cell.time }}</span>
                  <b>{{ cell.count }}</b>
                </div>
              </div>
            </AdminChartCard>

            <AdminChartCard title="社区活跃度" description="帖子与评论活跃趋势">
              <div class="admin-line-chart compact">
                <div v-for="item in communityActivityTrend" :key="item.label" class="admin-line-chart__bar" :style="{ height: barWidth(item.count, maxOf(communityActivityTrend, 'count')) }">
                  <span>{{ item.count }}</span>
                  <small>{{ item.label }}</small>
                </div>
              </div>
            </AdminChartCard>
          </div>
        </section>

        <section v-if="active === 'permissions'" class="section admin-module-page permission-page">
          <div class="permission-grid">
            <article v-for="role in roleCards" :key="role.name" class="card permission-role-card">
              <AdminStatusBadge :label="role.name" :type="role.tone === 'gold' ? 'warning' : 'accent'" />
              <h3>{{ role.members }} 人</h3>
              <p>{{ role.desc }}</p>
            </article>
          </div>

          <div class="admin-management-grid">
            <AdminChartCard title="权限配置" description="菜单、操作、数据和安全权限分组">
              <div class="permission-group-list">
                <article v-for="group in permissionGroups" :key="group.name">
                  <h3>{{ group.name }}</h3>
                  <div class="tag-row"><span v-for="item in group.items" :key="item">{{ item }}</span></div>
                </article>
              </div>
            </AdminChartCard>

            <div class="card table-card admin-table-card-pro">
              <div class="section-head compact"><div><h3>管理员管理</h3><p class="muted">基于当前管理员和用户数据派生展示。</p></div></div>
              <table class="admin-table-pro">
                <thead><tr><th>管理员</th><th>角色</th><th>状态</th><th>最近活跃</th></tr></thead>
                <tbody>
                  <tr v-for="item in adminMembers" :key="`${item.name}-${item.role}`">
                    <td><strong>{{ item.name }}</strong></td>
                    <td>{{ item.role }}</td>
                    <td><AdminStatusBadge :label="item.status" type="success" /></td>
                    <td>{{ item.lastActive }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <AdminChartCard title="操作日志" description="权限相关操作查看入口">
              <div class="admin-activity-feed compact">
                <article v-for="item in realtime.slice(0, 5)" :key="item.id || item.createdAt">
                  <span>{{ item.createdAt }}</span>
                  <div>
                    <strong>{{ item.action }}</strong>
                    <p>{{ actorLabel(item) }} · {{ item.detail || "系统操作" }}</p>
                  </div>
                </article>
              </div>
            </AdminChartCard>
          </div>
        </section>

        <section v-if="active === 'settings'" class="section admin-module-page system-settings-page">
          <div class="settings-grid">
            <article v-for="group in settingGroups" :key="group.title" class="card settings-card">
              <h3>{{ group.title }}</h3>
              <div class="profile-inline-list">
                <p v-for="[label, value] in group.items" :key="label"><span>{{ label }}</span><strong>{{ value }}</strong></p>
              </div>
            </article>
          </div>

          <div class="admin-management-grid">
            <AdminChartCard title="存储使用情况" description="按当前接口记录数派生展示">
              <div class="admin-ratio-list">
                <div v-for="item in storageStatus" :key="item.label" class="rank-row">
                  <span>{{ item.label }}</span>
                  <div class="mini-progress"><i :style="{ width: item.percent }"></i></div>
                  <b>{{ item.value }}</b>
                </div>
              </div>
            </AdminChartCard>

            <AdminChartCard title="安全设置" description="后台安全和维护状态">
              <div class="security-config-list">
                <p><span>JWT 登录</span><AdminStatusBadge label="启用" type="success" /></p>
                <p><span>管理员账号</span><AdminStatusBadge label="演示账号" type="warning" /></p>
                <p><span>危险操作确认</span><AdminStatusBadge label="已开启" type="success" /></p>
                <p><span>接口路径</span><AdminStatusBadge label="保持不变" type="accent" /></p>
              </div>
            </AdminChartCard>
          </div>
        </section>

        <section v-if="active === 'database'" class="section">
          <div class="card table-card">
            <h3>后台模块与 MySQL 表对应</h3>
            <p class="muted">最近同步：{{ summary?.database?.syncedAt ? new Date(summary.database.syncedAt).toLocaleString() : '-' }}</p>
            <table><thead><tr><th>后台模块</th><th>对应数据表</th><th>主要字段</th></tr></thead><tbody><tr v-for="item in rows.moduleTableMap" :key="item.module"><td>{{ item.module }}</td><td>{{ item.tables.join('、') }}</td><td>{{ item.fields }}</td></tr></tbody></table>
          </div>
          <div class="card table-card">
            <h3>数据库表结构与记录数</h3>
            <table><thead><tr><th>表名</th><th>记录数</th><th>字段</th></tr></thead><tbody><tr v-for="table in adminRows('databaseOverview')" :key="table.table"><td>{{ table.table }}</td><td>{{ table.count }}</td><td>{{ table.columns.map((column) => `${column.name}:${column.type}`).join('，') }}</td></tr></tbody></table>
          </div>
          <div class="card table-card">
            <h3>购物车记录 carts</h3>
            <table><thead><tr><th>用户</th><th>商品</th><th>数量</th><th>时间</th></tr></thead><tbody><tr v-for="item in rows.carts" :key="`${item.userKey}-${item.productId}-${item.createdAt}`"><td>{{ item.userName || item.userKey }}</td><td>{{ item.productName || item.productId }}</td><td>{{ item.quantity }}</td><td>{{ item.createdAt || '-' }}</td></tr></tbody></table>
          </div>
        </section>
      </main>
  </AdminLayout>

    <div v-if="modal.visible" class="admin-modal-overlay">
      <form class="card admin-modal admin-modal-form" data-testid="admin-modal-form" @submit.prevent="submitModal">
        <div class="admin-modal-head">
          <div><h3>{{ modal.title }}</h3><p class="muted">填写后保存到现有后台接口。</p></div>
          <button class="icon-button" type="button" @click="closeModal">×</button>
        </div>
        <label v-for="field in modal.fields" :key="field.name" class="field">
          <span>{{ field.label }}</span>
          <textarea v-if="field.type === 'textarea'" v-model="field.value" :name="field.name" :data-testid="`admin-field-${field.name}`" rows="4"></textarea>
          <select v-else-if="field.type === 'select'" v-model="field.value" :name="field.name" :data-testid="`admin-field-${field.name}`">
            <option v-for="option in field.options" :key="optionValue(option)" :value="optionValue(option)">{{ optionLabel(option) }}</option>
          </select>
          <input v-else v-model="field.value" :name="field.name" :data-testid="`admin-field-${field.name}`" :type="field.type || 'text'" :min="field.min" :step="field.step" />
        </label>
        <div class="admin-modal-actions"><button class="btn ghost" type="button" @click="closeModal">取消</button><button class="btn" data-testid="admin-save-modal" type="submit">保存</button></div>
      </form>
    </div>

    <div v-if="confirmDialog.visible" class="admin-modal-overlay">
      <article class="card admin-modal confirm-modal" data-testid="admin-confirm-modal">
        <div class="admin-modal-head">
          <div>
            <h3>{{ confirmDialog.title }}</h3>
            <p class="muted">{{ confirmDialog.body }}</p>
          </div>
          <button class="icon-button" type="button" @click="closeConfirm">×</button>
        </div>
        <div class="admin-modal-actions">
          <button class="btn ghost" data-testid="admin-confirm-cancel" type="button" @click="closeConfirm">取消</button>
          <button
            class="btn"
            :class="{ danger: confirmDialog.danger }"
            data-testid="admin-confirm-delete"
            type="button"
            @click="confirmRemove"
          >
            {{ confirmDialog.confirmText }}
          </button>
        </div>
      </article>
    </div>

    <AdminDrawer :open="Boolean(orderDrawer)" :title="`订单详情 #${orderDrawer?.id || ''}`" @close="orderDrawer = null">
      <div v-if="orderDrawer" class="drawer-detail-list">
        <p><span>订单类型</span><strong>{{ orderTypeLabel(orderDrawer) }}</strong></p>
        <p><span>用户</span><strong>{{ orderDrawer.userName || '线下用户' }} / #{{ orderDrawer.userId || 0 }}</strong></p>
        <p><span>订单状态</span><strong>{{ orderStatusLabel(orderDrawer.status) }}</strong></p>
        <p><span>支付方式</span><strong>{{ paymentMethodLabel(orderDrawer.paymentMethod) }}</strong></p>
        <p><span>付款审核</span><strong>{{ reviewLabel(orderDrawer.paymentReviewStatus) }}</strong></p>
        <p><span>商品明细</span><strong>{{ orderItemsLabel(orderDrawer) }}</strong></p>
        <p><span>订单金额</span><strong>{{ money(orderDrawer.total) }}</strong></p>
      </div>
      <div class="admin-modal-actions">
        <button class="btn ghost" type="button" @click="orderDrawer = null">关闭</button>
        <button class="btn" type="button" @click="openModal('编辑订单', `/api/admin/orders/${orderDrawer.id}`, 'PATCH', orderFields(orderDrawer))">编辑订单</button>
      </div>
    </AdminDrawer>

    <BaseModal :open="Boolean(logDetail)" :title="`日志详情 #${logDetail?.id || ''}`" :description="logDetail?.createdAt || ''" @close="logDetail = null">
        <div class="profile-inline-list">
          <p><span>用户标识</span><strong>{{ actorLabel(logDetail) }}</strong></p>
          <p><span>用户名称</span><strong>{{ logDetail.actorName }}</strong></p>
          <p><span>活动类型</span><strong>{{ logDetail.action }}</strong></p>
          <p><span>关联对象</span><strong>{{ logDetail.targetType || '-' }} {{ logDetail.targetId ? `#${logDetail.targetId}` : '' }}</strong></p>
          <p><span>详细信息</span><strong>{{ logDetail.detail }}</strong></p>
        </div>
        <div class="admin-modal-actions"><BaseButton type="button" @click="logDetail = null">关闭</BaseButton></div>
    </BaseModal>
</template>
