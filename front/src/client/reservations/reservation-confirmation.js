import { pageTabs } from "../../shared/ui.js";

const reservationTabs = [
  ["reservation", "座位选择"],
  ["reservationConfirm", "预约确认"],
  ["myReservations", "我的预约"]
];

export function renderReservationConfirm(ctx) {
  const draft = ctx.state.pendingReservation;
  return `
    <section class="section">
      <div class="section-head"><div><h2>预约确认</h2><p class="lead">提交前核对座位、时间和人数。</p></div></div>
      ${pageTabs(reservationTabs, "reservationConfirm")}
      <div class="card">
        ${draft ? `
          <p>座位：${draft.seatIds.join("、")}</p>
          <p>日期：${draft.date}</p>
          <p>时间：${draft.time}</p>
          <p>人数：${draft.people}</p>
          <p>预留手机号：${draft.phone}</p>
          <p>用途：${draft.purpose}</p>
          <p>备注：${draft.note || "无"}</p>
          <div class="actions"><button class="btn ghost" data-page="reservation">返回修改</button><button class="btn" id="confirm-reservation">确认预约</button></div>
        ` : `
          <p class="muted">还没有选择座位，请先完成座位选择。</p>
          <button class="btn" data-page="reservation">去选择座位</button>
        `}
      </div>
    </section>
  `;
}

export function bindReservationConfirm(ctx) {
  document.querySelector("#confirm-reservation")?.addEventListener("click", async () => {
    await ctx.request("/api/reservations", { method: "POST", body: JSON.stringify(ctx.state.pendingReservation) });
    ctx.state.pendingReservation = null;
    ctx.state.selectedSeats = [];
    ctx.state.reservationPeople = 1;
    ctx.toast("预约成功");
    ctx.setPage("reservation");
  });
}
