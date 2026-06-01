export const state = {
  page: "home",
  token: localStorage.getItem("coffee_token") || "",
  user: JSON.parse(localStorage.getItem("coffee_user") || "null"),
  adminUser: JSON.parse(localStorage.getItem("coffee_admin_user") || "null"),
  adminToken: localStorage.getItem("coffee_admin_token") || "",
  data: {},
  selectedSeats: [],
  reservationPeople: 1,
  reservationDate: new Date().toISOString().slice(0, 10),
  reservationTime: "10:00",
  reservationPhone: "",
  selectedProductId: 1,
  selectedBookId: 1,
  selectedPostId: 1,
  selectedCommunityUser: "阿晨",
  selectedCommunityProfile: null,
  selectedActivityId: 1,
  cart: JSON.parse(localStorage.getItem("coffee_cart") || "[]"),
  selectedCartIds: [],
  checkoutItems: [],
  checkoutCartIds: [],
  checkoutDraft: null,
  selectedOrderId: null,
  pendingReservation: null,
  pendingCheckout: null,
  lastOrder: null
};

export const frontNav = [
  ["home", "首页"],
  ["culture", "咖啡文化"],
  ["books", "精品书库"],
  ["shop", "文创商城"],
  ["community", "书友社区"],
  ["activities", "活动赛事"]
];

export const adminNav = [
  ["adminWorkbench", "工作台"],
  ["adminUsers", "用户管理"],
  ["adminProducts", "商品管理"],
  ["adminBooks", "书籍管理"],
  ["adminOrders", "订单管理"],
  ["adminReservations", "预约管理"],
  ["adminActivities", "活动管理"],
  ["adminCommunity", "社区审核"],
  ["adminContent", "内容管理"],
  ["adminIncome", "收入查看"],
  ["adminDashboard", "数据大屏"]
];

export function setPage(page) {
  state.page = page;
}

export function saveCart() {
  localStorage.setItem("coffee_cart", JSON.stringify(state.cart));
}

export function loginUser(data) {
  state.user = data.user;
  state.token = data.token;
  localStorage.setItem("coffee_user", JSON.stringify(data.user));
  localStorage.setItem("coffee_token", data.token);
}

export function updateUser(user) {
  state.user = user;
  localStorage.setItem("coffee_user", JSON.stringify(user));
}

export function loginAdmin(data) {
  state.adminUser = data.user;
  state.adminToken = data.token;
  localStorage.setItem("coffee_admin_user", JSON.stringify(data.user));
  localStorage.setItem("coffee_admin_token", data.token);
}

export function logoutAdmin() {
  state.adminUser = null;
  state.adminToken = "";
  localStorage.removeItem("coffee_admin_user");
  localStorage.removeItem("coffee_admin_token");
}

export function logout() {
  state.user = null;
  state.token = "";
  state.cart = [];
  localStorage.removeItem("coffee_user");
  localStorage.removeItem("coffee_token");
  localStorage.removeItem("coffee_cart");
}
