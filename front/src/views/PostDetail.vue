<script setup>
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useSiteStore } from "@/stores/site";
import { useUserStore } from "@/stores/user";

const route = useRoute();
const router = useRouter();
const siteStore = useSiteStore();
const userStore = useUserStore();
const content = ref("");
const message = ref("");
const post = computed(() => siteStore.posts.find((item) => String(item.id) === String(route.params.postId)));

onMounted(() => siteStore.fetchPosts());

async function like() {
  if (!userStore.isLoggedIn) return router.push({ name: "login", query: { redirect: route.fullPath } });
  await siteStore.likePost(post.value.id);
}

async function submitComment() {
  await siteStore.commentPost(post.value.id, content.value);
  content.value = "";
  message.value = "评论已提交，审核通过后展示";
}
</script>

<template>
  <section class="section">
    <div class="section-head"><div><h2>帖子详情</h2><p class="lead">查看动态正文、评论和互动。</p></div></div>
    <template v-if="post">
      <article class="card community-post">
        <div class="community-user">
          <span class="community-avatar">{{ post.author?.slice(0, 1) || "书" }}</span>
          <strong>{{ post.author }}</strong>
        </div>
        <h3>{{ post.title }}</h3>
        <p>{{ post.content }}</p>
        <img v-if="post.image" class="post-image" :src="post.image" :alt="post.title" />
        <button class="btn ghost" type="button" :disabled="post.liked" @click="like">{{ post.liked ? "已点赞" : "点赞" }} {{ post.likes }}</button>
      </article>

      <section class="section">
        <h2>评论</h2>
        <div class="feed">
          <div v-for="comment in post.comments" :key="comment.id" class="card comment-card">
            <div class="community-user"><span class="community-avatar">{{ comment.user?.slice(0, 1) || "书" }}</span><strong>{{ comment.user }}</strong></div>
            <p>{{ comment.content }}</p>
            <span class="muted">点赞 {{ comment.likes || 0 }}</span>
          </div>
          <p v-if="!post.comments.length" class="muted">暂无评论</p>
        </div>
        <form v-if="userStore.isLoggedIn" class="card" @submit.prevent="submitComment">
          <p v-if="message" class="toast-inline">{{ message }}</p>
          <label class="field"><span>发表评论</span><textarea v-model.trim="content" maxlength="500" rows="3" required></textarea></label>
          <button class="btn" type="submit">提交评论</button>
        </form>
        <div v-else class="card empty"><p class="muted">登录后可以发表评论和点赞。</p><RouterLink class="btn" :to="{ name: 'login', query: { redirect: route.fullPath } }">去登录</RouterLink></div>
      </section>
    </template>
    <div v-else class="card empty"><p class="muted">没有找到这条动态。</p></div>
  </section>
</template>
