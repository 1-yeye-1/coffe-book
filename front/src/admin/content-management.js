import { openAdminModal } from "./modal.js";

export function renderContentManage(ctx) {
  const notices = ctx.state.data.admin.notices || [];
  return `
    <section class="section">
      <div class="section-head"><div><h2>内容管理</h2><p class="lead">维护首页公告和运营通知，与社区动态审核分开管理。</p></div><button class="btn" id="add-notice">新增公告</button></div>
      <div class="feed">
        ${notices.map((notice) => `<article class="card"><div class="post-meta"><strong>${notice.title}</strong><span>${notice.date}</span></div><p>${notice.summary}</p><div class="actions"><button class="btn ghost" data-edit-notice="${notice.id}">编辑</button><button class="btn danger" data-delete-notice="${notice.id}">删除</button></div></article>`).join("")}
      </div>
    </section>
  `;
}

const noticeFields = (notice = {}) => [
  { name: "title", label: "公告标题", value: notice.title },
  { name: "summary", label: "公告摘要", value: notice.summary, type: "textarea" },
  { name: "date", label: "发布时间", value: String(notice.date || new Date().toISOString()).replace(" ", "T").slice(0, 16), type: "datetime-local" }
];

export function bindContentManage(ctx) {
  document.querySelector("#add-notice")?.addEventListener("click", () => openAdminModal({
    title: "新增公告",
    fields: noticeFields(),
    submitText: "新增",
    onSubmit: async (data) => {
      await ctx.request("/api/admin/notices", { method: "POST", body: JSON.stringify(data) });
      ctx.toast("公告已新增");
      await ctx.render();
    }
  }));

  document.querySelectorAll("[data-edit-notice]").forEach((button) => button.addEventListener("click", () => {
    const notice = ctx.state.data.admin.notices.find((item) => item.id === Number(button.dataset.editNotice));
    openAdminModal({
      title: "快捷编辑公告",
      fields: noticeFields(notice),
      onSubmit: async (data) => {
        await ctx.request(`/api/admin/notices/${notice.id}`, { method: "PATCH", body: JSON.stringify(data) });
        ctx.toast("公告已更新");
        await ctx.render();
      }
    });
  }));

  document.querySelectorAll("[data-delete-notice]").forEach((button) => button.addEventListener("click", async () => {
    if (!confirm("确定删除该公告吗？")) return;
    await ctx.request(`/api/admin/notices/${button.dataset.deleteNotice}`, { method: "DELETE" });
    ctx.toast("公告已删除");
    ctx.render();
  }));
}
