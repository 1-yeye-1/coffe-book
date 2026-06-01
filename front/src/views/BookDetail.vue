<script setup>
import { computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import { useSiteStore } from "@/stores/site";

const route = useRoute();
const siteStore = useSiteStore();
const book = computed(() => siteStore.books.find((item) => String(item.id) === String(route.params.bookId)));

onMounted(() => {
  if (!siteStore.books.length) siteStore.fetchBooks();
});
</script>

<template>
  <section class="section detail-section">
    <RouterLink class="link-button" to="/books">返回精品书库</RouterLink>
    <div v-if="book" class="book-detail">
      <img :src="book.image" :alt="book.title" />
      <article class="card">
        <p class="eyebrow">{{ book.category }} · {{ book.ranking || "馆藏推荐" }}</p>
        <h2>{{ book.title }}</h2>
        <p class="lead">{{ book.author }}</p>
        <p>{{ book.summary }}</p>
        <div class="event-facts">
          <span><strong>出版社</strong>{{ book.publisher || "暂无" }}</span>
          <span><strong>收录时间</strong>{{ book.publishedAt }}</span>
        </div>
      </article>
    </div>
    <div v-else class="card empty"><p class="muted">暂无书籍资料。</p></div>
  </section>
</template>
