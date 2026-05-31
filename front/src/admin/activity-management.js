import { openAdminModal } from "./modal.js";

const dateTimeInputValue = (value = "") => String(value).replace(" ", "T").slice(0, 16);

export function renderActivityManage(ctx) {
  return `
    <section class="section">
      <div class="section-head"><div><h2>活动赛事管理</h2><p class="lead">维护活动安排、报名开放时间和名额。</p></div><button class="btn" id="add-activity">新增活动</button></div>
      <div class="card table-card">
        <table>
          <thead><tr><th>活动</th><th>日期</th><th>时间</th><th>地点</th><th>报名人数</th><th>操作</th></tr></thead>
          <tbody>${ctx.state.data.admin.activities.map((item) => `<tr><td>${item.title}</td><td>${item.date}</td><td>${item.time || "-"}</td><td>${item.location || "-"}</td><td>${item.applied}/${item.capacity}</td><td><button class="btn ghost" data-edit-activity="${item.id}">编辑</button> <button class="btn danger" data-delete-activity="${item.id}">删除</button></td></tr>`).join("")}</tbody>
        </table>
      </div>
    </section>
  `;
}

const activityFields = (item = {}) => [
  { name: "title", label: "活动名称", value: item.title || "" },
  { name: "date", label: "活动日期", value: item.date || new Date().toISOString().slice(0, 10), type: "date" },
  { name: "time", label: "活动时间", value: item.time || "", placeholder: "例如：19:30-21:00" },
  { name: "location", label: "活动地点", value: item.location || "" },
  { name: "capacity", label: "活动名额", value: item.capacity || 1, type: "number" },
  { name: "registrationStart", label: "直接报名开放时间", value: dateTimeInputValue(item.registrationStart), type: "datetime-local", required: false },
  { name: "earlyStart", label: "提前报名开放时间", value: dateTimeInputValue(item.earlyStart), type: "datetime-local", required: false },
  { name: "description", label: "活动介绍", value: item.description || "", type: "textarea" }
];

export function bindActivityManage(ctx) {
  document.querySelector("#add-activity")?.addEventListener("click", () => openAdminModal({
    title: "新增活动赛事",
    fields: activityFields(),
    submitText: "新增",
    onSubmit: async (data) => {
      await ctx.request("/api/admin/activities", { method: "POST", body: JSON.stringify(data) });
      ctx.toast("活动已新增");
      await ctx.render();
    }
  }));

  document.querySelectorAll("[data-edit-activity]").forEach((button) => button.addEventListener("click", () => {
    const item = ctx.state.data.admin.activities.find((activity) => activity.id === Number(button.dataset.editActivity));
    openAdminModal({
      title: "快捷编辑活动",
      fields: activityFields(item),
      onSubmit: async (data) => {
        await ctx.request(`/api/admin/activities/${item.id}`, { method: "PATCH", body: JSON.stringify(data) });
        ctx.toast("活动已更新");
        await ctx.render();
      }
    });
  }));

  document.querySelectorAll("[data-delete-activity]").forEach((button) => button.addEventListener("click", async () => {
    if (!confirm("确定删除该活动及其报名记录吗？")) return;
    await ctx.request(`/api/admin/activities/${button.dataset.deleteActivity}`, { method: "DELETE" });
    ctx.toast("活动已删除");
    ctx.render();
  }));
}
