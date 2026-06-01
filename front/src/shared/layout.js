function isFrontActive(current, page) {
  if (page === "shop") return current === "shop";
  if (page === "books") return ["books", "bookDetail"].includes(current);
  if (page === "reservation") return ["reservation", "reservationConfirm", "myReservations"].includes(current);
  if (page === "community") return ["community", "publishPost", "postDetail", "userHome"].includes(current);
  if (page === "member") return ["member", "pointsCenter", "myGifts", "myOrders", "orderDetail"].includes(current);
  if (page === "adminLogin") return current.startsWith("admin");
  return current === page;
}

function accountArea(ctx) {
  const { state } = ctx;
  const cartCount = state.cart.reduce((sum, item) => sum + Number(item.quantity || 1), 0);
  if (!state.user) {
    return `
      <div class="auth-actions">
        <button class="btn ghost" data-page="userLogin">登录</button>
        <button class="btn" data-page="userRegister">注册</button>
      </div>
    `;
  }

  return `
    <button class="level-trigger" data-page="member" type="button">${state.user.level || "普通会员"}</button>
    <div class="account-menu">
      <button class="account-trigger" type="button" aria-haspopup="true">
        <span class="avatar">${state.user.avatar ? `<img src="${state.user.avatar}" alt="${escapeHtml(state.user.name)}" />` : escapeHtml(state.user.name.slice(0, 1))}</span>
        <span>${escapeHtml(state.user.name)}</span>
        <span class="chevron">⌄</span>
      </button>
      <div class="account-dropdown" role="menu">
        <button data-page="cart" role="menuitem">购物车${cartCount ? `<span class="menu-badge">${cartCount}</span>` : ""}</button>
        <button data-page="myOrders" role="menuitem">我的订单</button>
        <button data-page="favorites" role="menuitem">我的收藏</button>
        <button data-page="notes" role="menuitem">我的笔记</button>
        <button data-page="notifications" role="menuitem">消息通知</button>
        <button data-page="pointsCenter" role="menuitem">积分中心</button>
        <button data-page="myGifts" role="menuitem">我的礼品</button>
        <button data-page="profile" role="menuitem">个人中心</button>
        <button data-action="logout" role="menuitem">退出登录</button>
      </div>
    </div>
  `;
}

function adminSidebar(ctx) {
  if (!ctx.state.page.startsWith("admin") || ctx.state.page === "adminLogin") return "";

  return `
    <aside class="admin-sidebar">
      <strong>后台管理端</strong>
      ${ctx.adminNav.map(([page, label]) => `
        <button class="${ctx.state.page === page ? "active" : ""}" data-page="${page}">${label}</button>
      `).join("")}
    </aside>
  `;
}

export function appLayout(ctx, content) {
  const { state, frontNav } = ctx;
  const isAdmin = state.page.startsWith("admin");

  if (isAdmin) {
    return `
      <div class="app-shell">
        <header class="topbar admin-topbar">
          <div class="brand"><span class="brand-mark">咖</span><span>咖啡书屋后台</span></div>
          ${state.page === "adminLogin" ? `<a class="btn ghost" href="/">返回用户端</a>` : `<button class="btn ghost" data-action="admin-logout">退出后台</button>`}
        </header>
        <div class="${state.page === "adminLogin" ? "" : "admin-layout"}">
          ${adminSidebar(ctx)}
          <main class="main page-transition">${content}</main>
        </div>
      </div>
    `;
  }

  return `
    <div class="app-shell">
      <header class="topbar">
        <button class="brand brand-button" data-page="brand" type="button" aria-label="查看品牌介绍"><span class="brand-mark">咖</span><span><strong>咖啡书屋</strong><small>点击查看品牌介绍</small></span></button>
        <nav class="nav">
          ${frontNav.map(([page, label]) => `
            <button data-page="${page}" class="${isFrontActive(state.page, page) ? "active" : ""}">${label}</button>
          `).join("")}
        </nav>
        <div class="account">${accountArea(ctx)}</div>
      </header>
      <div class="${state.page.startsWith("admin") && state.page !== "adminLogin" ? "admin-layout" : ""}">
        ${adminSidebar(ctx)}
        <main class="main page-transition">${content}</main>
      </div>
    </div>
  `;
}
import { escapeHtml } from "./escape.js";
