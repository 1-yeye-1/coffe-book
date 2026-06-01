import { adminNav, frontNav, logout, logoutAdmin, setPage, state, updateUser } from "./shared/state.js";
import { request } from "./shared/api.js";
import { appLayout } from "./shared/layout.js";
import { card, formData, money, toast } from "./shared/ui.js";

import { renderHome, bindHome } from "./client/home.js";
import { renderCulture, bindCulture } from "./client/coffee-culture.js";
import { renderBooks, bindBooks, renderBookDetail } from "./client/book-library.js";
import { renderProductList, bindProductList } from "./client/creative-shop.js";
import { renderCart, bindCart } from "./client/shopping-cart.js";
import { renderOrderConfirm, bindOrderConfirm } from "./client/payment-flow/order-confirmation.js";
import { renderPayment, bindPayment } from "./client/payment-flow/payment.js";
import { renderPaymentResult, bindPaymentResult } from "./client/payment-flow/payment-result.js";
import { renderOrderDetail, bindOrderDetail } from "./client/order-detail.js";
import { renderSeatSelect, bindSeatSelect } from "./client/reservations/seat-selection.js";
import { renderReservationConfirm, bindReservationConfirm } from "./client/reservations/reservation-confirmation.js";
import { renderMyReservations } from "./client/reservations/my-reservations.js";
import { renderCommunityHome, bindCommunityHome } from "./client/community/community-home.js";
import { renderPublishPost, bindPublishPost } from "./client/community/publish-post.js";
import { renderPostDetail, bindPostDetail } from "./client/community/post-detail.js";
import { renderUserHome } from "./client/community/user-home.js";
import { renderActivities, bindActivities, renderActivityDetail, bindActivityDetail } from "./client/events.js";
import { renderMemberCenter, bindMemberCenter } from "./client/member-center/index.js";
import { renderUserLogin, bindUserLogin } from "./client/member-center/login.js";
import { renderUserRegister, bindUserRegister } from "./client/member-center/register.js";
import { renderProfile, bindProfile } from "./client/member-center/profile.js";
import {
  renderFavorites,
  bindFavorites,
  renderNotes,
  bindNotes,
  renderNotifications,
  bindNotifications,
  renderMyOrders,
  bindMyOrders,
  renderPointsCenter,
  bindPointsCenter,
  renderMyGifts,
  bindMyGifts
} from "./client/member-center/panels.js";
import { renderBrand } from "./client/brand-introduction.js";

import { renderAdminLogin, bindAdminLogin } from "./admin/login.js";
import { renderWorkbench } from "./admin/workbench.js";
import { renderUserManage, bindUserManage } from "./admin/user-management.js";
import { renderProductManage, bindProductManage } from "./admin/product-management.js";
import { renderBookManage, bindBookManage } from "./admin/book-management.js";
import { renderOrderManage, bindOrderManage } from "./admin/order-management.js";
import { renderReservationManage, bindReservationManage } from "./admin/reservation-management.js";
import { renderActivityManage, bindActivityManage } from "./admin/activity-management.js";
import { renderCommunityAudit, bindCommunityAudit } from "./admin/community-review.js";
import { renderContentManage, bindContentManage } from "./admin/content-management.js";
import { bindAdminDashboard, renderAdminDashboard, stopAdminDashboardRefresh } from "./admin/data-dashboard.js";
import { renderIncome } from "./admin/income-view.js";
import { bindRealtimeLog, renderRealtimeLog } from "./admin/realtime-log.js";

