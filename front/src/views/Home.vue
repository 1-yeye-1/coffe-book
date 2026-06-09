<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { gsap } from "gsap";
import BookCard from "@/components/front/BookCard.vue";
import DataState from "@/components/DataState.vue";
import EventCard from "@/components/front/EventCard.vue";
import ProductCard from "@/components/front/ProductCard.vue";
import StatusBadge from "@/components/front/StatusBadge.vue";
import { useEngagementStore } from "@/stores/engagement";
import { useSiteStore } from "@/stores/site";

const engagementStore = useEngagementStore();
const siteStore = useSiteStore();
const loading = ref(false);
const error = ref("");
const pageRoot = ref(null);
const animatedStats = ref([]);
let animationContext = null;
let scrollHandler = null;

const home = computed(() => siteStore.home);
const heroImage = computed(() => home.value?.banners?.[0]?.image || "https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=1800&q=88");
const stats = computed(() => home.value?.stats || []);
const books = computed(() => (home.value?.books || []).slice(0, 4));
const coffees = computed(() => (home.value?.coffees || []).slice(0, 3));
const events = computed(() => {
  const activityItems = (home.value?.recommendations || []).filter((item) => String(item.tag || "").includes("活动"));
  return (activityItems.length ? activityItems : home.value?.recommendations || []).slice(0, 3);
});
const communityItems = computed(() => (home.value?.news || []).slice(0, 3));
const recentHistory = computed(() => engagementStore.history.slice(0, 4));
const recommendProducts = computed(() => (engagementStore.recommendations?.products || []).slice(0, 3));
const recommendBooks = computed(() => (engagementStore.recommendations?.books || []).slice(0, 3));
const recommendActivities = computed(() => (engagementStore.recommendations?.activities || []).slice(0, 3));

const reviews = [
  { name: "城市读者", role: "黄金会员", text: "预约座位、买咖啡和参加夜读会都在一个系统里完成，展示时很有完整产品感。" },
  { name: "北窗", role: "书友社区活跃用户", text: "社区动态和线下活动连接得很自然，像一个真的复合书店运营系统。" },
  { name: "运营老师", role: "后台演示视角", text: "首页数据、商品、活动和会员入口都清楚，答辩时很好讲业务闭环。" }
];

const memberTiers = [
  { title: "普通会员", desc: "积分、收藏、笔记与预约基础权益", value: "100+" },
  { title: "黄金会员", desc: "活动优先报名与专属饮品兑换", value: "2x" },
  { title: "钻石会员", desc: "主题活动席位与书屋礼品权益", value: "VIP" }
];

onMounted(async () => {
  await loadHome();
  await Promise.allSettled([
    engagementStore.fetchRecommendations("home"),
    localStorage.getItem("coffee_token") ? engagementStore.fetchHistory() : Promise.resolve()
  ]);
  await nextTick();
  runAnimations();
});

onBeforeUnmount(() => {
  if (animationContext) animationContext.revert();
  if (scrollHandler) window.removeEventListener("scroll", scrollHandler);
});

