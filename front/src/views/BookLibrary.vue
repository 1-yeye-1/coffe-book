<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import EmptyState from "@/components/front/EmptyState.vue";
import StatusBadge from "@/components/front/StatusBadge.vue";
import { useSiteStore } from "@/stores/site";

const siteStore = useSiteStore();
const keyword = ref("");
const activeType = ref("全部");
const activeTag = ref("全部");
const sortKey = ref("recommend");
const page = ref(1);
const pageSize = 12;
const favoriteIds = ref(new Set());

const tagFilters = ["全部", "馆藏推荐", "高分书单", "本周热借", "适合咖啡阅读"];

const types = computed(() => {
  const categories = new Set(siteStore.books.map((book) => book.category).filter(Boolean));
  return ["全部", ...categories];
});

const filteredBooks = computed(() => {
  const text = keyword.value.trim().toLowerCase();
  return siteStore.books.filter((book, index) => {
    const matchedText = !text || [book.title, book.author, book.publisher, book.category, book.summary]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(text);
    const matchedType = activeType.value === "全部" || book.category === activeType.value;
    const matchedTag = activeTag.value === "全部" || bookTag(book, index) === activeTag.value;
    return matchedText && matchedType && matchedTag;
  });
});

const sortedBooks = computed(() => {
  const items = [...filteredBooks.value];
  if (sortKey.value === "rating") {
    return items.sort((a, b) => Number(bookRating(b)) - Number(bookRating(a)));
  }
  if (sortKey.value === "new") {
    return items.sort((a, b) => String(b.publishedAt || "").localeCompare(String(a.publishedAt || "")));
  }
  return items;
});

const totalPages = computed(() => Math.max(1, Math.ceil(sortedBooks.value.length / pageSize)));
const pagedBooks = computed(() => sortedBooks.value.slice((page.value - 1) * pageSize, page.value * pageSize));
const gridDensity = computed(() => {
  const count = sortedBooks.value.length;
  if (count <= 4) return "few";
  if (count <= 8) return "mid";
  return "many";
});

const categoryStats = computed(() => types.value.slice(1).map((type) => ({
  label: type,
  value: siteStore.books.filter((book) => book.category === type).length
})));

const hotTags = computed(() => tagFilters.slice(1).map((label, index) => ({
  label,
  value: Math.max(1, siteStore.books.filter((book, bookIndex) => bookTag(book, bookIndex) === label).length || index + 2)
})));

const visibleTagTotal = computed(() => Math.max(1, filteredBooks.value.length));

watch([keyword, activeType, activeTag, sortKey], () => {
  page.value = 1;
});

onMounted(() => {
  if (!siteStore.books.length) siteStore.fetchBooks();
});

function bookRating(book) {
  return (4.6 + (Number(book.id || 0) % 4) * 0.1).toFixed(1);
}

function bookStatus(book) {
  const status = ["在馆可读", "可预约", "借出中"];
  return status[Number(book.id || 0) % status.length];
}

function bookStatusTone(book) {
  const status = bookStatus(book);
  if (status.includes("借出")) return "warning";
  if (status.includes("预约")) return "accent";
  return "success";
}

function bookTag(book, index = 0) {
  if (book.ranking) return "本周热借";
  return tagFilters[(Number(book.id || index) % (tagFilters.length - 1)) + 1];
}

function bookRankLabel(book, index) {
  if (index < 3) return `TOP ${index + 1}`;
  if (book.ranking) return "新书";
  return "馆藏";
}

function bookSummary(book) {
  return book.summary || book.description || "精选馆藏内容，适合安静阅读和咖啡搭配。";
}

function bookLink(book) {
  return `/books/${book.id}`;
}

function isFavorite(bookId) {
  return favoriteIds.value.has(Number(bookId));
}

function toggleFavorite(bookId) {
  const next = new Set(favoriteIds.value);
  const id = Number(bookId);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  favoriteIds.value = next;
}

function resetFilters() {
  keyword.value = "";
  activeType.value = "全部";
  activeTag.value = "全部";
  sortKey.value = "recommend";
  page.value = 1;
}
</script>

