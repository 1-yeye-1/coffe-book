import { emptyState } from "../../shared/ui.js";
import { saveCart } from "../../shared/state.js";

export function renderOrderConfirm(ctx) {
  const total = ctx.state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  return `
    <section class="section">
      <div class="section-head">
        <div><h2>确认订单</h2><p class="lead">这是购物车后的支付流程步骤，请核对商品和联系方式。</p></div>
      </div>
      ${ctx.state.cart.length ? `
        <form class="card order-flow-card" id="order-form">
          <div class="flow-steps"><span class="active">购物车</span><span class="active">确认订单</span><span>支付</span><span>支付结果</span></div>
          ${ctx.state.cart.map((item) => `<p>${item.name} · ${ctx.money(item.price)} × ${item.quantity}</p>`).join("")}
          <label class="field"><span>收货人</span><input name="receiver" ${ctx.state.user?.name ? `value="${ctx.state.user.name}"` : `placeholder="请输入收货人"`} /></label>
          <label class="field"><span>手机号</span><input name="phone" ${ctx.state.user?.phone ? `value="${ctx.state.user.phone}"` : `placeholder="请输入手机号"`} /></label>
          <label class="field"><span>备注</span><textarea name="note" rows="3" placeholder="门店自提、礼品包装等"></textarea></label>
          <div class="cart-total"><strong>应付：${ctx.money(total)}</strong><button class="btn" type="submit">确定订单，进入支付</button></div>
        </form>
      ` : emptyState("购物车为空，无法确认订单。")}
    </section>
  `;
}

export function bindOrderConfirm(ctx) {
  document.querySelector("#order-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const order = await ctx.request("/api/orders", {
      method: "POST",
      body: JSON.stringify({
        ...ctx.formData(event.currentTarget),
        items: ctx.state.cart.map((item) => ({ productId: item.productId, quantity: item.quantity }))
      })
    });
    ctx.state.pendingCheckout = order;
    ctx.state.cart = [];
    saveCart();
    ctx.toast("订单已创建，请完成支付");
    ctx.setPage("payment");
  });
}