const routes = {
  home: { render: renderHome, bind: bindHome },
  culture: { render: renderCulture, bind: bindCulture },
  books: { render: renderBooks, bind: bindBooks },
  bookDetail: { render: renderBookDetail },
  shop: { render: renderProductList, bind: bindProductList },
  cart: { render: renderCart, bind: bindCart, auth: true },
  orderConfirm: { render: renderOrderConfirm, bind: bindOrderConfirm, auth: true },
  payment: { render: renderPayment, bind: bindPayment, auth: true },
  paymentResult: { render: renderPaymentResult, bind: bindPaymentResult, auth: true },
  orderDetail: { render: renderOrderDetail, bind: bindOrderDetail, auth: true },
  reservation: { render: renderSeatSelect, bind: bindSeatSelect },
  reservationConfirm: { render: renderReservationConfirm, bind: bindReservationConfirm },
  myReservations: { render: renderMyReservations, auth: true },
  community: { render: renderCommunityHome, bind: bindCommunityHome },
  publishPost: { render: renderPublishPost, bind: bindPublishPost, auth: true },
  postDetail: { render: renderPostDetail, bind: bindPostDetail },
  userHome: { render: renderUserHome },
  activities: { render: renderActivities, bind: bindActivities },
  activityDetail: { render: renderActivityDetail, bind: bindActivityDetail },
  member: { render: renderMemberCenter, bind: bindMemberCenter, auth: true },
  profile: { render: renderProfile, bind: bindProfile, auth: true },
  favorites: { render: renderFavorites, bind: bindFavorites, auth: true },
  notes: { render: renderNotes, bind: bindNotes, auth: true },
  notifications: { render: renderNotifications, bind: bindNotifications, auth: true },
  myOrders: { render: renderMyOrders, bind: bindMyOrders, auth: true },
  pointsCenter: { render: renderPointsCenter, bind: bindPointsCenter, auth: true },
  myGifts: { render: renderMyGifts, bind: bindMyGifts, auth: true },
  userLogin: { render: renderUserLogin, bind: bindUserLogin },
  userRegister: { render: renderUserRegister, bind: bindUserRegister },
  brand: { render: renderBrand },
  adminLogin: { render: renderAdminLogin, bind: bindAdminLogin },
  adminWorkbench: { render: renderWorkbench, admin: true },
  adminUsers: { render: renderUserManage, bind: bindUserManage, admin: true },
  adminProducts: { render: renderProductManage, bind: bindProductManage, admin: true },
  adminBooks: { render: renderBookManage, bind: bindBookManage, admin: true },
  adminOrders: { render: renderOrderManage, bind: bindOrderManage, admin: true },
  adminReservations: { render: renderReservationManage, bind: bindReservationManage, admin: true },
  adminActivities: { render: renderActivityManage, bind: bindActivityManage, admin: true },
  adminCommunity: { render: renderCommunityAudit, bind: bindCommunityAudit, admin: true },
  adminContent: { render: renderContentManage, bind: bindContentManage, admin: true },
  adminIncome: { render: renderIncome, admin: true },
  adminDashboard: { render: renderAdminDashboard, bind: bindAdminDashboard, admin: true },
  adminRealtime: { render: renderRealtimeLog, bind: bindRealtimeLog, admin: true }
};

const defaultPage = window.COFFEE_BOOK_ENTRY === "admin" ? (state.adminToken ? "adminWorkbench" : "adminLogin") : "home";

function routeFromPath(pathname) {
  if (pathname === "/checkout") return { page: "orderConfirm" };
  if (pathname === "/orders") return { page: "myOrders" };
  const paymentMatch = pathname.match(/^\/payment\/([^/]+)$/);
  if (paymentMatch) return { page: "payment", selectedOrderId: paymentMatch[1] };
  const successMatch = pathname.match(/^\/payment-success\/([^/]+)$/);
  if (successMatch) return { page: "paymentResult", selectedOrderId: successMatch[1] };
  const orderMatch = pathname.match(/^\/orders\/([^/]+)$/);
  if (orderMatch) return { page: "orderDetail", selectedOrderId: orderMatch[1] };
  return null;
}

