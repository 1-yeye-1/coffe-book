<script setup>
import { computed, onMounted, ref, watch } from "vue";
import BookCard from "@/components/front/BookCard.vue";
import EmptyState from "@/components/front/EmptyState.vue";
import StatusBadge from "@/components/front/StatusBadge.vue";
import { useSiteStore } from "@/stores/site";

const siteStore = useSiteStore();
const keyword = ref("");
const activeType = ref("全部");
const activeTag = ref("全部");
const sortKey = ref("recommend");
const page = ref(1);
const pageSize = 6;

const tagFilters = ["全部", "馆藏推荐", "高分书单", "本周热借", "适合咖啡阅读"];

const types = computed(() => {
  const categories = new Set(siteStore.books.map((book) => book.category).filter(Boolean));
  return ["全部", ...categories];
});

const filteredBooks = computed(() => {
  const text = keyword.value.trim().toLowerCase();
  return siteStore.books.filter((book, index) => {
    const matchedText = !text || [book.title, book.author, book.publisher, book.category]
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

const categoryStats = computed(() => types.value.slice(1).map((type) => ({
  label: type,
  value: siteStore.books.filter((book) => book.category === type).length
})));

const hotTags = computed(() => tagFilters.slice(1).map((label, index) => ({
  label,
  value: Math.max(1, siteStore.books.filter((book, bookIndex) => bookTag(book, bookIndex) === label).length || index + 2)
})));

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

function bookTag(book, index = 0) {
  if (book.ranking) return "本周热借";
  return tagFilters[(Number(book.id || index) % (tagFilters.length - 1)) + 1];
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
          <span>今日推荐 {{ pagedBooks.length }}</span>
        </div>
      </div>
      <div class="hero-glass-card">
        <strong>{{ filteredBooks.length }}</strong>
        <span>本次筛选结果</span>
        <small>参考前台书库瀑布卡片、右侧分类统计效果图</small>
      </div>
    </div>

    <div class="business-layout">
      <aside class="filter-rail">
        <div class="filter-card">
          <label class="field">
            <span>搜索书名 / 作者</span>
            <input v-model.trim="keyword" type="search" placeholder="输入关键词" />
          </label>
          <label class="field">
            <span>排序</span>
            <select v-model="sortKey">
              <option value="recommend">综合推荐</option>
              <option value="rating">评分优先</option>
              <option value="new">最新收录</option>
            </select>
          </label>
        </div>

        <div class="filter-card">
          <h3>分类统计</h3>
          <button
            v-for="type in types"
            :key="type"
            class="filter-pill"
            :class="{ active: activeType === type }"
            type="button"
            @click="activeType = type"
          >
            <span>{{ type }}</span>
            <b>{{ type === "全部" ? siteStore.books.length : siteStore.books.filter((book) => book.category === type).length }}</b>
          </button>
        </div>

        <div class="filter-card">
          <h3>热门标签</h3>
          <button
            v-for="tag in tagFilters"
            :key="tag"
            class="filter-pill"
            :class="{ active: activeTag === tag }"
            type="button"
            @click="activeTag = tag"
          >
            <span>{{ tag }}</span>
          </button>
        </div>
      </aside>

      <div class="business-main">
        <div class="section-head compact-head">
          <div>
            <h2>馆藏书籍</h2>
            <p class="lead">支持搜索、分类、标签与评分排序；收藏为前端展示状态，不写入后端。</p>
          </div>
          <StatusBadge :label="`${filteredBooks.length} 本书`" type="accent" />
        </div>

        <div v-if="pagedBooks.length" class="book-card-grid">
          <article v-for="(book, index) in pagedBooks" :key="book.id" class="library-book-card">
            <BookCard :book="book" :status="bookStatus(book)" :rating="bookRating(book)" />
            <div class="library-book-card__meta">
              <span>{{ bookTag(book, index) }}</span>
              <button class="icon-text-button" type="button">收藏</button>
            </div>
          </article>
        </div>

        <EmptyState
          v-else
          title="没有找到匹配的书籍"
          description="调整关键词、分类或标签后再试试。"
        />

        <div class="pagination-pro" v-if="totalPages > 1">
          <button class="btn ghost" type="button" :disabled="page <= 1" @click="page -= 1">上一页</button>
          <span>{{ page }} / {{ totalPages }}</span>
          <button class="btn ghost" type="button" :disabled="page >= totalPages" @click="page += 1">下一页</button>
        </div>
      </div>

      <aside class="business-sidebar">
        <div class="side-panel">
          <h3>分类占比</h3>
          <div v-for="item in categoryStats" :key="item.label" class="rank-row">
            <span>{{ item.label }}</span>
            <div class="mini-progress"><i :style="{ width: `${Math.max(8, Math.round((item.value / Math.max(1, siteStore.books.length)) * 100))}%` }"></i></div>
            <b>{{ item.value }}</b>
          </div>
        </div>
        <div class="side-panel">
          <h3>热门标签</h3>
          <div class="tag-cloud">
            <button v-for="tag in hotTags" :key="tag.label" type="button" @click="activeTag = tag.label">
              {{ tag.label }} {{ tag.value }}
            </button>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>
