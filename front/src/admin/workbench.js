export function renderWorkbench(ctx) {
  const summary = ctx.state.data.admin;
  return `
    <section class="section">
      <div class="section-head"><div><h2>工作台</h2><p class="lead">门店运营、交易、预约和内容审核的统一入口。</p></div></div>
      <div class="grid">
        ${summary.metrics.map((metric) => `<div class="card metric"><span class="muted">${metric.label}</span><strong>${metric.value}</strong><span>${metric.note}</span></div>`).join("")}
      </div>
    </section>
    <section class="section">
      <div class="grid">
        ${summary.tasks.map((task) => `<article class="card"><h3>${task.title}</h3><p class="muted">${task.desc}</p><button class="btn ghost" data-page="${task.page}">处理</button></article>`).join("")}
      </div>
    </section>
  `;
}