function pathFromPage(page) {
  if (page === "orderConfirm") return "/checkout";
  if (page === "payment" && state.selectedOrderId) return `/payment/${state.selectedOrderId}`;
  if (page === "paymentResult" && state.selectedOrderId) return `/payment-success/${state.selectedOrderId}`;
  if (page === "myOrders") return "/orders";
  if (page === "orderDetail" && state.selectedOrderId) return `/orders/${state.selectedOrderId}`;
  return "/";
}

const pathRoute = routeFromPath(window.location.pathname);
if (pathRoute) {
  state.page = pathRoute.page;
  state.selectedOrderId = pathRoute.selectedOrderId || state.selectedOrderId;
} else {
  state.page = window.history.state?.page || defaultPage;
}
window.history.replaceState({ page: state.page, selectedOrderId: state.selectedOrderId }, "", pathFromPage(state.page));

async function loadData() {
  const [home, products, books, seats, posts, activities, dashboard] = await Promise.all([
    request("/api/home"),
    request("/api/products"),
    request("/api/books"),
    request(`/api/seats/status?date=${encodeURIComponent(state.reservationDate)}&time=${encodeURIComponent(state.reservationTime)}`),
    request("/api/posts"),
    request("/api/activities"),
    request("/api/dashboard")
  ]);

  state.data = { home, products, books, seats, posts, activities, dashboard, admin: { users: [], orders: [], reservations: [], activities: [], notices: [], books: [], posts: [], income: { total: 0, count: 0, orders: [] } }, member: null };

  if (state.adminToken && window.COFFEE_BOOK_ENTRY === "admin") {
    try {
      state.data.admin = await request("/api/admin/summary");
    } catch {
      logoutAdmin();
    }
  }

  if (state.user) {
    try {
      state.data.member = await request("/api/member");
      updateUser(state.data.member);
    } catch {
      logout();
    }
  }
}

function makeContext() {
  return {
    state,
    frontNav,
    adminNav,
    request,
    render,
    setPage: (page) => {
      setPage(page);
      window.history.pushState({ page, selectedOrderId: state.selectedOrderId }, "", pathFromPage(page));
      render();
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    toast,
    money,
    card,
    formData
  };
}

function currentRoute() {
  const route = routes[state.page] || routes.home;
  if (state.page === "adminLogin") return routes.adminLogin;
  if (route.auth && !state.user) {
    state.page = "userLogin";
    window.history.replaceState({ page: state.page }, "");
    return routes.userLogin;
  }
  if (route.admin && !state.adminUser) {
    state.page = "adminLogin";
    window.history.replaceState({ page: state.page }, "");
    return routes.adminLogin;
  }
  return route;
}

async function render() {
  stopAdminDashboardRefresh();
  await loadData();
  const route = currentRoute();
  const ctx = makeContext();
  document.querySelector("#app").innerHTML = appLayout(ctx, route.render(ctx));
  bindLayout(ctx);
  route.bind?.(ctx);
}

window.addEventListener("popstate", (event) => {
  const pathRoute = routeFromPath(window.location.pathname);
  setPage(pathRoute?.page || event.state?.page || defaultPage);
  state.selectedOrderId = pathRoute?.selectedOrderId || event.state?.selectedOrderId || state.selectedOrderId;
  render();
});

function bindLayout(ctx) {
  document.querySelectorAll("[data-page]").forEach((el) => {
    el.addEventListener("click", () => ctx.setPage(el.dataset.page));
  });

  document.querySelector("[data-action='logout']")?.addEventListener("click", () => {
    logout();
    toast("已退出登录");
    ctx.setPage("home");
  });

  document.querySelector("[data-action='admin-logout']")?.addEventListener("click", () => {
    logoutAdmin();
    toast("已退出后台");
    ctx.setPage("adminLogin");
  });
}

render().catch((error) => {
  document.querySelector("#app").innerHTML = `
    <main class="main">
      <section class="card">
        <h1>启动失败</h1>
        <p>${error.message}</p>
        <p class="muted">请确认后端已通过 node index.js 启动在 http://localhost:4173。</p>
      </section>
    </main>
  `;
});
