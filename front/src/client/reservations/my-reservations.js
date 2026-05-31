import { emptyState, pageTabs } from "../../shared/ui.js";

const reservationTabs = [
  ["reservation", "座位选择"],
  ["reservationConfirm", "预约确认"],
  ["myReservations", "我的预约"]
];

export function renderMyReservations(ctx) {
  const reservations = ctx.state.data.member?.reservations || [];
  return `
    <section class="section">
      <div class="section-head"><div><h2>我的预约</h2><p class="lead">查看当前账号下的预约记录。</p></div></div>
      ${pageTabs(reservationTabs, "myReservations")}
      ${reservations.length ? `
        <div class="grid">
          ${reservations.map((item) => `
            <article class="card">
              <span class="status">${item.status}</span>
              <h3>${item.seatId}</h3>
              <p>${item.date} ${item.time} · ${item.people} 人 · ${item.purpose}</p>
              <p class="muted">预留手机号：${item.phone || "-"}</p>
              <p class="muted">${item.note || "无特殊需求"}</p>
            </article>
          `).join("")}
        </div>
      ` : emptyState("暂无预约记录。")}
    </section>
  `;
}
