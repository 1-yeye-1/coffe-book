import { updateUser } from "../../shared/state.js";
import { emptyState } from "../../shared/ui.js";
import { escapeHtml } from "../../shared/escape.js";

const listLabels = {
  favorites: ["我的收藏", "收藏书籍、饮品、活动或文创商品，一行一条。"],
  notes: ["我的笔记", "记录阅读摘抄、咖啡课要点或到店灵感，一行一条。"],
  notifications: ["消息通知", "管理个人消息列表，一行一条。"]
};

function listPage(ctx, type) {
  const member = ctx.state.data.member;
  const [title, desc] = listLabels[type];
  const value = (member[type] || []).join("\n");
  return `
    <section class="section">
      <div class="section-head"><div><h2>${title}</h2><p class="lead">${desc}</p></div></div>
      <form class="card list-editor" id="list-form" data-list-type="${type}">
        <label class="field"><span>${title}</span><textarea name="items" rows="10" placeholder="请输入内容，一行一条">${value}</textarea></label>
        <button class="btn" type="submit">保存${title}</button>
      </form>
    </section>
  `;
}

function bindList(ctx, type) {
  document.querySelector("#list-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const items = ctx.formData(event.currentTarget).items.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
    try {
      const member = await ctx.request("/api/member/list", {
        method: "PATCH",
        body: JSON.stringify({ type, items })
      });
      ctx.state.data.member = member;
      updateUser(member);
      ctx.toast("保存成功");
      ctx.render();
    } catch (error) {
      ctx.toast(error.message);
    }
  });
}

export function renderFavorites(ctx) {
  return listPage(ctx, "favorites");
}

export function bindFavorites(ctx) {
  bindList(ctx, "favorites");
}

export function renderNotes(ctx) {
  return listPage(ctx, "notes");
}

export function bindNotes(ctx) {
  bindList(ctx, "notes");
}

export function renderNotifications(ctx) {
  return listPage(ctx, "notifications");
}

export function bindNotifications(ctx) {
  bindList(ctx, "notifications");
}

export function renderMyOrders(ctx) {
  const orders = ctx.state.data.member.orders || [];
  return `
    <section class="section">
      <div class="section-head"><div><h2>我的订单</h2><p class="lead">查看文创商城订单、支付状态和积分等级度收益。</p></div></div>
      ${orders.length ? `
        <div class="feed">
          ${orders.map((order) => `
            <article class="card order-card">
              <div class="post-meta"><strong>订单 #${order.id}</strong><span>${order.status}</span></div>
              <p>${order.items.map((item) => `${item.name} × ${item.quantity}`).join("，")}</p>
              <p class="price">${ctx.money(order.total)}</p>
              <p class="muted">下单时间：${String(order.createdAt).slice(0, 19).replace("T", " ")}</p>
              ${order.status === "待支付" ? `<button class="btn" data-pay-order="${order.id}">继续支付</button>` : ""}
            </article>
          `).join("")}
        </div>
      ` : emptyState("暂无订单，去文创商城挑选喜欢的商品吧。")}
    </section>
  `;
}

