<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue";
import AdminTableTools from "@/components/AdminTableTools.vue";
import { adminRequest } from "@/api";

const adminUser = ref(JSON.parse(localStorage.getItem("coffee_admin_user") || "null"));
const active = ref("workbench");
const loading = ref(false);
const error = ref("");
const message = ref("");
const summary = ref(null);
const realtime = ref([]);
const logDetail = ref(null);
const modal = reactive({ visible: false, title: "", endpoint: "", method: "POST", fields: [] });
const confirmDialog = reactive({ visible: false, title: "", body: "", endpoint: "" });
const adminQuery = ref("");
const adminStatus = ref("all");
const adminPage = ref(1);
const adminPageSize = ref(8);
const loginForm = reactive({ account: "admin", password: "admin123" });
let realtimeTimer = null;

const navItems = [
  ["workbench", "工作台"],
  ["logs", "实时日志"],
  ["users", "用户管理"],
  ["products", "商品管理"],
  ["books", "书籍管理"],
  ["orders", "订单管理"],
  ["reservations", "预约管理"],
  ["activities", "活动管理"],
  ["community", "社区审核"],
  ["content", "内容管理"],
  ["income", "收入查看"],
  ["database", "数据库对应"],
  ["dashboard", "数据看板"]
];

const money = (value) => `￥${Number(value || 0).toFixed(2)}`;
const rows = computed(() => ({
  users: summary.value?.users || [],
  products: summary.value?.products || [],
  books: summary.value?.books || [],
  orders: summary.value?.orders || [],
  reservations: summary.value?.reservations || [],
  activities: summary.value?.activities || [],
  activityApplications: summary.value?.activityApplications || [],
  carts: summary.value?.carts || [],
  databaseOverview: summary.value?.database?.overview || [],
  moduleTableMap: summary.value?.database?.moduleTableMap || [],
  posts: summary.value?.posts || [],
  notices: summary.value?.notices || []
}));
const comments = computed(() => rows.value.posts.flatMap((post) => (post.comments || []).map((comment) => ({ ...comment, postId: post.id, postTitle: post.title }))));
const tableKeyByModule = {
  logs: "realtime",
  users: "users",
  products: "products",
  books: "books",
  orders: "orders",
  reservations: "reservations",
  activities: "activities",
  community: "posts",
  content: "notices",
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
  reservations: { placeholder: "搜索座位、手机号、日期或用途", filter: "预约状态" },
  activities: { placeholder: "搜索活动名称、地点、日期或报名手机号", filter: "活动筛选" },
  posts: { placeholder: "搜索动态标题、作者、评论或审核状态", filter: "社区筛选" },
  notices: { placeholder: "搜索公告标题、摘要或发布时间", filter: "内容筛选" },
  databaseOverview: { placeholder: "搜索表名、字段名或数据类型", filter: "数据筛选" }
};
const activeToolCopy = computed(() => toolCopy[activeTableKey.value] || { placeholder: "输入关键词搜索当前页面", filter: "筛选" });

