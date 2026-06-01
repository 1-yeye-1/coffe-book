import { emptyState } from "../shared/ui.js";
import { deliveryText, displayOrderNo, formatDateTime, orderStore, paymentLabel, paymentStatusText, statusText } from "../stores/order.js";

export function renderOrderDetail(ctx) {
  const remoteOrders = ctx.state.data.member?.orders || [];
  orderStore.mergeOrders(remoteOrders);
  const order = orderStore.getOrderById(ctx.state.selectedOrderId);

  return `
    <section class="section checkout-page">
      <div class="section-head">
        <div><h2>订单详情</h2><p class="lead">查看商品、联系人、价格明细以及模拟支付状态。</p></div>
        <button class="btn ghost" data-page="myOrders">返回我的订单</button>
      </div>
      ${order ? `
        <div class="checkout-layout order-detail-layout">
          <div class="checkout-left">
            <div class="card order-flow-card">
              <div class="post-meta"><strong>${displayOrderNo(order.id)}</strong><span class="status">${statusText(order.orderStatus)}</span></div>
              <div class="order-status-grid">
                <div><span>订单状态</span><strong>${statusText(order.orderStatus)}</strong></div>
                <div><span>支付状态</span><strong>${paymentStatusText(order.paymentStatus)}</strong></div>
                <div><span>创建时间</span><strong>${formatDateTime(order.createdAt)}</strong></div>
                <div><span>支付时间</span><strong>${formatDateTime(order.paidAt)}</strong></div>
              </div>
            </div>
            <div class="card order-flow-card">
              <h3>商品列表</h3>
              ${(order.items || []).map((item) => `
                <div class="checkout-item">
                  <div class="cart-thumb">${item.image ? `<img src="${item.image}" alt="${item.name}" />` : `<span>${String(item.name || "咖").slice(0, 1)}</span>`}</div>
                  <div><strong>${item.name}</strong><p class="muted">${ctx.money(item.price)} × ${item.quantity}</p></div>
                  <strong>${ctx.money(item.price * item.quantity)}</strong>
                </div>
              `).join("")}
            </div>
            <div class="card order-flow-card">
              <h3>联系人信息</h3>
              <p>联系人：${order.contactName || order.userName || "-"}</p>
              <p>手机号：${order.phone || "-"}</p>
              <p>配送方式：${deliveryText(order.deliveryType)}</p>
              <p class="muted">备注：${order.remark || "无"}</p>
            </div>
          </div>
          <aside class="card checkout-summary-card">
            <p class="eyebrow">Order Detail</p>
            <h3>价格明细</h3>
            <div class="price-line"><span>商品金额</span><strong>${ctx.money(order.totalAmount ?? order.total)}</strong></div>
            <div class="price-line"><span>配送费</span><strong>${ctx.money(order.deliveryFee || 0)}</strong></div>
            <div class="price-line"><span>优惠金额</span><strong class="discount">-${ctx.money(order.discountAmount || 0)}</strong></div>
            <div class="price-line"><span>积分抵扣</span><strong class="discount">-${ctx.money(order.pointsDeduction || 0)}</strong></div>
            <div class="price-line total"><span>实付金额</span><strong>${ctx.money(order.payAmount ?? order.total)}</strong></div>
            <div class="price-line"><span>支付方式</span><strong>${paymentLabel(order.paymentMethod) || "-"}</strong></div>
            <div class="actions">
              ${order.paymentStatus !== "success" && order.orderStatus !== "cancelled" ? `<button class="btn" data-pay-order="${order.id}">去支付</button><button class="btn ghost" data-cancel-order="${order.id}">取消订单</button>` : ""}
              ${order.paymentStatus === "success" && order.orderStatus !== "finished" ? `<button class="btn" data-finish-order="${order.id}">确认完成</button>` : ""}
            </div>
          </aside>
        </div>
      ` : emptyState("没有找到该订单。")}
    </section>
  `;
}

export function bindOrderDetail(ctx) {
  document.querySelector("[data-pay-order]")?.addEventListener("click", (event) => {
    ctx.state.selectedOrderId = event.currentTarget.dataset.payOrder;
    ctx.state.pendingCheckout = orderStore.getOrderById(ctx.state.selectedOrderId);
    ctx.setPage("payment");
  });
  document.querySelector("[data-cancel-order]")?.addEventListener("click", (event) => {
    orderStore.cancelOrder(event.currentTarget.dataset.cancelOrder);
    ctx.toast("订单已取消");
    ctx.render();
  });
  document.querySelector("[data-finish-order]")?.addEventListener("click", (event) => {
    orderStore.finishOrder(event.currentTarget.dataset.finishOrder);
    ctx.toast("订单已确认完成");
    ctx.render();
  });
}
