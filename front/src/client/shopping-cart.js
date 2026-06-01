import { emptyState } from "../shared/ui.js";
import { saveCart } from "../shared/state.js";
import { escapeHtml } from "../shared/escape.js";

function ensureSelection(ctx) {
  const ids = new Set((ctx.state.selectedCartIds || []).map(String));
  if (!ids.size) ctx.state.selectedCartIds = ctx.state.cart.map((_, index) => String(index));
  return new Set((ctx.state.selectedCartIds || []).map(String));
}

function selectedItems(ctx) {
  const selected = ensureSelection(ctx);
  return ctx.state.cart.filter((_, index) => selected.has(String(index)));
}

function totals(ctx) {
  const items = selectedItems(ctx);
  const total = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity || 1), 0);
  const discount = total >= 168 ? 20 : total >= 99 ? 10 : 0;
  return { total, discount, payable: Math.max(0, total - discount), count: items.length };
}

export function renderCart(ctx) {
  const selected = ensureSelection(ctx);
  const allSelected = ctx.state.cart.length > 0 && ctx.state.cart.every((_, index) => selected.has(String(index)));
  const summary = totals(ctx);

  return `
    <section class="section checkout-page">
      <div class="section-head">
        <div><h2>购物车</h2><p class="lead">集中管理准备购买的文创商品，数量、优惠和应付金额会实时更新。</p></div>
        <button class="btn ghost" data-page="shop">继续选购</button>
      </div>
      ${ctx.state.cart.length ? `
        <div class="cart-workbench">
          <div class="card cart-panel premium-cart">
            <label class="cart-select-all">
              <input type="checkbox" data-cart-select-all ${allSelected ? "checked" : ""} />
              <span>全选本次结算商品</span>
            </label>
            ${ctx.state.cart.map((item, index) => {
              const checked = selected.has(String(index));
              return `
                <div class="cart-row cart-item-row">
                  <label class="cart-check"><input type="checkbox" data-cart-select="${index}" ${checked ? "checked" : ""} /></label>
                  <div class="cart-thumb">${item.image ? `<img src="${item.image}" alt="${escapeHtml(item.name)}" />` : `<span>${escapeHtml(item.name || "咖").slice(0, 1)}</span>`}</div>
                  <div class="cart-info">
                    <strong>${escapeHtml(item.name)}</strong>
                    <span class="muted">单价 ${ctx.money(item.price)}</span>
                  </div>
                  <div class="cart-quantity">
                    <button class="icon-button" type="button" data-cart-minus="${index}">-</button>
                    <input type="number" min="1" max="99" value="${item.quantity}" data-cart-quantity="${index}" />
                    <button class="icon-button" type="button" data-cart-plus="${index}">+</button>
                  </div>
                  <strong>${ctx.money(item.price * item.quantity)}</strong>
                  <button class="btn ghost" data-remove-cart="${index}">删除</button>
                </div>
              `;
            }).join("")}
          </div>
          <aside class="card checkout-summary-card">
            <p class="eyebrow">Cart Summary</p>
            <h3>结算明细</h3>
            <div class="price-line"><span>已选商品</span><strong>${summary.count} 件</strong></div>
            <div class="price-line"><span>商品总价</span><strong>${ctx.money(summary.total)}</strong></div>
            <div class="price-line"><span>优惠金额</span><strong class="discount">-${ctx.money(summary.discount)}</strong></div>
            <div class="price-line total"><span>应付金额</span><strong>${ctx.money(summary.payable)}</strong></div>
            <button class="btn checkout-main-btn" data-cart-checkout ${summary.count ? "" : "disabled"}>去结算</button>
            <p class="muted">满 99 减 10，满 168 减 20。未选商品会保留在购物车。</p>
          </aside>
        </div>
      ` : emptyState("购物车还是空的，先去文创商城挑选商品吧。")}
    </section>
  `;
}

export function bindCart(ctx) {
  const refresh = () => {
    saveCart();
    ctx.render();
  };

  document.querySelector("[data-cart-select-all]")?.addEventListener("change", (event) => {
    ctx.state.selectedCartIds = event.target.checked ? ctx.state.cart.map((_, index) => String(index)) : [];
    refresh();
  });

  document.querySelectorAll("[data-cart-select]").forEach((input) => {
    input.addEventListener("change", () => {
      const selected = new Set((ctx.state.selectedCartIds || []).map(String));
      if (input.checked) selected.add(input.dataset.cartSelect);
      else selected.delete(input.dataset.cartSelect);
      ctx.state.selectedCartIds = [...selected];
      refresh();
    });
  });

  document.querySelectorAll("[data-cart-quantity]").forEach((input) => {
    input.addEventListener("change", () => {
      const index = Number(input.dataset.cartQuantity);
      ctx.state.cart[index].quantity = Math.min(99, Math.max(1, Number(input.value || 1)));
      refresh();
    });
  });

  document.querySelectorAll("[data-cart-minus], [data-cart-plus]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.cartMinus ?? button.dataset.cartPlus);
      const delta = button.dataset.cartPlus !== undefined ? 1 : -1;
      ctx.state.cart[index].quantity = Math.min(99, Math.max(1, Number(ctx.state.cart[index].quantity || 1) + delta));
      refresh();
    });
  });

  document.querySelectorAll("[data-remove-cart]").forEach((button) => {
    button.addEventListener("click", () => {
      ctx.state.cart.splice(Number(button.dataset.removeCart), 1);
      ctx.state.selectedCartIds = ctx.state.cart.map((_, index) => String(index));
      refresh();
    });
  });

  document.querySelector("[data-cart-checkout]")?.addEventListener("click", () => {
    const items = selectedItems(ctx);
    if (!items.length) return ctx.toast("请先选择要结算的商品");
    ctx.state.checkoutItems = items.map((item) => ({ ...item }));
    ctx.state.checkoutCartIds = [...ensureSelection(ctx)];
    ctx.setPage("orderConfirm");
  });
}
