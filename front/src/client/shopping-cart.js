import { emptyState } from "../shared/ui.js";
import { saveCart } from "../shared/state.js";

export function renderCart(ctx) {
  const total = ctx.state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return `
    <section class="section">
      <div class="section-head">
        <div><h2>购物车</h2><p class="lead">集中管理准备购买的文创商品，确认订单从这里进入。</p></div>
        <button class="btn ghost" data-page="shop">继续选购</button>
      </div>
      ${ctx.state.cart.length ? `
        <div class="card cart-panel">
          ${ctx.state.cart.map((item, index) => `
            <div class="cart-row">
              <strong>${item.name}</strong>
              <span>${ctx.money(item.price)}</span>
              <label class="quantity-field compact">
                <span>数量</span>
                <input type="number" min="1" value="${item.quantity}" data-cart-quantity="${index}" />
              </label>
              <span>小计 ${ctx.money(item.price * item.quantity)}</span>
              <button class="btn ghost" data-remove-cart="${index}">移除</button>
            </div>
          `).join("")}
          <div class="cart-total"><strong>合计：${ctx.money(total)}</strong><button class="btn" data-page="orderConfirm">去结算</button></div>
        </div>
      ` : emptyState("购物车还是空的，先去文创商城挑选商品。")}
    </section>
  `;
}

export function bindCart(ctx) {
  document.querySelectorAll("[data-cart-quantity]").forEach((input) => {
    input.addEventListener("change", () => {
      const index = Number(input.dataset.cartQuantity);
      ctx.state.cart[index].quantity = Math.max(1, Number(input.value || 1));
      saveCart();
      ctx.render();
    });
  });

  document.querySelectorAll("[data-remove-cart]").forEach((button) => {
    button.addEventListener("click", () => {
      ctx.state.cart.splice(Number(button.dataset.removeCart), 1);
      saveCart();
      ctx.render();
    });
  });
}
