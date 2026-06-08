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
const loading = ref(false);
const error = ref("");

const categories = ["推荐", "关注", "最新", "精华", "书评", "咖啡打卡"];
const demoPosts = [
  { id: "demo-post-1", title: "有些伤害，终其一生也无法弥补。但人性的救赎，永远值得被书写。", content: "追风筝的人读后，最难忘的是那句“为你，千千万万遍”。在书屋窗边读完最后一页，咖啡已经凉了，但心里很热。", author: "读书的猫", likes: 128, comments: [{ id: 1 }, { id: 2 }], tag: "书评" },
  { id: "demo-post-2", title: "今天尝试了手冲耶加雪菲，花香非常明显，入口清新明亮。", content: "搭配短篇小说很合适，酸质不会压住文字的细节，推荐给喜欢浅烘焙的朋友。", author: "咖啡不加糖", likes: 96, comments: [{ id: 1 }], tag: "咖啡打卡" },
  { id: "demo-post-3", title: "马尔克斯的文字就像魔法，让现实与幻想交织在一起。", content: "读《百年孤独》时像进入一座迷宫，人物名字反复出现，但每一次都更靠近孤独的核心。", author: "书海漫游者", likes: 73, comments: [{ id: 1 }, { id: 2 }, { id: 3 }], tag: "书评" },
  { id: "demo-post-4", title: "读书会后记：从小说人物聊到城市记忆。", content: "今晚的讨论很丰富，大家从不同职业和生活经验出发，给同一本书带来了不同的光。", author: "晚间书友", likes: 72, comments: [{ id: 1 }], tag: "精华" }
];

const featureEntries = [
  { icon: "✎", title: "发布动态", desc: "分享你的想法", to: "/community/publish" },
  { icon: "□", title: "书籍讨论", desc: "畅聊书中世界", to: "/books" },
  { icon: "☕", title: "咖啡交流", desc: "分享咖啡时光", to: "/culture" },
  { icon: "★", title: "热门话题", desc: "参与热门讨论", to: "/community" }
];

const circles = [
  { title: "文学爱好者", count: "1528人加入", tone: "warm" },
  { title: "咖啡品鉴部落", count: "2367人加入", tone: "coffee" },
  { title: "治愈系书单", count: "1896人加入", tone: "green" },
  { title: "散文随笔集", count: "1264人加入", tone: "paper" },
  { title: "旅行与阅读", count: "1753人加入", tone: "blue" }
];

const communityPosts = computed(() => {
  const realPosts = siteStore.posts || [];
  return realPosts.length >= 6 ? realPosts : [...realPosts, ...demoPosts].slice(0, 8);
});

const filteredPosts = computed(() => {
  const keyword = query.value.trim().toLowerCase();
  return communityPosts.value.filter((post, index) => {
    const matchedText = !keyword || [post.title, post.content, post.author]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(keyword);
    const category = postCategory(post, index);
    const matchedCategory = activeCategory.value === "推荐"
      || activeCategory.value === "最新"
      || activeCategory.value === "关注"
      || category === activeCategory.value
      || (activeCategory.value === "精华" && Number(post.likes || 0) >= 80);
    return matchedText && matchedCategory;
  });
});

const hotTopics = computed(() => [
  { label: "你最近在读什么书?", count: "1.2w", icon: "📚" },
  { label: "今天的咖啡时光", count: "9563", icon: "🔥" },
  { label: "一本书影响了你什么?", count: "8120", icon: "📖" },
  { label: "最爱的书店打卡地", count: "6231", icon: "🧡" }
]);

const recommendedUsers = computed(() => [...new Map(communityPosts.value.map((post) => [post.author, post])).values()]
  .filter((post) => post.author)
  .slice(0, 5));

const totalComments = computed(() => communityPosts.value.reduce((sum, post) => sum + (post.comments?.length || 0), 0));

onMounted(loadPosts);