<template>
  <section class="section book-library-page">
    <div class="business-hero business-hero--books">
      <div>
        <p class="eyebrow">Coffee Book Library</p>
        <h1>精品书库</h1>
        <p>把适合咖啡香气里的小说、商业读物、生活方式和艺术书单整理成可搜索、可筛选、可收藏的阅读空间。</p>
        <div class="hero-chip-row">
          <span>馆藏 {{ siteStore.books.length }}</span>
          <span>分类 {{ Math.max(1, types.length - 1) }}</span>
          <span>筛选 {{ visibleTagTotal }}</span>
        </div>
      </div>
      <div class="hero-glass-card hero-glass-card--library">
        <strong>{{ filteredBooks.length }}</strong>
        <span>本次筛选结果</span>
        <small>搜索、分类、标签与排序均保持前端展示态</small>
      </div>
    </div>

    <div class="catalog-toolbar book-toolbar">
      <label class="book-toolbar__search">
        <span class="sr-only">搜索书名 / 作者</span>
        <input v-model.trim="keyword" type="search" placeholder="搜索书名、作者或 ISBN" />
      </label>

      <div class="book-toolbar__chips" aria-label="书籍分类筛选">
        <button
          v-for="type in types"
          :key="type"
          class="book-toolbar-pill"
          :class="{ active: activeType === type }"
          type="button"
          @click="activeType = type"
        >
          <span>{{ type }}</span>
          <b>{{ type === "全部" ? siteStore.books.length : siteStore.books.filter((book) => book.category === type).length }}</b>
        </button>
      </div>

      <div class="book-toolbar__actions">
        <label class="book-toolbar__select">
          <span class="sr-only">排序方式</span>
          <select v-model="sortKey">
            <option value="recommend">综合排序</option>
            <option value="rating">评分优先</option>
            <option value="new">最新收录</option>
          </select>
        </label>
        <StatusBadge :label="`${filteredBooks.length} 本书`" type="accent" />
      </div>
    </div>

    <div class="book-library-layout">
      <div class="book-library-main">
        <div class="section-head compact-head">
          <div>
            <h2>全部书籍 · 共 {{ siteStore.books.length }} 本</h2>
            <p class="lead">支持搜索、分类、标签与评分排序；收藏仅在前端展示，不写入后端。</p>
          </div>
        </div>

        <div v-if="pagedBooks.length" :class="['book-card-grid', 'book-card-grid--library', `book-card-grid--library-${gridDensity}`]">
          <article v-for="(book, index) in pagedBooks" :key="book.id" class="library-book-card">
            <div class="library-book-card__top">
              <span class="library-book-card__rank">{{ bookRankLabel(book, index) }}</span>
              <StatusBadge :label="bookStatus(book)" :type="bookStatusTone(book)" />
              <button
                class="library-book-card__favorite"
                :class="{ active: isFavorite(book.id) }"
                type="button"
                :aria-pressed="isFavorite(book.id)"
                aria-label="收藏"
                @click="toggleFavorite(book.id)"
              >
                {{ isFavorite(book.id) ? "♥" : "♡" }}
              </button>
            </div>

            <RouterLink class="library-book-card__cover" :to="bookLink(book)">
              <img :src="book.image" :alt="book.title" />
            </RouterLink>

            <div class="library-book-card__body">
              <RouterLink class="library-book-card__title-link" :to="bookLink(book)">
                <h3>{{ book.title }}</h3>
              </RouterLink>
              <p class="library-book-card__author">{{ book.author }}</p>
              <p class="library-book-card__summary">{{ bookSummary(book) }}</p>
              <div class="library-book-card__tags">
                <span>{{ book.category || "精选阅读" }}</span>
                <span>{{ bookTag(book, index) }}</span>
              </div>
              <div class="library-book-card__footer">
                <div class="library-book-card__rating">
                  <span>★</span>
                  <b>{{ bookRating(book) }}</b>
                </div>
                <RouterLink class="btn ghost library-book-card__detail" :to="bookLink(book)">查看简介</RouterLink>
              </div>
            </div>
          </article>
        </div>

        <EmptyState
          v-else
          title="没有找到匹配的书籍"
          description="调整关键词、分类或标签后再试试。"
        >
          <button class="btn ghost" type="button" @click="resetFilters">重置筛选</button>
        </EmptyState>

        <div v-if="totalPages > 1" class="pagination-pro">
          <button class="btn ghost" type="button" :disabled="page <= 1" @click="page -= 1">上一页</button>
          <span>{{ page }} / {{ totalPages }}</span>
          <button class="btn ghost" type="button" :disabled="page >= totalPages" @click="page += 1">下一页</button>
        </div>
      </div>

      <aside class="book-library-sidebar">
        <div class="side-panel book-library-panel">
          <h3>分类浏览</h3>
          <div v-for="item in categoryStats" :key="item.label" class="rank-row">
            <span>{{ item.label }}</span>
            <div class="mini-progress">
              <i :style="{ width: `${Math.max(8, Math.round((item.value / Math.max(1, siteStore.books.length)) * 100))}%` }"></i>
            </div>
            <b>{{ item.value }}</b>
          </div>
        </div>

        <div class="side-panel book-library-panel">
          <h3>热门标签</h3>
          <div class="tag-cloud">
            <button
              v-for="tag in hotTags"
              :key="tag.label"
              type="button"
              :class="{ active: activeTag === tag.label }"
              @click="activeTag = tag.label"
            >
              {{ tag.label }}
              <b>{{ tag.value }}</b>
            </button>
          </div>
        </div>

        <div class="side-panel book-library-promo">
          <span class="eyebrow">会员阅读</span>
          <h3>成为会员，免费借阅好书无限</h3>
          <p>享受借阅折扣、优先预约、积分兑换与活动优先名额。</p>
          <button class="btn" type="button">立即开通</button>
        </div>
      </aside>
    </div>
  </section>
</template>
