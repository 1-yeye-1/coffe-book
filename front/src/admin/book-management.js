import { openAdminModal } from "./modal.js";
import { escapeHtml } from "../shared/escape.js";

const bookFields = (book = {}) => [
  { name: "title", label: "书名", value: book.title },
  { name: "author", label: "作者", value: book.author },
  { name: "category", label: "分类", value: book.category || "文学", type: "select", options: [["文学", "文学"], ["商业", "商业"], ["生活", "生活"], ["艺术", "艺术"]] },
  { name: "ranking", label: "榜单信息", value: book.ranking || "" },
  { name: "publisher", label: "出版社", value: book.publisher || "" },
  { name: "publishedAt", label: "收录时间", value: String(book.publishedAt || new Date().toISOString()).replace(" ", "T").slice(0, 16), type: "datetime-local" },
  { name: "image", label: "封面图片地址", value: book.image || "", required: false },
  { name: "summary", label: "内容简介", value: book.summary || "", type: "textarea", rows: 6 }
];

export function renderBookManage(ctx) {
  const books = ctx.state.data.admin.books || [];
  return `
    <section class="section">
      <div class="section-head"><div><h2>书籍管理</h2><p class="lead">维护精品书库中的封面、分类、简介和收录时间。</p></div><button class="btn" id="add-book">新增书籍</button></div>
      <div class="card table-card">
        <table>
          <thead><tr><th>书名</th><th>作者</th><th>分类</th><th>收录时间</th><th>操作</th></tr></thead>
          <tbody>${books.map((book) => `<tr><td>${escapeHtml(book.title)}</td><td>${escapeHtml(book.author)}</td><td>${escapeHtml(book.category)}</td><td>${escapeHtml(book.publishedAt)}</td><td><button class="btn ghost" data-edit-book="${book.id}">编辑</button> <button class="btn danger" data-delete-book="${book.id}">删除</button></td></tr>`).join("") || "<tr><td colspan='5'>暂无书籍</td></tr>"}</tbody>
        </table>
      </div>
    </section>
  `;
}

export function bindBookManage(ctx) {
  document.querySelector("#add-book")?.addEventListener("click", () => openAdminModal({
    title: "新增书籍",
    fields: bookFields(),
    submitText: "新增",
    onSubmit: async (data) => {
      await ctx.request("/api/admin/books", { method: "POST", body: JSON.stringify(data) });
      ctx.toast("书籍已新增");
      await ctx.render();
    }
  }));

  document.querySelectorAll("[data-edit-book]").forEach((button) => button.addEventListener("click", () => {
    const book = ctx.state.data.admin.books.find((item) => item.id === Number(button.dataset.editBook));
    openAdminModal({
      title: "快捷编辑书籍",
      fields: bookFields(book),
      onSubmit: async (data) => {
        await ctx.request(`/api/admin/books/${book.id}`, { method: "PATCH", body: JSON.stringify(data) });
        ctx.toast("书籍已更新");
        await ctx.render();
      }
    });
  }));

  document.querySelectorAll("[data-delete-book]").forEach((button) => button.addEventListener("click", async () => {
    if (!confirm("确定删除该书籍吗？")) return;
    await ctx.request(`/api/admin/books/${button.dataset.deleteBook}`, { method: "DELETE" });
    ctx.toast("书籍已删除");
    ctx.render();
  }));
}
