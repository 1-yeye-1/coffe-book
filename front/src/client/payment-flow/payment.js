import { emptyState } from "../../shared/ui.js";
import { saveCart, updateUser } from "../../shared/state.js";
import { displayOrderNo, formatDateTime, orderStore, paymentLabel } from "../../stores/order.js";

const paymentMethods = [
  ["wechat", "微信支付", "绿色扫码收银台，仅模拟微信支付体验", "WeChat"],
  ["alipay", "支付宝", "蓝色扫码收银台，仅模拟支付宝支付体验", "Alipay"],
  ["balance", "会员余额", "使用会员账户余额模拟扣款", "Balance"],
  ["store", "到店支付", "保留订单，到店后由店员确认", "Store"]
];

function currentOrder(ctx) {
  return ctx.state.pendingCheckout || orderStore.getOrderById(ctx.state.selectedOrderId);
}

function countdownText() {
  const endAt = Number(sessionStorage.getItem("coffee_payment_deadline") || 0) || Date.now() + 15 * 60 * 1000;
  sessionStorage.setItem("coffee_payment_deadline", String(endAt));
  const left = Math.max(0, endAt - Date.now());
  const minutes = Math.floor(left / 60000);
  const seconds = Math.floor((left % 60000) / 1000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function renderPayment(ctx) {
  const order = currentOrder(ctx);
  const amount = order?.payAmount ?? order?.total ?? 0;

  return `
    <section class="section payment-section premium-payment">
      <div class="section-head">
        <div><h2>模拟支付</h2><p class="lead">选择支付方式并确认付款。本页面不连接任何第三方支付，只完成毕业设计展示闭环。</p></div>
      </div>
      ${order ? `
        <div class="payment-layout">
          <form class="card payment-card glass-payment-card" id="payment-form">
            <div class="flow-steps"><span class="active">购物车</span><span class="active">确认订单</span><span class="active">模拟支付</span><span>支付成功</span></div>
            <div class="payment-headline">
              <p class="eyebrow">Order No.</p>
              <h3>${displayOrderNo(order.id)}</h3>
              <span id="payment-countdown">${countdownText()}</span>
            </div>
            <div class="payment-methods">
              ${paymentMethods.map(([value, title, desc], index) => `
                <label class="payment-method">
                  <input type="radio" name="method" value="${value}" ${index === 0 ? "checked" : ""} />
                  <span><strong>${title}</strong><em>${desc}</em></span>
                </label>
              `).join("")}
            </div>
            <div class="simulated-qr" id="simulated-qr" data-method="wechat">
              <div class="fake-qr" aria-label="模拟二维码"></div>
              <div>
                <h3 id="payment-qr-title">微信支付</h3>
                <p class="muted" id="payment-qr-desc">请使用微信扫码。二维码为 CSS 模拟，不包含真实付款信息。</p>
                <strong>${ctx.money(amount)}</strong>
              </div>
            </div>
            <p class="payment-processing" id="payment-processing" hidden>支付处理中...</p>
            <button class="btn checkout-main-btn" id="payment-submit" type="submit">我已完成支付 ${ctx.money(amount)}</button>
          </form>
          <aside class="card payment-summary checkout-summary-card">
            <p class="eyebrow">Receipt</p>
            <h3>订单摘要</h3>
            <div class="price-line"><span>订单号</span><strong>${displayOrderNo(order.id)}</strong></div>
            <div class="price-line"><span>创建时间</span><strong>${formatDateTime(order.createdAt)}</strong></div>
            ${order.items.map((item) => `<div class="cart-row"><strong>${item.name}</strong><span>${ctx.money(item.price)} × ${item.quantity}</span></div>`).join("")}
            <div class="price-line"><span>商品金额</span><strong>${ctx.money(order.totalAmount ?? order.total)}</strong></div>
            <div class="price-line"><span>优惠</span><strong class="discount">-${ctx.money(order.discountAmount || 0)}</strong></div>
            <div class="price-line total"><span>实付金额</span><strong>${ctx.money(amount)}</strong></div>
          </aside>
        </div>
      ` : emptyState("暂无待支付订单，请先从购物车确认订单。")}
    </section>
  `;
}

export function bindPayment(ctx) {
  let timer = setInterval(() => {
    const node = document.querySelector("#payment-countdown");
    if (!node) return clearInterval(timer);
    node.textContent = countdownText();
  }, 1000);

  document.querySelectorAll('input[name="method"]').forEach((radio) => radio.addEventListener("change", () => {
    const [, title, desc] = paymentMethods.find(([value]) => value === radio.value) || paymentMethods[0];
    document.querySelector("#payment-qr-title").textContent = title;
    document.querySelector("#payment-qr-desc").textContent = `${desc}。二维码为 CSS 模拟，不包含真实付款信息。`;
    document.querySelector("#simulated-qr").dataset.method = radio.value;
  }));

  document.querySelector("#payment-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const order = currentOrder(ctx);
    if (!order) return;
    const payment = ctx.formData(event.currentTarget);
    const button = document.querySelector("#payment-submit");
    const processing = document.querySelector("#payment-processing");
    button.disabled = true;
    button.textContent = "支付处理中...";
    processing.hidden = false;
    orderStore.setProcessing(order.id, payment.method);

    try {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const paidOrder = await orderStore.payOrder(ctx, order.id, payment.method);
      if (paidOrder.user) updateUser(paidOrder.user);
      const paidProductIds = new Set((paidOrder.items || []).map((item) => String(item.productId)));
      ctx.state.cart = ctx.state.cart.filter((item, index) => {
        const selected = (ctx.state.checkoutCartIds || []).includes(String(index));
        return !(selected && paidProductIds.has(String(item.productId)));
      });
      saveCart();
      ctx.state.lastOrder = paidOrder;
      ctx.state.pendingCheckout = null;
      ctx.state.selectedOrderId = paidOrder.id;
      sessionStorage.removeItem("coffee_payment_deadline");
      ctx.toast(`${paymentLabel(payment.method)}模拟支付成功`);
      ctx.setPage("paymentResult");
    } catch (error) {
      button.disabled = false;
      button.textContent = "我已完成支付";
      processing.hidden = true;
      ctx.toast(error.message);
    }
  });
}
