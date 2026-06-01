<script setup>
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useSiteStore } from "@/stores/site";
import { useUserStore } from "@/stores/user";

const router = useRouter();
const siteStore = useSiteStore();
const userStore = useUserStore();

onMounted(() => siteStore.fetchPosts());

async function like(post) {
  if (!userStore.isLoggedIn) return router.push({ name: "login", query: { redirect: "/community" } });
  await siteStore.likePost(post.id);
}
</script>

<template>
  <section class="section community-section">
    <div class="section-head"><div><h2>社区首页</h2><p class="lead">阅读、咖啡和城市生活的书友动态。</p></div></div>
    <aside class="card community-tip">
      <strong>社区提示</strong>
      <span class="muted">{{ userStore.isLoggedIn ? "已登录，可以发布动态、点赞和评论。" : "浏览无需登录，互动操作需要先登录。" }}</span>
    </aside>
    <div>
      <div class="tabs">
        <button class="active">推荐流</button>
        <button>最新流</button>
        <RouterLink to="/community/publish">发布动态</RouterLink>
      </div>
      <div class="feed">
        <article v-for="post in siteStore.posts" :key="post.id" class="card community-post">
          <div class="community-user">
            <span class="community-avatar">{{ post.author?.slice(0, 1) || "书" }}</span>
            <span><strong>{{ post.author }}</strong><small>{{ post.userId ? "书友动态" : "匿名动态" }}</small></span>
          </div>
          <h3>{{ post.title }}</h3>
          <p>{{ post.content }}</p>
          <img v-if="post.image" class="post-image" :src="post.image" :alt="post.title" />
          <div class="actions">
            <button class="btn ghost" type="button" :disabled="post.liked" @click="like(post)">{{ post.liked ? "已点赞" : "点赞" }} {{ post.likes }}</button>
            <RouterLink class="btn" :to="`/community/${post.id}`">查看详情 · {{ post.comments.length }} 评论</RouterLink>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
