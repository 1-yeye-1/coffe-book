import { updateUser } from "../../shared/state.js";

function percent(member) {
  const membership = member.membership;
  if (!membership?.target) return 100;
  return Math.min(100, Math.round((membership.current / membership.target) * 100));
}

export function renderMemberCenter(ctx) {
  const member = ctx.state.data.member;
  const membership = member.membership;
  return `
    <section class="section">
      <div class="section-head"><div><h2>会员中心</h2><p class="lead">查看当前等级、下一等级、等级度、每日签到和会员权益。</p></div></div>
      <div class="member-hero card">
        <div>
          <span class="status">${membership.level}</span>
          <h3>${member.name}</h3>
          <p class="muted">当前等级度 ${membership.levelProgress}，${membership.need ? `距离 ${membership.nextLevel} 还差 ${membership.need} 等级度` : "已经达到最高等级"}</p>
          <div class="progress-track"><span style="width: ${percent(member)}%"></span></div>
          <div class="post-meta"><span>当前：${membership.level}</span><span>下一等级：${membership.nextLevel}</span></div>
        </div>
        <div class="member-actions">
          <div class="metric"><span class="muted">可用积分</span><strong>${member.points}</strong><span>可在积分中心兑换权益</span></div>
          <button class="btn" id="check-in-btn" ${membership.checkedInToday ? "disabled" : ""}>${membership.checkedInToday ? "今日已签到" : "今日签到"}</button>
        </div>
      </div>
      <div class="grid level-grid">
        ${membership.allLevels.map((level) => `
          <article class="card level-card ${level.name === membership.level ? "active" : ""}">
            <h3>${level.name}</h3>
            <p class="muted">${level.next ? `${level.min} - ${level.next - 1} 等级度` : `${level.min}+ 等级度`}</p>
            ${level.benefits.map((item) => `<p>${item}</p>`).join("")}
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

export function bindMemberCenter(ctx) {
  document.querySelector("#check-in-btn")?.addEventListener("click", async () => {
    try {
      const member = await ctx.request("/api/member/check-in", { method: "POST", body: "{}" });
      ctx.state.data.member = member;
      updateUser(member);
      ctx.toast("签到成功，等级度和积分已增加");
      ctx.render();
    } catch (error) {
      ctx.toast(error.message);
    }
  });
}
