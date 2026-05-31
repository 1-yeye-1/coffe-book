import { avatarMarkup, escapeHtml } from "../../shared/escape.js";

export function renderUserHome(ctx) {
  const profile = ctx.state.selectedCommunityProfile;
  if (!profile) return `<section class="section"><div class="card empty"><p class="muted">请从社区动态进入用户主页。</p><button class="btn" data-page="community">返回社区</button></div></section>`;
  return `
    <section class="section">
      <div class="card community-profile">
        ${avatarMarkup(profile, "community-avatar large")}
        <div><h2>${escapeHtml(profile.name)}</h2><p class="muted">${escapeHtml(profile.level)} · 公开个人主页</p></div>
      </div>
      <div class="grid">
        <div class="card metric"><span class="muted">发布动态</span><strong>${profile.postCount}</strong><span>${escapeHtml(profile.name)}</span></div>
        <div class="card metric"><span class="muted">获得点赞</span><strong>${profile.likeCount}</strong><span>社区互动</span></div>
      </div>
      <section class="section">
        <div class="feed">${profile.posts.map((post) => `<article class="card"><h3>${escapeHtml(post.title)}</h3><p>${escapeHtml(post.content)}</p>${post.image ? `<img class="post-image" src="${post.image}" alt="${escapeHtml(post.title)}" />` : ""}</article>`).join("") || "<p class='muted'>暂无公开动态</p>"}</div>
      </section>
    </section>
  `;
}
