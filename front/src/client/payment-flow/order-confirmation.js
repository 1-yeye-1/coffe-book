import { emptyState } from "../../shared/ui.js";
import { escapeHtml } from "../../shared/escape.js";
import { orderStore } from "../../stores/order.js";

const coupons = [
  ["none", "不使用优惠券", 0],
  ["coffee10", "咖啡书屋新人券 -10", 10],
  ["premium20", "黑金满额礼券 -20", 20]
];

function checkoutItems(ctx) {
  return (ctx.state.checkoutItems?.length ? ctx.state.checkoutItems : ctx.state.cart).map((item) => ({ ...item }));
}

function calc(items, deliveryType = "pickup", coupon = "none", usePoints = false) {
  const totalAmount = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity || 1), 0);
  const deliveryFee = deliveryType === "delivery" ? 8 : 0;
  const couponDiscount = coupons.find(([id]) => id === coupon)?.[2] || 0;
  const autoDiscount = totalAmount >= 168 ? 20 : totalAmount >= 99 ? 10 : 0;
  const pointsDeduction = usePoints ? Math.min(12, Math.floor(totalAmount * 0.05)) : 0;
  const discountAmount = Math.min(totalAmount, Math.max(couponDiscount, autoDiscount));
  const payAmount = Math.max(0, totalAmount + deliveryFee - discountAmount - pointsDeduction);
  return { totalAmount, deliveryFee, discountAmount, pointsDeduction, payAmount };
}

export function renderOrderConfirm(ctx) {
  const items = checkoutItems(ctx);
  const values = ctx.state.checkoutDraft || {
    deliveryType: "pickup",
    contactName: ctx.state.user?.name || "",
    phone: ctx.state.user?.phone || "",
    remark: "",
    coupon: items.reduce((sum, item) => sum + item.price * item.quantity, 0) >= 99 ? "coffee10" : "none",
    usePoints: false
  };
  const price = calc(items, values.deliveryType, values.coupon, values.usePoints);

  return `
    <section class="section checkout-page">
      <div class="section-head">
        <div><h2>确认订单</h2><p class="lead">选择配送方式、联系人与优惠后，提交订单进入前端模拟支付流程。</p></div>
      </div>
      ${items.length ? `
        <form class="checkout-layout" id="order-form">
          <div class="checkout-left">
            <div class="card order-flow-card">
              <div class="flow-steps"><span class="active">购物车</span><span class="active">确认订单</span><span>选择支付</span><span>支付成功</span></div>
              <h3>订单商品</h3>
              ${items.map((item) => `
                <div class="checkout-item">
                  <div class="cart-thumb">${item.image ? `<img src="${item.image}" alt="${escapeHtml(item.name)}" />` : `<span>${escapeHtml(item.name || "咖").slice(0, 1)}</span>`}</div>
                  <div><strong>${escapeHtml(item.name)}</strong><p class="muted">${ctx.money(item.price)} × ${item.quantity}</p></div>
                  <strong>${ctx.money(item.price * item.quantity)}</strong>
                </div>
              `).join("")}
            </div>

            <div class="card order-flow-card">
              <h3>取货 / 配送信息</h3>
              <div class="choice-grid">
                <label class="choice-card"><input type="radio" name="deliveryType" value="pickup" ${values.deliveryType === "pickup" ? "checked" : ""} /><span><strong>到店自取</strong><em>到咖啡书屋前台凭订单号取货</em></span></label>
                <label class="choice-card"><input type="radio" name="deliveryType" value="delivery" ${values.deliveryType === "delivery" ? "checked" : ""} /><span><strong>门店配送</strong><em>周边 3km 内模拟配送，配送费 8 元</em></span></label>
              </div>
              <div class="form-grid">
                <label class="field"><span>联系人</span><input name="contactName" value="${escapeHtml(values.contactName)}" placeholder="请输入联系人" required /></label>
                <label class="field"><span>手机号</span><input name="phone" value="${escapeHtml(values.phone)}" placeholder="13800000000" required /></label>
              </div>
              <label class="field"><span>备注</span><textarea name="remark" rows="3" placeholder="例如：少糖、礼品包装、到店时间">${escapeHtml(values.remark)}</textarea></label>
            </div>
          </div>

          <aside class="card checkout-summary-card">
            <p class="eyebrow">Checkout</p>
            <h3>价格结算</h3>
            <label class="field"><span>优惠券</span><select name="coupon">
              ${coupons.map(([id, label]) => `<option value="${id}" ${values.coupon === id ? "selected" : ""}>${label}</option>`).join("")}
            </select></label>
            <label class="toggle-field"><input type="checkbox" name="usePoints" value="1" ${values.usePoints ? "checked" : ""} /> 使用积分抵扣</label>
            <div class="price-line"><span>商品金额</span><strong>${ctx.money(price.totalAmount)}</strong></div>
            <div class="price-line"><span>配送费</span><strong>${ctx.money(price.deliveryFee)}</strong></div>
            <div class="price-line"><span>优惠金额</span><strong class="discount">-${ctx.money(price.discountAmount)}</strong></div>
            <div class="price-line"><span>积分抵扣</span><strong class="discount">-${ctx.money(price.pointsDeduction)}</strong></div>
            <div class="price-line total"><span>实付金额</span><strong>${ctx.money(price.payAmount)}</strong></div>
            <button class="btn checkout-main-btn" type="submit">提交订单并支付</button>
            <p class="muted">不会连接微信或支付宝，下一步只展示模拟收银台。</p>
          </aside>
        </form>
      ` : emptyState("购物车为空，无法确认订单。")}
    </section>
  `;
}

export function bindOrderConfirm(ctx) {
  const form = document.querySelector("#order-form");
  if (!form) return;

  const rememberDraft = () => {
    const data = ctx.formData(form);
    ctx.state.checkoutDraft = { ...data, usePoints: Boolean(data.usePoints) };
    ctx.render();
  };

  form.querySelectorAll("input[name='deliveryType'], select[name='coupon'], input[name='usePoints']").forEach((el) => {
    el.addEventListener("change", rememberDraft);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const items = checkoutItems(ctx);
    const data = ctx.formData(event.currentTarget);
    const price = calc(items, data.deliveryType, data.coupon, Boolean(data.usePoints));
    const button = event.currentTarget.querySelector("button[type='submit']");
    button.disabled = true;
    button.textContent = "正在创建订单...";

    try {
      const order = await orderStore.createOrder(ctx, {
        items,
        contactName: data.contactName,
        phone: data.phone,
        deliveryType: data.deliveryType,
        remark: data.remark,
        coupon: data.coupon,
        ...price
      });
      ctx.state.pendingCheckout = order;
      ctx.state.selectedOrderId = order.id;
      ctx.toast("订单已创建，请完成模拟支付");
      ctx.setPage("payment");
    } catch (error) {
      button.disabled = false;
      button.textContent = "提交订单并支付";
      ctx.toast(error.message);
    }
  });
}