async function loadPosts() {
  loading.value = true;
  error.value = "";
  try {
    await siteStore.fetchPosts();
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function like(post) {
  if (!userStore.isLoggedIn) return router.push({ name: "login", query: { redirect: "/community" } });
  if (String(post.id || "").startsWith("demo-post")) {
    showToast("演示动态仅用于前端展示");
    return;
  }
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
  if (post.tag) return post.tag;
  if (post.title?.includes("咖啡") || post.content?.includes("咖啡")) return "咖啡打卡";
  if (post.title?.includes("书评") || post.content?.includes("书评")) return "书评";
  return Number(post.likes || index) >= 80 ? "精华" : "书评";
}

function postTime(post, index) {
  if (post.createdAt) return String(post.createdAt).slice(0, 16).replace("T", " ");
  const hours = [2, 4, 6, 8, 12, 18];
  return `${hours[index % hours.length]}小时前`;
}

function authorTitle(post, index) {
  if (index === 0) return "黄金会员";
  if (post.userId) return "会员动态";
  return postCategory(post, index) === "咖啡打卡" ? "咖啡达人" : "普通会员";
}

function detailTarget(post) {
  return String(post.id || "").startsWith("demo-post") ? "/community" : `/community/${post.id}`;
}

function visualCards(post, index) {
  if (post.image) return [post.image];
  if (index > 1) return [];
  return [0, 1, 2].map((offset) => communityPlaceholder(index + offset));
}

function communityPlaceholder(index = 0) {
  const palettes = [
    ["#f8efe4", "#d89a4b", "#784216", "BOOK"],
    ["#fff7ea", "#a97443", "#4a2c17", "COFFEE"],
    ["#f5eadc", "#c28b57", "#5a3824", "READ"]
  ];
  const [base, mid, deep, label] = palettes[index % palettes.length];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="820" height="520" viewBox="0 0 820 520">
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
        <stop stop-color="${base}"/>
        <stop offset=".58" stop-color="${mid}"/>
        <stop offset="1" stop-color="${deep}"/>
      </linearGradient>
    </defs>
    <rect width="820" height="520" fill="url(#g)"/>
    <circle cx="650" cy="98" r="128" fill="#fffdf8" opacity=".24"/>
    <rect x="98" y="126" width="390" height="236" rx="38" fill="#fffdf8" opacity=".48"/>
    <path d="M170 282c74-52 160-58 250-14" fill="none" stroke="${deep}" stroke-width="28" stroke-linecap="round" opacity=".22"/>
    <text x="98" y="430" fill="#4a2c17" font-family="Arial, sans-serif" font-size="46" font-weight="800">Coffee Book</text>
    <text x="98" y="472" fill="#fffdf8" font-family="Arial, sans-serif" font-size="30" font-weight="800">${label}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function imageFallback(event) {
  event.currentTarget.classList.add("image-placeholder-active");
  event.currentTarget.src = communityPlaceholder(1);
}
</script>

<template>
  <section class="section community-page-pro" data-testid="community-page">
    <BaseToast :visible="Boolean(message)" :message="message" :type="toastType" />

    <div class="community-hero-final">
      <div class="community-hero-copy">
        <p class="eyebrow">Book Friends Community</p>
        <h1>书友社区 <span>Community</span></h1>
        <p>分享阅读感悟，发现更多书与咖啡的美好。</p>
        <label class="community-hero-search">
          <input v-model.trim="query" type="search" placeholder="搜索书籍、话题或书友..." />
          <button type="button">搜索</button>
        </label>
      </div>
    </div>

    <div class="community-feature-strip">
      <RouterLink v-for="item in featureEntries" :key="item.title" :to="item.to" class="community-feature-item">
        <span>{{ item.icon }}</span>
        <div>
          <strong>{{ item.title }}</strong>
          <small>{{ item.desc }}</small>
        </div>
      </RouterLink>
    </div>

    <div class="community-layout-final">
      <main class="community-feed-final">
        <div class="community-tabs-bar">
          <div class="community-tabs">
            <button
              v-for="item in categories"
              :key="item"
              type="button"
              :class="{ active: activeCategory === item }"
              @click="activeCategory = item"
            >
              {{ item }}
            </button>
          </div>
          <select aria-label="动态排序">
            <option>最新发布</option>
            <option>最多点赞</option>
          </select>
        </div>

        <div class="publish-card community-publish-card">
          <span class="community-avatar">{{ userStore.user?.name?.slice(0, 1) || "书" }}</span>
          <div>
            <b>{{ userStore.user?.name || "咖啡书友" }}</b>
            <span>记录一段阅读灵感，或分享今天的咖啡时光。</span>
          </div>
          <RouterLink class="btn" to="/community/publish">发布动态</RouterLink>
        </div>

        <div v-if="loading" class="community-loading-list">
          <div v-for="item in 3" :key="item" class="skeleton-card community-skeleton-card"></div>
        </div>
        <p v-else-if="error" class="form-error">{{ error }}</p>

        <div v-else-if="filteredPosts.length" class="community-post-list">
          <article v-for="(post, index) in filteredPosts" :key="post.id" class="community-post-card" data-testid="community-post-card">
            <header class="community-post-card__head">
              <span class="community-avatar community-avatar--photo">{{ post.author?.slice(0, 1) || "书" }}</span>
              <div>
                <h3>{{ post.author || "匿名书友" }} <StatusBadge v-if="index === 0" label="黄金会员" type="warning" /></h3>
                <p>{{ postTime(post, index) }} · {{ authorTitle(post, index) }}</p>
              </div>
              <button class="community-more-button" type="button" aria-label="更多">...</button>
            </header>

            <RouterLink class="community-post-card__title" :to="detailTarget(post)">
              {{ post.title }}
            </RouterLink>
            <p class="community-post-card__content">{{ post.content }}</p>

            <div v-if="visualCards(post, index).length" class="community-image-grid" :class="{ 'single': visualCards(post, index).length === 1 }">
              <img
                v-for="(image, imageIndex) in visualCards(post, index)"
                :key="imageIndex"
                :src="image"
                :alt="post.title"
                @error="imageFallback"
              />
            </div>

            <div class="community-tag-row">
              <button type="button" @click="activeCategory = postCategory(post, index)"># {{ postCategory(post, index) }}</button>
              <button v-if="index === 0" type="button"># 追风筝的人</button>
              <button v-if="postCategory(post, index) === '咖啡打卡'" type="button"># 手冲咖啡</button>
            </div>

            <footer class="community-post-actions">
              <button type="button" :disabled="post.liked" @click="like(post)">♡ {{ post.likes || 0 }}</button>
              <RouterLink :to="detailTarget(post)">□ {{ post.comments?.length || 0 }}</RouterLink>
              <RouterLink :to="detailTarget(post)">分享</RouterLink>
              <RouterLink class="detail-link" :to="detailTarget(post)">查看详情</RouterLink>
            </footer>
          </article>
        </div>

        <EmptyState v-else title="暂无匹配动态" description="换一个频道或关键词再看看。">
          <button class="btn ghost" type="button" @click="query = ''; activeCategory = '推荐'">重置筛选</button>
        </EmptyState>

        <section class="community-circle-section">
          <div class="section-head compact-head">
            <h2>精选圈子</h2>
            <RouterLink to="/community">更多圈子</RouterLink>
          </div>
          <div class="community-circle-grid">
            <article v-for="item in circles" :key="item.title" class="community-circle-card" :class="`community-circle-card--${item.tone}`">
              <strong>{{ item.title }}</strong>
              <span>{{ item.count }}</span>
              <button type="button">加入</button>
            </article>
          </div>
        </section>
      </main>

      <aside class="community-sidebar-final">
        <div class="side-panel community-side-panel">
          <div class="community-side-title">
            <h3>热门话题</h3>
            <RouterLink to="/community">更多</RouterLink>
          </div>
          <button v-for="topic in hotTopics" :key="topic.label" class="community-topic-row" type="button" @click="query = topic.label">
            <img :src="communityPlaceholder(topic.label.length)" :alt="topic.label" @error="imageFallback" />
            <span>
              <strong>{{ topic.icon }} {{ topic.label }}</strong>
              <small>{{ topic.count }} 讨论</small>
            </span>
          </button>
        </div>

        <div class="side-panel community-side-panel">
          <h3>活跃书友</h3>
          <div v-for="(post, index) in recommendedUsers" :key="post.author" class="community-user-row">
            <b>{{ index + 1 }}</b>
            <span class="community-avatar">{{ post.author?.slice(0, 1) || "书" }}</span>
            <div>
              <strong>{{ post.author }}</strong>
              <small>{{ authorTitle(post, index) }}</small>
            </div>
            <button type="button">关注</button>
          </div>
        </div>

        <div class="side-panel community-join-card">
          <h3>加入书友社区</h3>
          <p>发现志同道合的朋友，一起读书、聊天和打卡。</p>
          <RouterLink class="btn" to="/community/publish">立即加入</RouterLink>
        </div>

        <div class="side-panel community-side-panel">
          <h3>社区公告</h3>
          <p>请尊重原创内容，友善交流。书评、咖啡心得与活动分享会优先进入推荐流。</p>
          <div class="community-stats-grid">
            <span><b>{{ communityPosts.length }}</b>动态</span>
            <span><b>{{ totalComments }}</b>评论</span>
            <span><b>{{ hotTopics.length }}</b>话题</span>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>
