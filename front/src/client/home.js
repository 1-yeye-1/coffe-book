export function renderHome(ctx) {
  const home = ctx.state.data.home;
  return `
    <section class="hero">
      <div class="hero-content">
        <span class="hero-eyebrow">Coffee · Books · Community</span>
        <h1>咖啡书屋</h1>
        <p>把精品咖啡、城市阅读、文创零售和社群活动放进一个高交互空间，让每一次到店都有新内容可探索。</p>
        <div class="actions">
          <button class="btn" data-scroll-target="home-reservation">立即预约</button>
          <button class="btn secondary" data-page="shop">逛文创商城</button>
        </div>
        <div class="hero-kpis">
          ${home.stats.slice(0, 3).map((item) => `
            <div>
              <strong>${item.value}</strong>
              <span>${item.label}</span>
            </div>
          `).join("")}
        </div>
      </div>
    </section>
    <section class="section service-strip">
      ${[
        ["精品咖啡", "产区风味、手冲课程、招牌饮品"],
        ["城市阅读", "书库榜单、读书笔记、盲盒推荐"],
        ["在线预约", "座位状态、时间人数、特殊需求"],
        ["复合体验", "活动赛事、文创商城、会员积分"]
      ].map(([title, desc]) => `<article><strong>${title}</strong><span>${desc}</span></article>`).join("")}
    </section>
    <section class="section panel" id="home-reservation">
      <div>
        <div class="section-head"><div><h2>在线预约</h2><p class="lead">直接在首页选择座位和时间，提交后进入我的预约记录。</p></div></div>
        <div class="seat-legend"><span><i class="free"></i>空闲</span><span><i class="occupied"></i>使用中</span><span><i class="reserved"></i>已预约</span><span><i class="selected"></i>已选择</span></div>
        <div class="seat-map compact-seat-map">
          ${ctx.state.data.seats.map((seat) => `<button class="seat ${seat.status} ${ctx.state.selectedSeats.includes(seat.id) ? "selected" : ""}" data-home-seat="${seat.id}" ${seat.status !== "free" ? "disabled" : ""}>${seat.id}</button>`).join("")}
        </div>
      </div>
      <form class="card" id="home-reserve-form">
        <h3>预约信息</h3>
        <label class="field"><span>日期</span><input type="date" name="date" value="${ctx.state.reservationDate}" required /></label>
        <label class="field"><span>时间</span><select name="time"><option ${ctx.state.reservationTime === "10:00" ? "selected" : ""}>10:00</option><option ${ctx.state.reservationTime === "14:00" ? "selected" : ""}>14:00</option><option ${ctx.state.reservationTime === "19:00" ? "selected" : ""}>19:00</option></select></label>
        <label class="field"><span>人数</span><input type="number" name="people" min="1" max="12" value="${ctx.state.reservationPeople}" required /></label>
        <label class="field"><span>预留手机号</span><input type="tel" name="phone" value="${ctx.state.user?.phone || ctx.state.reservationPhone}" placeholder="用于接收预约确认信息" required /></label>
        <label class="field"><span>用途</span><select name="purpose"><option>阅读自习</option><option>朋友聚会</option><option>活动沙龙</option></select></label>
        <label class="field"><span>备注</span><textarea name="note" rows="3" placeholder="靠窗、插座、安静区等"></textarea></label>
        <button class="btn" type="submit">提交预约</button>
      </form>
    </section>
    <section class="section">
      <div class="section-head">
        <div><h2>今日推荐</h2><p class="lead">咖啡、书籍和活动的运营位已接入接口。</p></div>
      </div>
      <div class="grid">${home.recommendations.map(ctx.card).join("")}</div>
    </section>
    <section class="section">
      <div class="grid">
        ${home.stats.map((m) => `<div class="card metric"><span class="muted">${m.label}</span><strong>${m.value}</strong><span>${m.note}</span></div>`).join("")}
      </div>
    </section>
    <section class="section">
      <div class="section-head"><div><h2>最新动态</h2><p class="lead">公告、活动和社区内容统一进入信息流。</p></div></div>
      <div class="feed">${home.news.map((n) => `<article class="card"><div class="post-meta"><strong>${n.title}</strong><span>${n.date}</span></div><p>${n.summary}</p></article>`).join("")}</div>
    </section>
  `;
}

export function bindHome(ctx) {
  document.querySelectorAll("#home-reserve-form [name='date'], #home-reserve-form [name='time']").forEach((field) => {
    field.addEventListener("change", () => {
      ctx.state.reservationDate = document.querySelector("#home-reserve-form [name='date']").value;
      ctx.state.reservationTime = document.querySelector("#home-reserve-form [name='time']").value;
      ctx.state.selectedSeats = [];
      ctx.render();
    });
  });

  document.querySelector("#home-reserve-form [name='people']")?.addEventListener("change", (event) => {
    ctx.state.reservationPeople = Math.max(1, Number(event.target.value || 1));
    ctx.state.selectedSeats = ctx.state.selectedSeats.slice(0, ctx.state.reservationPeople);
    document.querySelectorAll("[data-home-seat]").forEach((seat) => seat.classList.toggle("selected", ctx.state.selectedSeats.includes(seat.dataset.homeSeat)));
  });

  document.querySelector("[data-scroll-target='home-reservation']")?.addEventListener("click", () => {
    document.querySelector("#home-reservation")?.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  document.querySelectorAll("[data-home-seat]").forEach((button) => {
    button.addEventListener("click", () => {
      const seatId = button.dataset.homeSeat;
      const people = ctx.state.reservationPeople;
      if (ctx.state.selectedSeats.includes(seatId)) ctx.state.selectedSeats = ctx.state.selectedSeats.filter((id) => id !== seatId);
      else if (ctx.state.selectedSeats.length >= people) return ctx.toast(`当前预约 ${people} 人，最多选择 ${people} 个座位`);
      else ctx.state.selectedSeats.push(seatId);
      button.classList.toggle("selected", ctx.state.selectedSeats.includes(seatId));
    });
  });

  document.querySelector("#home-reserve-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = ctx.formData(event.currentTarget);
    const people = Number(data.people || 1);
    if (ctx.state.selectedSeats.length < people) return ctx.toast(`还需要选择 ${people - ctx.state.selectedSeats.length} 个座位`);
    ctx.state.reservationPhone = data.phone;
    await ctx.request("/api/reservations", {
      method: "POST",
      body: JSON.stringify({ seatIds: ctx.state.selectedSeats, ...data })
    });
    ctx.state.selectedSeats = [];
    ctx.state.reservationPeople = 1;
    ctx.toast("预约成功");
    ctx.render();
  });
}
