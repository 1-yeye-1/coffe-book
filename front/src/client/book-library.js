import { escapeHtml } from "../shared/escape.js";
import { emptyState } from "../shared/ui.js";

function bookCard(book) {
  return `
    <article class="card media-card book-card">
      <img src="${escapeHtml(book.image)}" alt="${escapeHtml(book.title)}" />
      <div class="body">
        <div class="post-meta"><h3>${escapeHtml(book.title)}</h3><span>${escapeHtml(book.ranking || "馆藏推荐")}</span></div>
        <p>${escapeHtml(book.author)}</p>
        <span class="tag">${escapeHtml(book.category)}</span>
        <button class="btn ghost" data-book-detail="${book.id}">查看简介</button>
      </div>
    </article>
  `;
}

function bindDetailButtons(ctx) {
  document.querySelectorAll("[data-book-detail]").forEach((button) => {
    button.addEventListener("click", () => {
      ctx.state.selectedBookId = Number(button.dataset.bookDetail);
      ctx.setPage("bookDetail");
    });
  });
}

export function renderBooks(ctx) {
  const books = ctx.state.data.books;
  return `
    <section class="section">
      <div class="section-head">
        <div><h2>精品书库</h2><p class="lead">按分类筛选馆藏，点击书籍可查看作者、出版社与内容简介。</p></div>
        <div class="toolbar"><input class="pill" id="book-search" placeholder="搜索书名或作者" /></div>
      </div>
      <div class="tabs">${["全部", "文学", "商业", "生活", "艺术"].map((type, index) => `<button class="${index === 0 ? "active" : ""}" data-book-type="${type}">${type}</button>`).join("")}</div>
      <div class="grid book-grid" id="book-grid">${books.map(bookCard).join("")}</div>
    </section>
  `;
}

export function bindBooks(ctx) {
  const renderGrid = (keyword = "", type = "全部") => {
    const books = ctx.state.data.books.filter((book) => {
      const matchedKeyword = `${book.title}${book.author}`.toLowerCase().includes(keyword.toLowerCase());
      return matchedKeyword && (type === "全部" || book.category === type);
    });
    document.querySelector("#book-grid").innerHTML = books.length
      ? books.map(bookCard).join("")
      : `<div class="card empty"><p class="muted">没有找到匹配的书籍。</p></div>`;
    bindDetailButtons(ctx);
  };

  let activeType = "全部";
  document.querySelector("#book-search")?.addEventListener("input", (event) => renderGrid(event.target.value.trim(), activeType));
  document.querySelectorAll("[data-book-type]").forEach((button) => {
    button.addEventListener("click", () => {
      activeType = button.dataset.bookType;
      document.querySelectorAll("[data-book-type]").forEach((item) => item.classList.toggle("active", item === button));
      renderGrid(document.querySelector("#book-search").value.trim(), activeType);
    });
  });
  bindDetailButtons(ctx);
}

export function renderBookDetail(ctx) {
  const book = ctx.state.data.books.find((item) => item.id === ctx.state.selectedBookId) || ctx.state.data.books[0];
  if (!book) return emptyState("暂无书籍资料。");
  return `
    <section class="section detail-section">
      <button class="link-button" data-page="books">返回精品书库</button>
      <div class="book-detail">
        <img src="${escapeHtml(book.image)}" alt="${escapeHtml(book.title)}" />
        <article class="card">
          <p class="eyebrow">${escapeHtml(book.category)} · ${escapeHtml(book.ranking || "馆藏推荐")}</p>
          <h2>${escapeHtml(book.title)}</h2>
          <p class="lead">${escapeHtml(book.author)}</p>
          <p>${escapeHtml(book.summary)}</p>
          <div class="event-facts">
            <span><strong>出版社</strong>${escapeHtml(book.publisher || "暂无")}</span>
            <span><strong>收录时间</strong>${escapeHtml(book.publishedAt)}</span>
          </div>
        </article>
      </div>
    </section>
  `;
}
