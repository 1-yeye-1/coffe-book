import { displayOrderNo, orderStore, paymentLabel } from "../../stores/order.js";

export function renderPaymentResult(ctx) {
  const order = ctx.state.lastOrder || orderStore.getOrderById(ctx.state.selectedOrderId);
  return `
    <section class="section success-section">
      <div class="card result-card success-card">
        <div class="success-orb"><span></span></div>
        <div class="success-check" aria-hidden="true"></div>
        <p class="eyebrow">Payment Success</p>
        <h2>支付成功</h2>
        ${order ? `
          <div class="success-facts">
            <div><span>订单号</span><strong>${displayOrderNo(order.id)}</strong></div>
            <div><span>支付金额</span><strong>${ctx.money(order.payAmount ?? order.total)}</strong></div>
            <div><span>支付方式</span><strong>${paymentLabel(order.paymentMethod)}</strong></div>
          </div>
        ` : `<p class="muted">暂无最新订单。</p>`}
        <div class="actions success-actions">
          ${order ? `<button class="btn" data-order-detail="${order.id}">查看订单</button>` : ""}
          <button class="btn ghost" data-page="home">返回首页</button>
          <button class="btn ghost" data-page="shop">继续逛商城</button>
        </div>
      </div>
    </section>
  `;
}

export function bindPaymentResult(ctx) {
  document.querySelector("[data-order-detail]")?.addEventListener("click", (event) => {
    ctx.state.selectedOrderId = event.currentTarget.dataset.orderDetail;
    ctx.setPage("orderDetail");
  });
}
