import { pageTabs } from "../../shared/ui.js";

const reservationTabs = [
  ["reservation", "座位选择"],
  ["reservationConfirm", "预约确认"],
  ["myReservations", "我的预约"]
];

export function renderSeatSelect(ctx) {
  return `
    <section class="section panel">
      <div>
        <div class="section-head"><div><h2>座位选择</h2><p class="lead">选择日期、时间、人数和座位，系统会阻止冲突预约。</p></div></div>
        ${pageTabs(reservationTabs, "reservation")}
        <div class="seat-legend"><span><i class="free"></i>空闲</span><span><i class="occupied"></i>使用中</span><span><i class="reserved"></i>已预约</span><span><i class="selected"></i>已选择</span></div>
        <div class="seat-map">
          ${ctx.state.data.seats.map((seat) => `<button class="seat ${seat.status} ${ctx.state.selectedSeats.includes(seat.id) ? "selected" : ""}" data-seat="${seat.id}" ${seat.status !== "free" ? "disabled" : ""}>${seat.id}</button>`).join("")}
        </div>
      </div>
      <form class="card" id="reserve-draft-form">
        <h3>预约信息</h3>
        <label class="field"><span>日期</span><input type="date" name="date" value="${ctx.state.reservationDate}" required /></label>
        <label class="field"><span>时间</span><select name="time"><option ${ctx.state.reservationTime === "10:00" ? "selected" : ""}>10:00</option><option ${ctx.state.reservationTime === "14:00" ? "selected" : ""}>14:00</option><option ${ctx.state.reservationTime === "19:00" ? "selected" : ""}>19:00</option></select></label>
        <label class="field"><span>人数</span><input type="number" name="people" min="1" max="12" value="${ctx.state.reservationPeople}" required /></label>
        <label class="field"><span>预留手机号</span><input type="tel" name="phone" value="${ctx.state.user?.phone || ctx.state.reservationPhone}" placeholder="用于接收预约确认信息" required /></label>
        <label class="field"><span>用途</span><select name="purpose"><option>阅读自习</option><option>朋友聚会</option><option>活动沙龙</option></select></label>
        <label class="field"><span>特殊需求</span><textarea name="note" rows="3" placeholder="靠窗、插座、安静区等"></textarea></label>
        <button class="btn" type="submit">下一步确认</button>
      </form>
    </section>
  `;
}

export function bindSeatSelect(ctx) {
  document.querySelectorAll("#reserve-draft-form [name='date'], #reserve-draft-form [name='time']").forEach((field) => {
    field.addEventListener("change", () => {
      ctx.state.reservationDate = document.querySelector("#reserve-draft-form [name='date']").value;
      ctx.state.reservationTime = document.querySelector("#reserve-draft-form [name='time']").value;
      ctx.state.selectedSeats = [];
      ctx.render();
    });
  });

  document.querySelector("#reserve-draft-form [name='people']")?.addEventListener("change", (event) => {
    ctx.state.reservationPeople = Math.max(1, Number(event.target.value || 1));
    ctx.state.selectedSeats = ctx.state.selectedSeats.slice(0, ctx.state.reservationPeople);
    document.querySelectorAll("[data-seat]").forEach((seat) => seat.classList.toggle("selected", ctx.state.selectedSeats.includes(seat.dataset.seat)));
  });

  document.querySelectorAll("[data-seat]").forEach((button) => {
    button.addEventListener("click", () => {
      const seatId = button.dataset.seat;
      const people = ctx.state.reservationPeople;
      if (ctx.state.selectedSeats.includes(seatId)) ctx.state.selectedSeats = ctx.state.selectedSeats.filter((id) => id !== seatId);
      else if (ctx.state.selectedSeats.length >= people) return ctx.toast(`当前预约 ${people} 人，最多选择 ${people} 个座位`);
      else ctx.state.selectedSeats.push(seatId);
      button.classList.toggle("selected", ctx.state.selectedSeats.includes(seatId));
    });
  });

  document.querySelector("#reserve-draft-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = ctx.formData(event.currentTarget);
    const people = Number(data.people || 1);
    if (ctx.state.selectedSeats.length < people) return ctx.toast(`还需要选择 ${people - ctx.state.selectedSeats.length} 个座位`);
    ctx.state.reservationPhone = data.phone;
    ctx.state.pendingReservation = { seatIds: [...ctx.state.selectedSeats], ...data };
    ctx.setPage("reservationConfirm");
  });
}
