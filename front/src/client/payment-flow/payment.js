import { emptyState } from "../../shared/ui.js";
import { updateUser } from "../../shared/state.js";

const paymentMethods = [
  ["微信支付", "微信支付", "打开微信扫码完成付款", "/assets/wechat-pay-qr.jpg"],
  ["支付宝", "支付宝", "打开支付宝扫码完成付款", "/assets/alipay-qr.jpg"]
];

function selectedMethod(value) {
  return paymentMethods.find(([method]) => method === value) || paymentMethods[0];
}

export function renderPayment(ctx) {
  const order = ctx.state.pendingCheckout;
  const total = order?.total || 0;
  const [, title, desc, image] = paymentMethods[0];

  return `
    <section class="section payment-section">
      <div class="section-head">
        <div><h2>扫码支付</h2><p class="lead">选择微信或支付宝，扫码付款后点击确认完成订单。</p></div>
      </div>
      ${order ? `
        <div class="payment-layout">
          <form class="card payment-card" id="payment-form">
            <div class="flow-steps"><span class="active">购物车</span><span class="active">确认订单</span><span class="active">扫码支付</span><span>支付结果</span></div>
            <h3>选择支付方式</h3>
            <div class="payment-methods">
              ${paymentMethods.map(([value, methodTitle, methodDesc], index) => `
                <label class="payment-method">
                  <input type="radio" name="method" value="${value}" ${index === 0 ? "checked" : ""} />
                  <span><strong>${methodTitle}</strong><em>${methodDesc}</em></span>
                </label>
              `).join("")}
            </div>
            <div class="payment-qr">
              <h3 id="payment-qr-title">${title}</h3>
              <p class="muted" id="payment-qr-desc">${desc}</p>
              <img id="payment-qr-image" src="${image}" alt="${title}二维码" />
            </div>
            <button class="btn" type="submit">我已完成支付 ${ctx.money(total)}</button>
          </form>
          <aside class="card payment-summary">
            <h3>订单摘要</h3>
            ${order.items.map((item) => `<div class="cart-row"><strong>${item.name}</strong><span>${ctx.money(item.price)} × ${item.quantity}</span></div>`).join("")}
            <div class="cart-total"><strong>合计</strong><strong>${ctx.money(total)}</strong></div>
          </aside>
        </div>
      ` : emptyState("暂无待支付订单，请先从购物车确认订单。")}
    </section>
  `;
}

export function bindPayment(ctx) {
  document.querySelectorAll('input[name="method"]').forEach((radio) => radio.addEventListener("change", () => {
    const [, title, desc, image] = selectedMethod(radio.value);
    document.querySelector("#payment-qr-title").textContent = title;
    document.querySelector("#payment-qr-desc").textContent = desc;
    document.querySelector("#payment-qr-image").src = image;
    document.querySelector("#payment-qr-image").alt = `${title}二维码`;
  }));

  document.querySelector("#payment-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const payment = ctx.formData(event.currentTarget);
      const order = await ctx.request(`/api/orders/${ctx.state.pendingCheckout.id}/pay`, {
        method: "POST",
        body: JSON.stringify({ paymentMethod: payment.method })
      });
      ctx.state.lastOrder = { ...order, paymentMethod: payment.method };
      if (order.user) updateUser(order.user);
      ctx.state.pendingCheckout = null;
      ctx.toast("订单支付成功");
      ctx.setPage("paymentResult");
    } catch (error) {
      ctx.toast(error.message);
    }
  });
}
