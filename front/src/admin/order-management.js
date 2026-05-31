import { openAdminModal } from "./modal.js";

export function renderOrderManage(ctx) {
  const orders = ctx.state.data.admin.orders;
  return `
    <section class="section">
      <div class="section-head"><div><h2>订单管理</h2><p class="lead">查看、新增、修改和删除订单。</p></div><button class="btn" id="add-order">新增订单</button></div>
      <div class="card table-card">
        <table>
          <thead><tr><th>订单号</th><th>用户</th><th>金额</th><th>状态</th><th>时间</th><th>操作</th></tr></thead>
          <tbody>${orders.map((order) => `<tr><td>#${order.id}</td><td>${order.userName}</td><td>${ctx.money(order.total)}</td><td>${order.status}</td><td>${String(order.createdAt).slice(0, 19).replace("T", " ")}</td><td><button class="btn ghost" data-edit-order="${order.id}">编辑</button> <button class="btn danger" data-delete-order="${order.id}">删除</button></td></tr>`).join("") || "<tr><td colspan='6'>暂无订单</td></tr>"}</tbody>
        </table>
      </div>
    </section>
  `;
}

const orderFields = (order = {}) => [
  { name: "userName", label: "客户名称", value: order.userName || "线下用户" },
  { name: "total", label: "订单金额", value: order.total || 0, type: "number" },
  { name: "status", label: "订单状态", value: order.status || "待支付", type: "select", options: [["待支付", "待支付"], ["已支付", "已支付"], ["已完成", "已完成"], ["已取消", "已取消"]] }
];

export function bindOrderManage(ctx) {
  document.querySelector("#add-order")?.addEventListener("click", () => openAdminModal({
    title: "新增订单",
    fields: orderFields(),
    submitText: "新增",
    onSubmit: async (data) => {
      await ctx.request("/api/admin/orders", { method: "POST", body: JSON.stringify(data) });
      ctx.toast("订单已新增");
      await ctx.render();
    }
  }));

  document.querySelectorAll("[data-edit-order]").forEach((button) => button.addEventListener("click", () => {
    const order = ctx.state.data.admin.orders.find((item) => item.id === Number(button.dataset.editOrder));
    openAdminModal({
      title: "快捷编辑订单",
      fields: orderFields(order),
      onSubmit: async (data) => {
        await ctx.request(`/api/admin/orders/${order.id}`, { method: "PATCH", body: JSON.stringify(data) });
        ctx.toast("订单已更新");
        await ctx.render();
      }
    });
  }));

  document.querySelectorAll("[data-delete-order]").forEach((button) => button.addEventListener("click", async () => {
    if (!confirm("确定删除该订单吗？")) return;
    await ctx.request(`/api/admin/orders/${button.dataset.deleteOrder}`, { method: "DELETE" });
    ctx.toast("订单已删除");
    ctx.render();
  }));
}
