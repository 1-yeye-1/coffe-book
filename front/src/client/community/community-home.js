import { avatarMarkup, escapeHtml } from "../../shared/escape.js";
import { openUserHome, requireCommunityLogin } from "./shared.js";

export function renderCommunityHome(ctx) {
  return `
    <section class="section community-section">
      <div class="section-head"><div><h2>社区首页</h2><p class="lead">阅读、咖啡和城市生活的书友动态。</p></div></div>
      <aside class="card community-tip">
        <strong>社区提示</strong>
        <span class="muted">${ctx.state.user ? "已登录，可以发布动态、点赞和评论。评论提交后由后台审核展示。" : "浏览无需登录，互动操作需要先登录。"}</span>
      </aside>
      <div>
        <div class="tabs">
          <button class="active">推荐流</button>
          <button>最新流</button>
          <button data-page="publishPost">发布动态</button>
        </div>
        <div class="feed">${ctx.state.data.posts.map((post) => `
          <article class="card community-post">
            ${post.userId ? `
              <button class="community-user" data-user-home="${post.userId}">
                ${avatarMarkup(post)}
                <span><strong>${escapeHtml(post.author)}</strong><small>查看个人主页</small></span>
              </button>
            ` : `
              <div class="community-user">
                ${avatarMarkup(post)}
                <span><strong>${escapeHtml(post.author)}</strong><small>匿名动态</small></span>
              </div>
            `}
            <h3>${escapeHtml(post.title)}</h3>
            <p>${escapeHtml(post.content)}</p>
            ${post.image ? `<img class="post-image" src="${post.image}" alt="${escapeHtml(post.title)}" />` : ""}
            <div class="actions">
              <button class="btn ghost" data-like="${post.id}" ${post.liked ? "disabled" : ""}>${post.liked ? "已点赞" : "点赞"} ${post.likes}</button>
              <button class="btn" data-post-detail="${post.id}">查看详情 · ${post.comments.length} 评论</button>
            </div>
          </article>
        `).join("")}</div>
      </div>
    </section>
  `;
}

export function bindCommunityHome(ctx) {
  document.querySelectorAll("[data-like]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!requireCommunityLogin(ctx, "请先登录后再点赞")) return;
      try {
        await ctx.request(`/api/posts/${button.dataset.like}/like`, { method: "POST" });
        ctx.toast("点赞成功");
        ctx.render();
      } catch (error) {
        ctx.toast(error.message);
      }
    });
  });
  document.querySelectorAll("[data-post-detail]").forEach((button) => {
    button.addEventListener("click", () => {
      ctx.state.selectedPostId = Number(button.dataset.postDetail);
      ctx.setPage("postDetail");
    });
  });
  document.querySelectorAll("[data-user-home]").forEach((button) => button.addEventListener("click", () => openUserHome(ctx, button.dataset.userHome)));
}
