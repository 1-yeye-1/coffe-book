export function renderPaymentResult(ctx) {
  const order = ctx.state.lastOrder;
  return `
    <section class="section">
      <div class="section-head">
        <div><h2>支付结果</h2><p class="lead">这是订单支付流程的结果页，不作为商城独立栏目展示。</p></div>
      </div>
      <div class="card result-card">
        <div class="flow-steps"><span class="active">购物车</span><span class="active">确认订单</span><span class="active">支付</span><span class="active">支付结果</span></div>
        <span class="status">支付成功</span>
        <h3>${order ? `订单 #${order.id}` : "暂无最新订单"}</h3>
        <p>${order ? `订单金额 ${ctx.money(order.total)}，支付方式：${order.paymentMethod || "线上支付"}，当前状态：${order.status}` : "请先在购物车中提交订单。"}</p>
        ${order?.earnedPoints ? `<p class="muted">本次获得 ${order.earnedPoints} 积分和 ${order.earnedProgress} 等级度。</p>` : ""}
        <button class="btn" data-page="shop">继续购物</button>
      </div>
    </section>
  `;
}
