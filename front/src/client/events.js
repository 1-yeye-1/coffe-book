import { escapeHtml } from "../shared/escape.js";
import { emptyState } from "../shared/ui.js";

function activityActions(activity) {
  return `
    <div class="actions event-actions">
      <button class="btn ghost" data-activity-detail="${activity.id}">查看详情</button>
      <button class="btn" data-activity-apply="${activity.id}">直接报名</button>
      <button class="btn secondary" data-activity-early="${activity.id}">提前报名</button>
    </div>
  `;
}

async function applyActivity(ctx, activityId, kind, people = 1, phone = "") {
  try {
    await ctx.request(`/api/activities/${activityId}/apply`, {
      method: "POST",
      body: JSON.stringify({ kind, people, phone })
    });
    ctx.toast(kind === "early" ? "提前报名成功" : "活动报名成功");
    ctx.setPage("activities");
  } catch (error) {
    ctx.toast(error.message);
  }
}

export function renderActivities(ctx) {
  return `
    <section class="section">
      <div class="section-head"><div><h2>活动赛事</h2><p class="lead">查看完整时间安排，也可以按会员等级使用每月提前报名次数。</p></div></div>
      <div class="grid event-grid">
        ${ctx.state.data.activities.map((activity) => `
          <article class="card event-card">
            <div class="post-meta"><strong>${escapeHtml(activity.title)}</strong><span>${escapeHtml(activity.date)}</span></div>
            <p>${escapeHtml(activity.time || "时间待定")} · ${escapeHtml(activity.location || "咖啡书屋")}</p>
            <p class="muted">${escapeHtml(activity.description || "查看详情了解活动安排。")}</p>
            <div class="event-signup-times">
              <span>提前报名：${escapeHtml(activity.earlyStart || "待公布")}</span>
              <span>直接报名：${escapeHtml(activity.registrationStart || "待公布")}</span>
            </div>
            <p class="muted">报名 ${activity.applied}/${activity.capacity}</p>
            ${activityActions(activity)}
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

function openActivity(ctx, id) {
  ctx.state.selectedActivityId = Number(id);
  ctx.setPage("activityDetail");
}

export function bindActivities(ctx) {
  document.querySelectorAll("[data-activity-detail]").forEach((button) => button.addEventListener("click", () => openActivity(ctx, button.dataset.activityDetail)));
  document.querySelectorAll("[data-activity-apply]").forEach((button) => button.addEventListener("click", () => {
    if (!ctx.state.user) return openActivity(ctx, button.dataset.activityApply);
    applyActivity(ctx, Number(button.dataset.activityApply), "regular");
  }));
  document.querySelectorAll("[data-activity-early]").forEach((button) => button.addEventListener("click", () => {
    if (!ctx.state.user) {
      ctx.toast("提前报名仅限登录会员使用");
      return ctx.setPage("userLogin");
    }
    applyActivity(ctx, Number(button.dataset.activityEarly), "early");
  }));
}

export function renderActivityDetail(ctx) {
  const activity = ctx.state.data.activities.find((item) => item.id === ctx.state.selectedActivityId) || ctx.state.data.activities[0];
  if (!activity) return `<section class="section">${emptyState("暂无活动赛事，请稍后再来查看。")}</section>`;
  ctx.state.selectedActivityId = activity.id;
  const remaining = Math.max(0, activity.capacity - activity.applied);
  return `
    <section class="section">
      <button class="link-button" data-page="activities">返回活动列表</button>
      <div class="detail-hero event-detail">
        <article class="card">
          <p class="eyebrow">活动详情</p>
          <h2>${escapeHtml(activity.title)}</h2>
          <p>${escapeHtml(activity.description)}</p>
          <div class="event-facts">
            <span><strong>活动日期</strong>${escapeHtml(activity.date)}</span>
            <span><strong>活动时间</strong>${escapeHtml(activity.time)}</span>
            <span><strong>活动地点</strong>${escapeHtml(activity.location)}</span>
            <span><strong>提前报名开放</strong>${escapeHtml(activity.earlyStart || "待公布")}</span>
            <span><strong>直接报名开放</strong>${escapeHtml(activity.registrationStart || "待公布")}</span>
            <span><strong>剩余名额</strong>${remaining} / ${activity.capacity}</span>
          </div>
        </article>
        <form class="card" id="activity-apply-form">
          <h3>${ctx.state.user ? "会员报名" : "手机号预约报名"}</h3>
          <p class="muted">${ctx.state.user ? `将使用账号手机号 ${escapeHtml(ctx.state.user.phone)}。普通、黄金、钻石会员每月分别可提前报名 1、2、3 次。` : "无需登录也可直接报名，请预留手机号。提前报名需要登录会员账号。"}</p>
          ${ctx.state.user ? "" : `<label class="field"><span>预留手机号</span><input name="phone" type="tel" placeholder="请输入手机号" required /></label>`}
          <label class="field"><span>报名人数</span><input name="people" type="number" min="1" max="${Math.max(1, remaining)}" value="1" required /></label>
          <div class="actions">
            <button class="btn" type="submit" name="kind" value="regular" ${remaining ? "" : "disabled"}>${remaining ? "直接报名" : "名额已满"}</button>
            ${ctx.state.user ? `<button class="btn secondary" type="submit" name="kind" value="early" ${remaining ? "" : "disabled"}>提前报名</button>` : ""}
          </div>
        </form>
      </div>
    </section>
  `;
}

export function bindActivityDetail(ctx) {
  document.querySelector("#activity-apply-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = ctx.formData(event.currentTarget);
    applyActivity(ctx, ctx.state.selectedActivityId, event.submitter?.value === "early" ? "early" : "regular", Number(data.people || 1), data.phone || "");
  });
}
