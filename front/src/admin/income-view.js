import { escapeHtml } from "../shared/escape.js";

export function renderIncome(ctx) {
  const income = ctx.state.data.admin.income || { total: 0, count: 0, orders: [] };
  return `
    <section class="section">
      <div class="section-head"><div><h2>收入查看</h2><p class="lead">按已支付订单统计收入，便于核对线上付款记录。</p></div></div>
      <div class="grid">
        <article class="card metric"><span class="muted">累计收入</span><strong>${ctx.money(income.total)}</strong><span>已支付订单汇总</span></article>
        <article class="card metric"><span class="muted">已支付订单</span><strong>${income.count}</strong><span>实时同步订单状态</span></article>
      </div>
      <div class="card table-card">
        <table>
          <thead><tr><th>订单号</th><th>用户</th><th>支付方式</th><th>金额</th><th>支付时间</th></tr></thead>
          <tbody>${income.orders.map((order) => `<tr><td>#${order.id}</td><td>${escapeHtml(order.userName)}</td><td>${escapeHtml(order.paymentMethod || "线上支付")}</td><td>${ctx.money(order.total)}</td><td>${escapeHtml(String(order.paidAt || order.createdAt).slice(0, 19).replace("T", " "))}</td></tr>`).join("") || "<tr><td colspan='5'>暂无已支付订单</td></tr>"}</tbody>
        </table>
      </div>
    </section>
  `;
}