async function loadHome() {
  loading.value = true;
  error.value = "";
  try {
    await siteStore.fetchHome();
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

function statTarget(value) {
  return Number(String(value || "0").replace(/[^\d.]/g, "")) || 0;
}

function formatStat(index, fallback) {
  const value = animatedStats.value[index];
  if (value === undefined) return fallback;
  return Number(value).toLocaleString("zh-CN");
}

function animateStats() {
  animatedStats.value = stats.value.map(() => 0);
  stats.value.forEach((item, index) => {
    const counter = { value: 0 };
    gsap.to(counter, {
      value: statTarget(item.value),
      duration: 1.35,
      delay: 0.15 + index * 0.08,
      ease: "power2.out",
      onUpdate: () => {
        animatedStats.value[index] = Math.round(counter.value);
      }
    });
  });
}

function runAnimations() {
  if (!pageRoot.value) return;
  if (animationContext) animationContext.revert();

  animationContext = gsap.context(() => {
    gsap.from(".home-hero-pro__copy > *", {
      opacity: 0,
      y: 22,
      duration: 0.72,
      stagger: 0.08,
      ease: "power3.out"
    });
    gsap.from("[data-reveal]", {
      opacity: 0,
      y: 26,
      duration: 0.7,
      stagger: 0.06,
      ease: "power3.out"
    });
  }, pageRoot.value);

  animateStats();
  scrollHandler = () => {
    const offset = Math.min(92, window.scrollY * 0.08);
    gsap.to(".home-hero-pro__media img", {
      y: offset,
      scale: 1.04,
      duration: 0.35,
      ease: "power2.out",
      overwrite: true
    });
  };
  window.addEventListener("scroll", scrollHandler, { passive: true });
}
</script>

<template>
  <div ref="pageRoot" class="home-page">
    <section class="home-hero-pro" data-testid="home-hero">
      <div class="home-hero-pro__media" aria-hidden="true">
        <img :src="heroImage" alt="" />
      </div>
      <div class="home-hero-pro__overlay"></div>
      <div class="home-hero-pro__copy">
        <div class="home-hero-pro__content">
          <span class="hero-eyebrow">Coffee · Books · Community</span>
          <h1 class="home-hero-pro__title">
            <span>咖啡书屋</span>
            <small>Coffee Book Club</small>
          </h1>
          <p class="home-hero-pro__lead">把精品咖啡、城市阅读、文创零售和社群活动放进一个高互动空间，让每一次到店都有新内容可探索。</p>
          <div class="actions home-hero-pro__actions">
            <RouterLink class="btn" to="/reservations">立即预约</RouterLink>
            <RouterLink class="btn secondary" to="/shop">逛文创商城</RouterLink>
          </div>
        </div>

        <aside class="home-hero-pro__brand-card" aria-label="品牌信息">
          <span>Since 2019</span>
          <strong>城市阅读咖啡馆</strong>
          <p>咖啡、书籍、活动、社区与会员体系，一站式连接到店体验。</p>
          <div>
            <b>09:00 - 22:30</b>
            <small>Daily Open</small>
          </div>
        </aside>
      </div>
    </section>

    <section v-if="stats.length" class="home-stats-section" aria-label="咖啡书屋数据概览" data-reveal>
      <article v-for="(item, index) in stats.slice(0, 4)" :key="item.label" class="home-stat-card">
        <div>
          <strong>{{ formatStat(index, item.value) }}</strong>
          <span>{{ item.label }}</span>
        </div>
        <small>Coffee Book Data</small>
      </article>
    </section>

    <section v-if="recentHistory.length || recommendProducts.length || recommendBooks.length || recommendActivities.length" class="home-section-pro" data-reveal>
      <div class="home-section-pro__head">
        <div>
          <span class="section-kicker">For You</span>
          <h2>最近浏览与猜你喜欢</h2>
          <p>基于浏览记录、收藏、购买和热门排行生成轻量推荐。</p>
        </div>
        <RouterLink class="btn secondary" to="/tasks">去做任务</RouterLink>
      </div>
      <div v-if="recentHistory.length" class="home-channel-grid">
        <article v-for="item in recentHistory" :key="item.id">
          <span>{{ item.targetType }}</span>
          <strong>{{ item.target?.title || item.target?.name }}</strong>
          <p>{{ item.target?.summary || item.target?.description || item.target?.content || "继续查看最近浏览内容" }}</p>
        </article>
      </div>
      <div class="product-show-grid">
        <ProductCard v-for="item in recommendProducts" :key="`rp-${item.id}`" :item="item" :to="`/shop/${item.id}`" cta="猜你喜欢" />
      </div>
      <div class="book-show-grid">
        <BookCard v-for="item in recommendBooks" :key="`rb-${item.id}`" :book="item" />
      </div>
      <div class="event-show-grid">
        <EventCard v-for="item in recommendActivities" :key="`ra-${item.id}`" :event="item" :to="`/activities/${item.id}`" />
      </div>
    </section>

    <section class="home-channel-grid" data-reveal>
      <article>
        <span>01</span>
        <strong>精品咖啡</strong>
        <p>产区风味、手冲课程、季节限定饮品。</p>
      </article>
      <article>
        <span>02</span>
        <strong>城市阅读</strong>
        <p>书库榜单、收藏笔记、热门书评。</p>
      </article>
      <article>
        <span>03</span>
        <strong>社群活动</strong>
        <p>夜读会、公开课、挑战赛和报名管理。</p>
      </article>
    </section>

    <DataState
      :loading="loading"
      :error="error"
      :empty="!home"
      loading-title="首页内容加载中"
      empty-title="暂无首页内容"
      description="请确认后端 API 已启动。"
      @retry="loadHome"
    >
      <section class="section home-section" data-reveal>
        <div class="section-head">
          <div>
            <span class="eyebrow">Today Picks</span>
            <h2>今日推荐</h2>
            <p class="lead">咖啡、书籍和活动的运营位已接入后端接口。</p>
          </div>
          <RouterLink class="link-button" to="/shop">查看全部</RouterLink>
        </div>
        <div class="home-feature-grid">
          <ProductCard v-for="item in home?.recommendations || []" :key="item.title" :item="item" cta="探索详情" />
        </div>
      </section>

      <section class="section home-section" data-reveal>
        <div class="section-head">
          <div>
            <span class="eyebrow">Books</span>
            <h2>热门书籍</h2>
            <p class="lead">馆藏内容来自精品书库接口，首屏以卡片方式呈现。</p>
          </div>
          <RouterLink class="link-button" to="/books">进入书库</RouterLink>
        </div>
        <div class="home-book-grid">
          <BookCard v-for="book in books" :key="book.id" :book="book" />
        </div>
      </section>

      <section class="section home-section" data-reveal>
        <div class="section-head">
          <div>
            <span class="eyebrow">Coffee Bar</span>
            <h2>热门咖啡</h2>
            <p class="lead">用杂志式视觉强化咖啡书屋的主题识别。</p>
          </div>
          <RouterLink class="link-button" to="/culture">咖啡文化</RouterLink>
        </div>
        <div class="home-feature-grid">
          <ProductCard v-for="item in coffees" :key="item.title" :item="item" cta="查看风味" />
        </div>
      </section>

      <section class="home-split-section" data-reveal>
        <div>
          <span class="eyebrow">Events</span>
          <h2>活动推荐</h2>
          <p>读书会、咖啡公开课与城市书评挑战赛构成线下运营场景，前台报名与后台审核保持原业务链路。</p>
          <RouterLink class="btn" to="/activities">查看活动</RouterLink>
        </div>
        <div class="home-event-stack">
          <EventCard v-for="item in events" :key="item.title" :event="item" />
        </div>
      </section>

      <section class="section home-section" data-reveal>
        <div class="section-head">
          <div>
            <span class="eyebrow">Community</span>
            <h2>社区推荐</h2>
            <p class="lead">公告、活动和社区内容统一进入首页信息流。</p>
          </div>
          <RouterLink class="link-button" to="/community">进入社区</RouterLink>
        </div>
        <div class="home-news-grid">
          <article v-for="item in communityItems" :key="item.title" class="home-news-card">
            <StatusBadge label="书屋动态" type="accent" />
            <h3>{{ item.title }}</h3>
            <p>{{ item.summary }}</p>
            <span>{{ item.date }}</span>
          </article>
        </div>
      </section>

      <section class="home-story-panel" data-reveal>
        <div>
          <span class="eyebrow">Brand Story</span>
          <h2>一间能被运营起来的城市书房</h2>
          <p>咖啡书屋把到店消费、座位预约、活动报名、社区互动、积分兑换和后台运营管理放在同一套系统里，让毕业设计不只是页面展示，而是完整业务闭环。</p>
        </div>
        <div class="home-story-panel__facts">
          <span>预约</span>
          <span>订单</span>
          <span>活动</span>
          <span>社区</span>
        </div>
      </section>

      <section class="section home-section" data-reveal>
        <div class="section-head">
          <div>
            <span class="eyebrow">Members</span>
            <h2>会员体系</h2>
          </div>
        </div>
        <div class="home-member-grid">
          <article v-for="tier in memberTiers" :key="tier.title">
            <strong>{{ tier.value }}</strong>
            <h3>{{ tier.title }}</h3>
            <p>{{ tier.desc }}</p>
          </article>
        </div>
      </section>

      <section class="section home-section" data-reveal>
        <div class="section-head">
          <div>
            <span class="eyebrow">Reviews</span>
            <h2>用户评价</h2>
          </div>
        </div>
        <div class="home-review-grid">
          <article v-for="review in reviews" :key="review.name">
            <p>{{ review.text }}</p>
            <strong>{{ review.name }}</strong>
            <span>{{ review.role }}</span>
          </article>
        </div>
      </section>
    </DataState>
  </div>
</template>
