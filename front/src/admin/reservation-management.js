import { openAdminModal } from "./modal.js";

export function renderReservationManage(ctx) {
  return `
    <section class="section">
      <div class="section-head"><div><h2>预约管理</h2><p class="lead">新增、修改和删除座位预约。</p></div><button class="btn" id="add-reservation">新增预约</button></div>
      <div class="card table-card">
        <table>
          <thead><tr><th>座位</th><th>手机号</th><th>日期</th><th>时间</th><th>人数</th><th>状态</th><th>操作</th></tr></thead>
          <tbody>${ctx.state.data.admin.reservations.map((item) => `<tr><td>${item.seatId}</td><td>${item.phone || "-"}</td><td>${item.date}</td><td>${item.time}</td><td>${item.people}</td><td>${item.status}</td><td><button class="btn ghost" data-edit-reservation="${item.id}">编辑</button> <button class="btn danger" data-delete-reservation="${item.id}">删除</button></td></tr>`).join("")}</tbody>
        </table>
      </div>
    </section>
  `;
}

const reservationFields = (item = {}) => [
  { name: "seatId", label: "座位编号", value: item.seatId || "A1", placeholder: "多座位使用英文逗号分隔" },
  { name: "phone", label: "预留手机号", value: item.phone || "", type: "tel", required: false },
  { name: "date", label: "预约日期", value: item.date || new Date().toISOString().slice(0, 10), type: "date" },
  { name: "time", label: "预约时间", value: item.time || "14:00", type: "select", options: [["10:00", "10:00"], ["14:00", "14:00"], ["19:00", "19:00"]] },
  { name: "people", label: "人数", value: item.people || 1, type: "number" },
  { name: "purpose", label: "用途", value: item.purpose || "后台预约" },
  { name: "note", label: "备注", value: item.note || "", type: "textarea", required: false },
  { name: "status", label: "状态", value: item.status || "已预约", type: "select", options: [["已预约", "已预约"], ["使用中", "使用中"], ["已取消", "已取消"]] }
];

export function bindReservationManage(ctx) {
  document.querySelector("#add-reservation")?.addEventListener("click", () => openAdminModal({
    title: "新增预约",
    fields: reservationFields(),
    submitText: "新增",
    onSubmit: async (data) => {
      await ctx.request("/api/admin/reservations", { method: "POST", body: JSON.stringify(data) });
      ctx.toast("预约已新增");
      await ctx.render();
    }
  }));

  document.querySelectorAll("[data-edit-reservation]").forEach((button) => button.addEventListener("click", () => {
    const item = ctx.state.data.admin.reservations.find((reservation) => reservation.id === Number(button.dataset.editReservation));
    openAdminModal({
      title: "快捷编辑预约",
      fields: reservationFields(item),
      onSubmit: async (data) => {
        await ctx.request(`/api/admin/reservations/${item.id}`, { method: "PATCH", body: JSON.stringify(data) });
        ctx.toast("预约已更新");
        await ctx.render();
      }
    });
  }));

  document.querySelectorAll("[data-delete-reservation]").forEach((button) => button.addEventListener("click", async () => {
    if (!confirm("确定删除该预约吗？")) return;
    await ctx.request(`/api/admin/reservations/${button.dataset.deleteReservation}`, { method: "DELETE" });
    ctx.toast("预约已删除");
    ctx.render();
  }));
}
