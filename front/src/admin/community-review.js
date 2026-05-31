import { openAdminModal } from "./modal.js";
import { escapeHtml } from "../shared/escape.js";

const statusLabel = (status) => status === "approved" ? "已通过" : status === "rejected" ? "已驳回" : "待审核";

export function renderCommunityAudit(ctx) {
  const posts = ctx.state.data.admin.posts || [];
  return `
    <section class="section">
      <div class="section-head"><div><h2>社区审核</h2><p class="lead">快捷编辑动态，并审核用户新提交的评论。</p></div></div>
      <div class="feed">
        ${posts.map((post) => `
          <article class="card">
            <div class="post-meta"><strong>${escapeHtml(post.author)}</strong><span>${post.likes} 赞</span></div>
            <h3>${escapeHtml(post.title)}</h3>
            <p>${escapeHtml(post.content)}</p>
            <div class="actions"><button class="btn ghost" data-edit-post="${post.id}">编辑</button><button class="btn danger" data-delete-post="${post.id}">删除</button></div>
            <div class="audit-comments">
              <h4>评论审核</h4>
              ${(post.comments || []).map((comment) => `
                <div class="audit-comment">
                  <div><strong>${escapeHtml(comment.user)}</strong><span class="status">${statusLabel(comment.status)}</span><p>${escapeHtml(comment.content)}</p></div>
                  <div class="actions">
                    <button class="btn ghost" data-review-comment="${comment.id}" data-post="${post.id}" data-status="approved">通过</button>
                    <button class="btn secondary" data-review-comment="${comment.id}" data-post="${post.id}" data-status="rejected">驳回</button>
                    <button class="btn danger" data-delete-comment="${comment.id}" data-post="${post.id}">删除</button>
                  </div>
                </div>
              `).join("") || "<p class='muted'>暂无评论</p>"}
            </div>
          </article>
        `).join("")}
      </div>
    </section>
  `;
}

export function bindCommunityAudit(ctx) {
  document.querySelectorAll("[data-edit-post]").forEach((button) => button.addEventListener("click", () => {
    const post = ctx.state.data.admin.posts.find((item) => item.id === Number(button.dataset.editPost));
    openAdminModal({
      title: "快捷审核动态",
      fields: [{ name: "title", label: "动态标题", value: post.title }, { name: "content", label: "动态内容", value: post.content, type: "textarea" }],
      onSubmit: async (data) => {
        await ctx.request(`/api/admin/posts/${post.id}`, { method: "PATCH", body: JSON.stringify(data) });
        ctx.toast("动态已更新");
        await ctx.render();
      }
    });
  }));

  document.querySelectorAll("[data-delete-post]").forEach((button) => button.addEventListener("click", async () => {
    if (!confirm("确定删除该动态吗？")) return;
    await ctx.request(`/api/admin/posts/${button.dataset.deletePost}`, { method: "DELETE" });
    ctx.toast("动态已删除");
    ctx.render();
  }));

  document.querySelectorAll("[data-review-comment]").forEach((button) => button.addEventListener("click", async () => {
    await ctx.request(`/api/admin/posts/${button.dataset.post}/comments/${button.dataset.reviewComment}`, {
      method: "PATCH",
      body: JSON.stringify({ status: button.dataset.status })
    });
    ctx.toast(button.dataset.status === "approved" ? "评论已通过审核" : "评论已驳回");
    ctx.render();
  }));

  document.querySelectorAll("[data-delete-comment]").forEach((button) => button.addEventListener("click", async () => {
    if (!confirm("确定删除该评论吗？")) return;
    await ctx.request(`/api/admin/posts/${button.dataset.post}/comments/${button.dataset.deleteComment}`, { method: "DELETE" });
    ctx.toast("评论已删除");
    ctx.render();
  }));
}
