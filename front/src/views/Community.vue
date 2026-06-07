<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import BaseToast from "@/components/front/BaseToast.vue";
import EmptyState from "@/components/front/EmptyState.vue";
import StatusBadge from "@/components/front/StatusBadge.vue";
import { useSiteStore } from "@/stores/site";
import { useUserStore } from "@/stores/user";

const router = useRouter();
const siteStore = useSiteStore();
const userStore = useUserStore();
const activeCategory = ref("推荐");
const query = ref("");
const message = ref("");
const toastType = ref("success");

const categories = ["推荐", "最新", "关注", "读书笔记", "书评", "咖啡心得"];

const filteredPosts = computed(() => {
  const keyword = query.value.trim().toLowerCase();
  return siteStore.posts.filter((post, index) => {
    const matchedText = !keyword || [post.title, post.content, post.author]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(keyword);
    const matchedCategory = activeCategory.value === "推荐"
      || activeCategory.value === "最新"
      || postCategory(post, index) === activeCategory.value;
    return matchedText && matchedCategory;
  });
});

const hotTopics = computed(() => categories.slice(3).map((label, index) => ({
  label,
  count: siteStore.posts.filter((post, postIndex) => postCategory(post, postIndex) === label).length + index + 3
})));

const recommendedUsers = computed(() => [...new Map(siteStore.posts.map((post) => [post.author, post])).values()]
  .filter((post) => post.author)
  .slice(0, 5));

const topPosts = computed(() => [...siteStore.posts].sort((a, b) => Number(b.likes || 0) - Number(a.likes || 0)).slice(0, 5));

onMounted(() => siteStore.fetchPosts());

async function like(post) {
  if (!userStore.isLoggedIn) return router.push({ name: "login", query: { redirect: "/community" } });
  try {
    await siteStore.likePost(post.id);
    showToast("点赞成功");
  } catch (err) {
    showToast(err.message, "danger");
  }
}

function showToast(text, type = "success") {
  toastType.value = type;
  message.value = text;
  setTimeout(() => { message.value = ""; }, 1800);
}

function postCategory(post, index = 0) {
  if (post.title?.includes("咖啡") || post.content?.includes("咖啡")) return "咖啡心得";
  if (post.title?.includes("书评") || post.content?.includes("书评")) return "书评";
  return categories[(Number(post.id || index) % 3) + 3];
}

function imageFallback(event) {
  event.currentTarget.classList.add("image-placeholder-active");
  event.currentTarget.removeAttribute("src");
  event.currentTarget.alt = "";
}
</script>

<template>
  <section class="section community-page-pro">
    <BaseToast :visible="Boolean(message)" :message="message" :type="toastType" />

    <div class="business-hero business-hero--community">
      <div>
        <p class="eyebrow">Book Friends Community</p>
        <h1>书友社区</h1>
        <p>像小红书一样轻松发现动态，像豆瓣一样沉淀书评与读书笔记；点赞仍复用原有社区接口。</p>
        <div class="hero-chip-row">
          <span>动态 {{ siteStore.posts.length }}</span>
          <span>话题 {{ hotTopics.length }}</span>
          <span>评论 {{ siteStore.posts.reduce((sum, post) => sum + (post.comments?.length || 0), 0) }}</span>
        </div>
      </div>
      <div class="hero-glass-card">
        <strong>{{ userStore.isLoggedIn ? "已登录" : "游客" }}</strong>
        <span>{{ userStore.isLoggedIn ? "可以发布、点赞和评论" : "登录后参与互动" }}</span>
        <RouterLink class="btn ghost" to="/community/publish">发布动态</RouterLink>
      </div>
    </div>

    <div class="community-layout-pro">
      <aside class="filter-rail">
        <div class="filter-card">
          <label class="field">
            <span>搜索社区内容</span>
            <input v-model.trim="query" type="search" placeholder="搜索标题、作者或内容" />
          </label>
        </div>
        <div class="filter-card">
          <h3>频道</h3>
          <button
            v-for="item in categories"
            :key="item"
            class="filter-pill"
            :class="{ active: activeCategory === item }"
            type="button"
            @click="activeCategory = item"
          >
            <span>{{ item }}</span>
          </button>
        </div>
        <div class="filter-card">
          <h3>社区公告</h3>
          <p>文明分享阅读体验，书评与咖啡心得通过审核后会在前台可见。</p>
        </div>
      </aside>

      <div class="community-feed-pro">
        <div class="publish-card">
          <div>
            <b>{{ userStore.user?.name || "咖啡书友" }}</b>
            <span>分享今天的阅读灵感</span>
          </div>
          <RouterLink class="btn" to="/community/publish">发布动态</RouterLink>
        </div>

        <div v-if="filteredPosts.length" class="feed masonry-feed">
          <article v-for="(post, index) in filteredPosts" :key="post.id" class="card community-post pro-post">
            <div class="community-user">
              <span class="community-avatar">{{ post.author?.slice(0, 1) || "书" }}</span>
              <span>
                <strong>{{ post.author || "匿名书友" }}</strong>
                <small>{{ post.userId ? "会员动态" : "后台精选" }} · {{ postCategory(post, index) }}</small>
              </span>
              <StatusBadge :label="postCategory(post, index)" type="accent" />
            </div>
            <h3>{{ post.title }}</h3>
            <p>{{ post.content }}</p>
            <img v-if="post.image" class="post-image" :src="post.image" :alt="post.title" @error="imageFallback" />
            <div class="post-stats-row">
              <span>{{ post.likes }} 点赞</span>
              <span>{{ post.comments?.length || 0 }} 评论</span>
            </div>
            <div class="actions">
              <button class="btn ghost" type="button" :disabled="post.liked" @click="like(post)">
                {{ post.liked ? "已点赞" : "点赞" }}
              </button>
              <RouterLink class="btn" :to="`/community/${post.id}`">查看详情</RouterLink>
            </div>
          </article>
        </div>

        <EmptyState v-else title="暂无匹配动态" description="换一个频道或关键词再看看。" />
      </div>

      <aside class="business-sidebar">
        <div class="side-panel">
          <h3>热门话题</h3>
          <div class="tag-cloud">
            <button v-for="topic in hotTopics" :key="topic.label" type="button" @click="activeCategory = topic.label">
              #{{ topic.label }} {{ topic.count }}
            </button>
          </div>
        </div>
        <div class="side-panel">
          <h3>推荐用户</h3>
          <div v-for="post in recommendedUsers" :key="post.author" class="user-mini-row">
            <span class="community-avatar">{{ post.author?.slice(0, 1) || "书" }}</span>
            <div>
              <strong>{{ post.author }}</strong>
              <small>{{ post.likes || 0 }} 次互动</small>
            </div>
            <button class="icon-text-button" type="button">关注</button>
          </div>
        </div>
        <div class="side-panel">
          <h3>社区排行榜</h3>
          <div v-for="(post, index) in topPosts" :key="post.id" class="rank-row">
            <b>{{ index + 1 }}</b>
            <span>{{ post.title?.length > 18 ? `${post.title.slice(0, 18)}...` : post.title }}</span>
            <small>{{ post.likes }} 赞</small>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>