export function renderPointsCenter(ctx) {
  const member = ctx.state.data.member;
  const rewards = member.membership.rewards || [];
  return `
    <section class="section">
      <div class="section-head"><div><h2>积分中心</h2><p class="lead">积分可兑换特定商品、优惠券和活动权益。</p></div></div>
      <div class="card points-hero">
        <div><span class="muted">当前积分</span><strong>${member.points}</strong><p>购物、签到都会增加积分和等级度。</p></div>
        <button class="btn ghost" data-page="member">查看会员等级</button>
      </div>
      <div class="grid reward-grid">
        ${rewards.map((reward) => `
          <article class="card reward-card">
            <h3>${reward.title}</h3>
            <p class="muted">${reward.desc}</p>
            <div class="cart-total"><strong>${reward.cost} 积分</strong><button class="btn" data-reward="${reward.id}" ${member.points < reward.cost ? "disabled" : ""}>兑换</button></div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

export function renderMyGifts(ctx) {
  const gifts = ctx.state.data.member.gifts || [];
  return `
    <section class="section">
      <div class="section-head"><div><h2>我的礼品</h2><p class="lead">积分兑换的礼券和权益会保存在这里，使用后仍保留核销记录。</p></div></div>
      ${gifts.length ? `
        <div class="grid reward-grid">
          ${gifts.map((gift) => `
            <article class="card reward-card">
              <div class="post-meta"><strong>${escapeHtml(gift.type)}</strong><span class="status">${escapeHtml(gift.status)}</span></div>
              <h3>${escapeHtml(gift.title)}</h3>
              <p class="muted">${escapeHtml(gift.desc)}</p>
              <p class="muted">兑换时间：${String(gift.redeemedAt).slice(0, 19).replace("T", " ")}</p>
              ${gift.usedAt ? `<p class="muted">使用时间：${String(gift.usedAt).slice(0, 19).replace("T", " ")}</p>` : ""}
              <div class="actions">
                <button class="btn ghost" data-show-gift-qr="${encodeURIComponent(gift.id)}">显示核销二维码</button>
                <button class="btn" data-use-gift="${encodeURIComponent(gift.id)}" ${gift.status === "已使用" ? "disabled" : ""}>${gift.status === "已使用" ? "已使用" : "确认核销"}</button>
              </div>
            </article>
          `).join("")}
        </div>
      ` : emptyState("暂无礼品，可前往积分中心兑换优惠券或会员权益。")}
    </section>
  `;
}

export function bindMyOrders(ctx) {
  document.querySelectorAll("[data-pay-order]").forEach((button) => button.addEventListener("click", () => {
    ctx.state.pendingCheckout = ctx.state.data.member.orders.find((order) => order.id === Number(button.dataset.payOrder));
    ctx.setPage("payment");
  }));
}

export function bindPointsCenter(ctx) {
  document.querySelectorAll("[data-reward]").forEach((button) => {
    button.addEventListener("click", async () => {
      try {
        const member = await ctx.request("/api/member/redeem", {
          method: "POST",
          body: JSON.stringify({ rewardId: button.dataset.reward })
        });
        ctx.state.data.member = member;
        updateUser(member);
        ctx.toast("兑换成功，已加入消息通知");
        ctx.render();
      } catch (error) {
        ctx.toast(error.message);
      }
    });
  });
}

export function bindMyGifts(ctx) {
  document.querySelectorAll("[data-show-gift-qr]").forEach((button) => button.addEventListener("click", () => {
    const gift = ctx.state.data.member.gifts.find((item) => item.id === decodeURIComponent(button.dataset.showGiftQr));
    const code = gift.verifyCode || `COFFEE-BOOK-GIFT-${gift.id}`;
    const overlay = document.createElement("div");
    overlay.className = "gift-qr-overlay";
    overlay.innerHTML = `
      <div class="card gift-qr-dialog" role="dialog" aria-modal="true">
        <button class="icon-button gift-qr-close" type="button" aria-label="关闭">×</button>
        <p class="eyebrow">线下核销二维码</p>
        <h3>${escapeHtml(gift.title)}</h3>
        <img src="http://localhost:4173/api/qr?data=${encodeURIComponent(code)}" alt="${escapeHtml(gift.title)}核销二维码" />
        <p class="muted">请向店员出示二维码，核验后再点击“确认核销”。</p>
      </div>
    `;
    document.body.append(overlay);
    const close = () => overlay.remove();
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay || event.target.closest(".gift-qr-close")) close();
    });
  }));

  document.querySelectorAll("[data-use-gift]").forEach((button) => button.addEventListener("click", async () => {
    if (!confirm("请确认店员已完成线下核验，是否核销该礼券？")) return;
    try {
      const member = await ctx.request(`/api/member/gifts/${button.dataset.useGift}/use`, { method: "POST", body: "{}" });
      ctx.state.data.member = member;
      updateUser(member);
      ctx.toast("礼券使用成功");
      ctx.render();
    } catch (error) {
      ctx.toast(error.message);
    }
  }));
}
