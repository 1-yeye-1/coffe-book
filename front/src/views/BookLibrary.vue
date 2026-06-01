<script setup>
import { computed, onMounted, ref } from "vue";
import { useSiteStore } from "@/stores/site";

const siteStore = useSiteStore();
const keyword = ref("");
const activeType = ref("全部");
const types = ["全部", "文学", "商业", "生活", "艺术"];

const books = computed(() => siteStore.books.filter((book) => {
  const matchedKeyword = `${book.title}${book.author}`.toLowerCase().includes(keyword.value.toLowerCase());
  return matchedKeyword && (activeType.value === "全部" || book.category === activeType.value);
}));

onMounted(() => {
  if (!siteStore.books.length) siteStore.fetchBooks();
});
</script>

<template>
  <section class="section">
    <div class="section-head">
      <div><h2>精品书库</h2><p class="lead">按分类筛选馆藏，点击书籍可查看作者、出版社与内容简介。</p></div>
      <div class="toolbar"><input v-model.trim="keyword" class="pill" placeholder="搜索书名或作者" /></div>
    </div>
    <div class="tabs">
      <button v-for="type in types" :key="type" :class="{ active: activeType === type }" type="button" @click="activeType = type">{{ type }}</button>
    </div>
    <div class="grid book-grid">
      <article v-for="book in books" :key="book.id" class="card media-card book-card">
        <img :src="book.image" :alt="book.title" />
        <div class="body">
          <div class="post-meta"><h3>{{ book.title }}</h3><span>{{ book.ranking || "馆藏推荐" }}</span></div>
          <p>{{ book.author }}</p>
          <span class="tag">{{ book.category }}</span>
          <RouterLink class="btn ghost" :to="`/books/${book.id}`">查看简介</RouterLink>
        </div>
      </article>
    </div>
    <div v-if="!books.length" class="card empty"><p class="muted">没有找到匹配的书籍。</p></div>
  </section>
</template>
