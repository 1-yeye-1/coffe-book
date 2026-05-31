import { escapeHtml } from "../shared/escape.js";

export function renderAdminDashboard(ctx) {
  const stats = ctx.state.data.dashboard;
  return `
    <section class="section">
      <div class="section-head"><div><h2>数据大屏</h2><p class="lead">访客、预约、销量、活动和用户增长实时聚合。</p></div></div>
      <div class="grid">${stats.metrics.map((metric) => `<div class="card metric"><span class="muted">${escapeHtml(metric.label)}</span><strong>${escapeHtml(metric.value)}</strong><span>${escapeHtml(metric.change)}</span></div>`).join("")}</div>
    </section>
    <section class="section panel">
      <div class="card">
        <h3>用户增长趋势</h3>
        <div class="chart">${stats.growth.map((value) => `<div class="bar" style="height:${value}%"></div>`).join("")}</div>
      </div>
      <div class="card">
        <div class="post-meta"><h3>实时动态</h3><button class="btn ghost" data-page="adminRealtime">查看全部 ${stats.realtimeCount || stats.realtime.length} 条</button></div>
        ${stats.realtime.map((item) => `<p>${escapeHtml(item)}</p>`).join("")}
      </div>
    </section>
  `;
}

let refreshTimer = null;

export function stopAdminDashboardRefresh() {
  clearInterval(refreshTimer);
  refreshTimer = null;
}

export function bindAdminDashboard(ctx) {
  stopAdminDashboardRefresh();
  refreshTimer = setInterval(async () => {
    if (ctx.state.page !== "adminDashboard") return stopAdminDashboardRefresh();
    try {
      ctx.state.data.dashboard = await ctx.request("/api/dashboard");
      ctx.render();
    } catch (error) {
      ctx.toast(error.message);
    }
  }, 5000);
}
