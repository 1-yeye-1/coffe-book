import { escapeHtml } from "../shared/escape.js";

let currentPage = 1;

function renderLogRows(data) {
  return `
    <div class="feed realtime-feed">
      ${data.items.map((item) => `<div class="card">${escapeHtml(item)}</div>`).join("") || "<div class='card empty'><p class='muted'>暂无动态</p></div>"}
    </div>
    <div class="pager">
      <button class="btn ghost" data-realtime-page="${data.page - 1}" ${data.page <= 1 ? "disabled" : ""}>上一页</button>
      <span>第 ${data.page} / ${data.pages} 页，共 ${data.total} 条</span>
      <button class="btn ghost" data-realtime-page="${data.page + 1}" ${data.page >= data.pages ? "disabled" : ""}>下一页</button>
    </div>
  `;
}

async function loadRealtime(ctx, page) {
  const data = await ctx.request(`/api/admin/realtime?page=${page}&pageSize=10`);
  currentPage = data.page;
  document.querySelector("#realtime-log").innerHTML = renderLogRows(data);
  bindPager(ctx);
}

function bindPager(ctx) {
  document.querySelectorAll("[data-realtime-page]").forEach((button) => button.addEventListener("click", () => loadRealtime(ctx, Number(button.dataset.realtimePage))));
}

export function renderRealtimeLog() {
  return `
    <section class="section">
      <div class="section-head"><div><h2>全部实时动态</h2><p class="lead">查看系统近期动态记录，每页显示 10 条。</p></div><button class="btn ghost" data-page="adminDashboard">返回数据大屏</button></div>
      <div id="realtime-log"><div class="card empty"><p class="muted">正在加载动态...</p></div></div>
    </section>
  `;
}

export function bindRealtimeLog(ctx) {
  loadRealtime(ctx, currentPage).catch((error) => ctx.toast(error.message));
}