watch(active, () => {
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

async function showLogDetail(item) {
  logDetail.value = await adminRequest(`/api/admin/realtime/${item.id}`);
}

async function reviewPayment(item, status) {
  await adminRequest(`/api/admin/orders/${item.id}/payment-review`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
  message.value = status === "approved" ? "付款审核已通过" : "付款审核已驳回";
  await refresh();
}

async function reviewComment(comment, status) {
  await adminRequest(`/api/admin/posts/${comment.postId}/comments/${comment.id}`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
  message.value = status === "approved" ? "评论审核已通过" : "评论审核已驳回";
  await refresh();
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

async function remove(endpoint) {
  Object.assign(confirmDialog, {
    visible: true,
    title: "确认删除",
    body: "删除后数据将从后台列表中移除，请确认这不是误操作。",
    endpoint
  });
}

function closeConfirm() {
  Object.assign(confirmDialog, { visible: false, title: "", body: "", endpoint: "" });
}

async function confirmRemove() {
  try {
    await adminRequest(confirmDialog.endpoint, { method: "DELETE" });
    closeConfirm();
    message.value = "删除成功";
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
  { name: "status", label: "订单状态", value: item.status || "待支付", type: "select", options: ["待支付", "支付审核中", "已支付", "已完成", "已取消"] },
  { name: "paymentMethod", label: "支付方式", value: item.paymentMethod || "" },
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
    return String(item.status || "").includes(status) || String(item.paymentReviewStatus || "").includes(status);
  }
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
          <label class="field"><span>账号</span><input v-model.trim="loginForm.account" data-testid="admin-account" required /></label>
          <label class="field"><span>密码</span><input v-model="loginForm.password" data-testid="admin-password" type="password" required /></label>
          <p v-if="error" class="form-error">{{ error }}</p>
          <button class="btn checkout-main-btn" data-testid="admin-login-submit" type="submit" :disabled="loading">{{ loading ? "登录中..." : "进入后台" }}</button>
          <p class="muted">演示账号：admin / admin123</p>
        </form>
      </section>
    </main>
  </div>

  <div v-else class="app-shell" data-testid="admin-shell">
    <header class="topbar admin-topbar">
      <a class="brand brand-button" href="/admin.html"><span class="brand-mark">咖</span><span>咖啡书屋后台管理</span></a>
      <div class="auth-actions">
        <span class="level-trigger">{{ adminUser.name }}</span>
        <button class="btn ghost" type="button" @click="logout">退出后台</button>
      </div>
    </header>

    <div class="admin-layout">
      <aside class="admin-sidebar">
        <strong>管理模块</strong>
        <button v-for="[key, label] in navItems" :key="key" :class="{ active: active === key }" :data-testid="`admin-nav-${key}`" type="button" @click="active = key">{{ label }}</button>
      </aside>

      <main class="main page-transition">
        <div class="section-head">
          <div><h2>{{ navItems.find(([key]) => key === active)?.[1] }}</h2><p class="lead">独立后台页面，复用现有后台接口和数据库结构。</p></div>
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

        <section v-if="active === 'workbench'" class="section">
          <div class="grid">
            <div class="card metric"><span class="muted">用户数</span><strong>{{ rows.users.length }}</strong><span>会员账户</span></div>
            <div class="card metric"><span class="muted">商品数</span><strong>{{ rows.products.length }}</strong><span>文创与饮品</span></div>
            <div class="card metric"><span class="muted">订单数</span><strong>{{ rows.orders.length }}</strong><span>实时订单</span></div>
            <div class="card metric"><span class="muted">社区内容</span><strong>{{ rows.posts.length }}</strong><span>动态与评论</span></div>
          </div>
          <div class="card table-card">
            <h3>实时日志</h3>
            <table><thead><tr><th>时间</th><th>用户标识</th><th>用户</th><th>活动</th><th>操作</th></tr></thead><tbody><tr v-for="item in realtime.slice(0, 8)" :key="item.id"><td>{{ item.createdAt }}</td><td>{{ actorLabel(item) }}</td><td>{{ item.actorName }}</td><td>{{ item.action }}</td><td><button class="btn ghost" type="button" @click="showLogDetail(item)">查看详情</button></td></tr></tbody></table>
          </div>
        </section>

        <section v-if="active === 'logs'" class="section">
          <div class="card table-card">
            <h3>全部实时日志</h3>
            <p class="muted">每 5 秒自动刷新，用户 ID 作为唯一标识符。</p>
            <table><thead><tr><th>时间</th><th>用户标识</th><th>用户</th><th>活动</th><th>对象</th><th>操作</th></tr></thead><tbody><tr v-for="item in adminRows('realtime')" :key="item.id"><td>{{ item.createdAt }}</td><td>{{ actorLabel(item) }}</td><td>{{ item.actorName }}</td><td>{{ item.action }}</td><td>{{ item.targetType || '-' }} {{ item.targetId ? `#${item.targetId}` : '' }}</td><td><button class="btn ghost" type="button" @click="showLogDetail(item)">查看详情</button></td></tr></tbody></table>
          </div>
        </section>

        <section v-if="active === 'users'" class="section">
          <button class="btn" type="button" @click="openModal('新增用户', '/api/admin/users', 'POST', userFields())">新增用户</button>
          <div class="card table-card"><table><thead><tr><th>ID</th><th>用户</th><th>手机号</th><th>邮箱</th><th>等级</th><th>积分</th><th>操作</th></tr></thead><tbody><tr v-for="item in adminRows('users')" :key="item.id"><td>{{ item.id }}</td><td>{{ item.name }}</td><td>{{ item.phone }}</td><td>{{ item.email || '-' }}</td><td>{{ item.level }}</td><td>{{ item.points }}</td><td><button class="btn ghost" @click="openModal('编辑用户', `/api/admin/users/${item.id}`, 'PATCH', userFields(item))">编辑</button><button class="btn danger" @click="remove(`/api/admin/users/${item.id}`)">删除</button></td></tr></tbody></table></div>
        </section>

        <section v-if="active === 'products'" class="section">
          <button class="btn" data-testid="admin-add-product" type="button" @click="openModal('新增商品', '/api/admin/products', 'POST', productFields())">新增商品</button>
          <div v-for="categoryKey in ['coffee', 'creative']" :key="categoryKey" class="card table-card">
            <h3>{{ productCategoryLabel(categoryKey) }}</h3>
            <table><thead><tr><th>ID</th><th>商品</th><th>分类</th><th>价格</th><th>库存</th><th>操作</th></tr></thead><tbody><tr v-for="item in adminRows('products').filter((product) => product.category === categoryKey)" :key="item.id"><td>{{ item.id }}</td><td>{{ item.name }}</td><td>{{ productCategoryLabel(item.category) }}</td><td>{{ money(item.price) }}</td><td>{{ item.stock }}</td><td><button class="btn ghost" @click="openModal('编辑商品', `/api/admin/products/${item.id}`, 'PATCH', productFields(item))">编辑</button><button class="btn danger" @click="remove(`/api/admin/products/${item.id}`)">删除</button></td></tr><tr v-if="!adminRows('products').filter((product) => product.category === categoryKey).length"><td colspan="6">暂无{{ productCategoryLabel(categoryKey) }}</td></tr></tbody></table>
          </div>
        </section>

        <section v-if="active === 'books'" class="section">
          <button class="btn" type="button" @click="openModal('新增书籍', '/api/admin/books', 'POST', bookFields())">新增书籍</button>
          <div class="card table-card"><table><thead><tr><th>书名</th><th>作者</th><th>分类</th><th>收录时间</th><th>操作</th></tr></thead><tbody><tr v-for="item in adminRows('books')" :key="item.id"><td>{{ item.title }}</td><td>{{ item.author }}</td><td>{{ item.category }}</td><td>{{ item.publishedAt }}</td><td><button class="btn ghost" @click="openModal('编辑书籍', `/api/admin/books/${item.id}`, 'PATCH', bookFields(item))">编辑</button><button class="btn danger" @click="remove(`/api/admin/books/${item.id}`)">删除</button></td></tr></tbody></table></div>
        </section>

        <section v-if="active === 'orders'" class="section" data-testid="admin-orders-table">
          <button class="btn" type="button" @click="openModal('新增订单', '/api/admin/orders', 'POST', orderFields())">新增订单</button>
          <div v-for="typeKey in ['coffee', 'creative', 'mixed']" :key="typeKey" class="card table-card">
            <h3>{{ typeKey === 'coffee' ? '咖啡订单' : typeKey === 'creative' ? '文创订单' : '混合订单' }}</h3>
            <table><thead><tr><th>订单号</th><th>类型</th><th>用户ID</th><th>用户</th><th>商品数</th><th>金额</th><th>状态</th><th>支付</th><th>付款审核</th><th>操作</th></tr></thead><tbody><tr v-for="item in adminRows('orders').filter((order) => orderType(order) === typeKey)" :key="item.id"><td>#{{ item.id }}</td><td>{{ orderTypeLabel(item) }}</td><td>{{ item.userId || 0 }}</td><td>{{ item.userName }}</td><td>{{ item.items?.length || 0 }}</td><td>{{ money(item.total) }}</td><td>{{ item.status }}</td><td>{{ item.paymentMethod || '-' }}</td><td><span class="status">{{ reviewLabel(item.paymentReviewStatus) }}</span><div v-if="item.paymentReviewStatus === 'pending'" class="actions"><button class="btn" type="button" @click="reviewPayment(item, 'approved')">通过</button><button class="btn secondary" type="button" @click="reviewPayment(item, 'rejected')">驳回</button></div></td><td><button class="btn ghost" @click="openModal('编辑订单', `/api/admin/orders/${item.id}`, 'PATCH', orderFields(item))">编辑</button><button class="btn danger" @click="remove(`/api/admin/orders/${item.id}`)">删除</button></td></tr><tr v-if="!adminRows('orders').filter((order) => orderType(order) === typeKey).length"><td colspan="10">暂无{{ typeKey === 'coffee' ? '咖啡订单' : typeKey === 'creative' ? '文创订单' : '混合订单' }}</td></tr></tbody></table>
          </div>
        </section>

        <section v-if="active === 'reservations'" class="section">
          <button class="btn" type="button" @click="openModal('新增预约', '/api/admin/reservations', 'POST', reservationFields())">新增预约</button>
          <div class="card table-card"><table><thead><tr><th>ID</th><th>用户ID</th><th>座位</th><th>手机号</th><th>日期</th><th>时间</th><th>人数</th><th>状态</th><th>操作</th></tr></thead><tbody><tr v-for="item in adminRows('reservations')" :key="item.id"><td>{{ item.id }}</td><td>{{ item.userId || 0 }}</td><td>{{ item.seatId }}</td><td>{{ item.phone || '-' }}</td><td>{{ item.date }}</td><td>{{ item.time }}</td><td>{{ item.people }}</td><td>{{ item.status }}</td><td><button class="btn ghost" @click="openModal('编辑预约', `/api/admin/reservations/${item.id}`, 'PATCH', reservationFields(item))">编辑</button><button class="btn danger" @click="remove(`/api/admin/reservations/${item.id}`)">删除</button></td></tr></tbody></table></div>
        </section>

        <section v-if="active === 'activities'" class="section">
          <button class="btn" type="button" @click="openModal('新增活动', '/api/admin/activities', 'POST', activityFields())">新增活动</button>
          <div class="card table-card"><table><thead><tr><th>ID</th><th>活动</th><th>日期</th><th>地点</th><th>直接报名</th><th>提前报名</th><th>报名</th><th>操作</th></tr></thead><tbody><tr v-for="item in adminRows('activities')" :key="item.id"><td>{{ item.id }}</td><td>{{ item.title }}</td><td>{{ item.date }} {{ item.time }}</td><td>{{ item.location || '-' }}</td><td>{{ item.registrationStart || '-' }}</td><td>{{ item.earlyStart || '-' }}</td><td>{{ item.applied }}/{{ item.capacity }}</td><td><button class="btn ghost" @click="openModal('编辑活动', `/api/admin/activities/${item.id}`, 'PATCH', activityFields(item))">编辑</button><button class="btn danger" @click="remove(`/api/admin/activities/${item.id}`)">删除</button></td></tr></tbody></table></div>
          <div v-for="activity in adminRows('activities')" :key="`applications-${activity.id}`" class="card table-card">
            <h3>{{ activity.title }} 报名明细</h3>
            <p class="muted">来自 activity_applications 表，按 activity_id 与当前活动关联；提前报名会单独标注，便于核对会员权益。</p>
            <table><thead><tr><th>ID</th><th>用户ID</th><th>用户</th><th>会员等级</th><th>手机号</th><th>人数</th><th>报名类型</th><th>时间</th></tr></thead><tbody><tr v-for="item in applicationsForActivity(activity.id)" :key="item.id"><td>{{ item.id }}</td><td>{{ item.userId || 0 }}</td><td>{{ item.userName || (item.userId ? `用户 #${item.userId}` : '访客') }}</td><td>{{ item.userLevel || '-' }}</td><td>{{ item.phone }}</td><td>{{ item.people }}</td><td><span class="status-pill" :class="item.kind === 'early' ? 'pending' : 'done'">{{ applicationKindLabel(item.kind) }}</span></td><td>{{ item.createdAt }}</td></tr><tr v-if="!applicationsForActivity(activity.id).length"><td colspan="8">暂无报名记录</td></tr></tbody></table>
          </div>
        </section>

        <section v-if="active === 'community'" class="section">
          <div class="card table-card"><table><thead><tr><th>作者</th><th>标题</th><th>点赞</th><th>前台可见评论</th><th>待审核评论</th><th>数据状态</th><th>操作</th></tr></thead><tbody><tr v-for="item in adminRows('posts')" :key="item.id"><td>{{ item.author }}</td><td>{{ item.title }}</td><td>{{ item.likes }}</td><td>{{ item.comments?.filter((comment) => comment.status === 'approved').length || 0 }}</td><td>{{ item.comments?.filter((comment) => comment.status === 'pending').length || 0 }}</td><td><span class="status">{{ item.userId ? '会员动态' : '后台发布' }}</span></td><td><button class="btn ghost" @click="openModal('编辑动态', `/api/admin/posts/${item.id}`, 'PATCH', [{ name: 'title', label: '标题', value: item.title }, { name: 'content', label: '内容', value: item.content, type: 'textarea' }])">编辑</button><button class="btn danger" @click="remove(`/api/admin/posts/${item.id}`)">删除</button></td></tr></tbody></table></div>
          <div class="card table-card">
            <h3>评论审核</h3>
            <table><thead><tr><th>评论ID</th><th>动态</th><th>用户ID</th><th>用户</th><th>评论内容</th><th>状态</th><th>操作</th></tr></thead><tbody><tr v-for="item in comments" :key="item.id"><td>#{{ item.id }}</td><td>#{{ item.postId }} {{ item.postTitle }}</td><td>{{ item.userId || 0 }}</td><td>{{ item.user }}</td><td>{{ item.content }}</td><td><span class="status">{{ reviewLabel(item.status) }}</span></td><td><button class="btn" type="button" @click="reviewComment(item, 'approved')">通过</button><button class="btn secondary" type="button" @click="reviewComment(item, 'rejected')">驳回</button><button class="btn danger" type="button" @click="remove(`/api/admin/posts/${item.postId}/comments/${item.id}`)">删除</button></td></tr><tr v-if="!comments.length"><td colspan="7">暂无评论</td></tr></tbody></table>
          </div>
        </section>

        <section v-if="active === 'content'" class="section">
          <button class="btn" type="button" @click="openModal('新增公告', '/api/admin/notices', 'POST', noticeFields())">新增公告</button>
          <div class="card table-card"><table><thead><tr><th>标题</th><th>摘要</th><th>发布时间</th><th>操作</th></tr></thead><tbody><tr v-for="item in adminRows('notices')" :key="item.id"><td>{{ item.title }}</td><td>{{ item.summary }}</td><td>{{ item.date }}</td><td><button class="btn ghost" @click="openModal('编辑公告', `/api/admin/notices/${item.id}`, 'PATCH', noticeFields(item))">编辑</button><button class="btn danger" @click="remove(`/api/admin/notices/${item.id}`)">删除</button></td></tr></tbody></table></div>
        </section>

        <section v-if="active === 'income'" class="section">
          <div class="grid">
            <div class="card metric"><span class="muted">收入总额</span><strong>{{ money(summary?.income?.total) }}</strong><span>已支付订单</span></div>
            <div class="card metric"><span class="muted">订单数</span><strong>{{ summary?.income?.count || 0 }}</strong><span>支付完成</span></div>
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

        <section v-if="active === 'dashboard'" class="section">
          <div class="grid">
            <div v-for="item in summary?.dashboard?.metrics || []" :key="item.label" class="card metric"><span class="muted">{{ item.label }}</span><strong>{{ item.value }}</strong><span>{{ item.note }}</span></div>
          </div>
        </section>
      </main>
    </div>

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
          <button class="btn danger" data-testid="admin-confirm-delete" type="button" @click="confirmRemove">确认删除</button>
        </div>
      </article>
    </div>

    <div v-if="logDetail" class="admin-modal-overlay">
      <article class="card admin-modal">
        <div class="admin-modal-head">
          <div><h3>日志详情 #{{ logDetail.id }}</h3><p class="muted">{{ logDetail.createdAt }}</p></div>
          <button class="icon-button" type="button" @click="logDetail = null">×</button>
        </div>
        <div class="profile-inline-list">
          <p><span>用户标识</span><strong>{{ actorLabel(logDetail) }}</strong></p>
          <p><span>用户名称</span><strong>{{ logDetail.actorName }}</strong></p>
          <p><span>活动类型</span><strong>{{ logDetail.action }}</strong></p>
          <p><span>关联对象</span><strong>{{ logDetail.targetType || '-' }} {{ logDetail.targetId ? `#${logDetail.targetId}` : '' }}</strong></p>
          <p><span>详细信息</span><strong>{{ logDetail.detail }}</strong></p>
        </div>
        <div class="admin-modal-actions"><button class="btn" type="button" @click="logDetail = null">关闭</button></div>
      </article>
    </div>
  </div>
</template>
