import { avatarMarkup, escapeHtml } from "../../shared/escape.js";
import { openUserHome, requireCommunityLogin } from "./shared.js";

export function renderPostDetail(ctx) {
  const post = ctx.state.data.posts.find((item) => item.id === ctx.state.selectedPostId) || ctx.state.data.posts[0];
  ctx.state.selectedPostId = post.id;
  return `
    <section class="section">
      <div class="section-head"><div><h2>帖子详情</h2><p class="lead">查看动态正文、评论和互动。</p></div></div>
      <article class="card community-post">
        ${post.userId
          ? `<button class="community-user" data-user-home="${post.userId}">${avatarMarkup(post)}<strong>${escapeHtml(post.author)}</strong></button>`
          : `<div class="community-user">${avatarMarkup(post)}<strong>${escapeHtml(post.author)}</strong></div>`}
        <h3>${escapeHtml(post.title)}</h3>
        <p>${escapeHtml(post.content)}</p>
        ${post.image ? `<img class="post-image" src="${post.image}" alt="${escapeHtml(post.title)}" />` : ""}
        <button class="btn ghost" data-like-post="${post.id}" ${post.liked ? "disabled" : ""}>${post.liked ? "已点赞" : "点赞"} ${post.likes}</button>
      </article>
      <section class="section">
        <h2>评论</h2>
        <div class="feed">${post.comments.map((comment) => `
          <div class="card comment-card">
            ${comment.userId
              ? `<button class="community-user" data-user-home="${comment.userId}">${avatarMarkup(comment)}<strong>${escapeHtml(comment.user)}</strong></button>`
              : `<div class="community-user">${avatarMarkup(comment)}<strong>${escapeHtml(comment.user)}</strong></div>`}
            <p>${escapeHtml(comment.content)}</p>
            <button class="btn ghost" data-like-comment="${comment.id}" ${comment.liked ? "disabled" : ""}>${comment.liked ? "已点赞" : "点赞"} ${comment.likes || 0}</button>
          </div>
        `).join("") || "<p class='muted'>暂无评论</p>"}</div>
        ${ctx.state.user ? `
          <form class="card" id="comment-form">
            <label class="field"><span>发表评论</span><textarea name="content" maxlength="500" rows="3" required></textarea></label>
            <button class="btn" type="submit">提交评论</button>
          </form>
        ` : `<div class="card empty"><p class="muted">登录后可以发表评论和点赞。</p><button class="btn" data-page="userLogin">去登录</button></div>`}
      </section>
    </section>
  `;
}

export function bindPostDetail(ctx) {
  document.querySelector("#comment-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await ctx.request(`/api/posts/${ctx.state.selectedPostId}/comments`, { method: "POST", body: JSON.stringify(ctx.formData(event.currentTarget)) });
      ctx.toast("评论已提交，审核通过后展示");
      ctx.render();
    } catch (error) {
      ctx.toast(error.message);
    }
  });
  document.querySelector("[data-like-post]")?.addEventListener("click", async (event) => {
    if (!requireCommunityLogin(ctx, "请先登录后再点赞")) return;
    try {
      await ctx.request(`/api/posts/${event.currentTarget.dataset.likePost}/like`, { method: "POST" });
      ctx.render();
    } catch (error) {
      ctx.toast(error.message);
    }
  });
  document.querySelectorAll("[data-like-comment]").forEach((button) => button.addEventListener("click", async () => {
    if (!requireCommunityLogin(ctx, "请先登录后再点赞")) return;
    try {
      await ctx.request(`/api/posts/${ctx.state.selectedPostId}/comments/${button.dataset.likeComment}/like`, { method: "POST" });
      ctx.render();
    } catch (error) {
      ctx.toast(error.message);
    }
  }));
  document.querySelectorAll("[data-user-home]").forEach((button) => button.addEventListener("click", () => openUserHome(ctx, button.dataset.userHome)));
}
