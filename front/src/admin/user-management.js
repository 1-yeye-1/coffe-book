import { openAdminModal } from "./modal.js";

export function renderUserManage(ctx) {
  return `
    <section class="section">
      <div class="section-head"><div><h2>用户管理</h2><p class="lead">会员资料、等级和积分管理。</p></div><button class="btn" id="add-user">新增用户</button></div>
      <div class="card table-card">
        <table>
          <thead><tr><th>用户</th><th>手机号</th><th>等级</th><th>积分</th><th>操作</th></tr></thead>
          <tbody>${ctx.state.data.admin.users.map((user) => `<tr><td>${user.name}</td><td>${user.phone}</td><td>${user.level}</td><td>${user.points}</td><td><button class="btn ghost" data-edit-user="${user.id}">编辑</button> <button class="btn danger" data-delete-user="${user.id}">删除</button></td></tr>`).join("")}</tbody>
        </table>
      </div>
    </section>
  `;
}

const userFields = (user = {}) => [
  { name: "name", label: "昵称", value: user.name },
  { name: "phone", label: "手机号", value: user.phone, type: "tel" },
  { name: "level", label: "会员等级", value: user.level || "普通会员", type: "select", options: [["普通会员", "普通会员"], ["黄金会员", "黄金会员"], ["钻石会员", "钻石会员"]] },
  { name: "points", label: "积分", value: user.points || 0, type: "number" }
];

export function bindUserManage(ctx) {
  document.querySelector("#add-user")?.addEventListener("click", () => openAdminModal({
    title: "新增用户",
    fields: userFields(),
    submitText: "新增",
    onSubmit: async (data) => {
      await ctx.request("/api/admin/users", { method: "POST", body: JSON.stringify(data) });
      ctx.toast("用户已新增");
      await ctx.render();
    }
  }));

  document.querySelectorAll("[data-edit-user]").forEach((button) => button.addEventListener("click", () => {
    const user = ctx.state.data.admin.users.find((item) => item.id === Number(button.dataset.editUser));
    openAdminModal({
      title: "快捷编辑用户",
      fields: userFields(user),
      onSubmit: async (data) => {
        await ctx.request(`/api/admin/users/${user.id}`, { method: "PATCH", body: JSON.stringify(data) });
        ctx.toast("用户已更新");
        await ctx.render();
      }
    });
  }));

  document.querySelectorAll("[data-delete-user]").forEach((button) => button.addEventListener("click", async () => {
    if (!confirm("确定删除该用户吗？")) return;
    await ctx.request(`/api/admin/users/${button.dataset.deleteUser}`, { method: "DELETE" });
    ctx.toast("用户已删除");
    ctx.render();
  }));
}
