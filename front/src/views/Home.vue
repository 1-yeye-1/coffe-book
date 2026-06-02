<script setup>
import { onMounted, ref } from "vue";
import DataState from "@/components/DataState.vue";
import { useSiteStore } from "@/stores/site";

const siteStore = useSiteStore();
const loading = ref(false);
const error = ref("");

onMounted(loadHome);

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
</script>

<template>
  <section class="hero home-hero" data-testid="home-hero">
    <div class="hero-content">
      <span class="hero-eyebrow">Coffee · Books · Community</span>
      <h1>咖啡书屋</h1>
      <p>把精品咖啡、城市阅读、文创零售和社群活动放进一个高互动空间，让每一次到店都有新内容可探索。</p>
      <div class="actions">
        <RouterLink class="btn" to="/reservations">立即预约</RouterLink>
        <RouterLink class="btn secondary" to="/shop">逛文创商城</RouterLink>
      </div>
      <div v-if="siteStore.home?.stats" class="hero-kpis">
        <div v-for="item in siteStore.home.stats.slice(0, 3)" :key="item.label">
          <strong>{{ item.value }}</strong>
          <span>{{ item.label }}</span>
        </div>
      </div>
    </div>
  </section>

  <section class="section service-strip">
    <article><strong>精品咖啡</strong><span>产区风味、手冲课程、招牌饮品</span></article>
    <article><strong>城市阅读</strong><span>书库榜单、读书笔记、盲盒推荐</span></article>
    <article><strong>在线预约</strong><span>座位状态、时间人数、特殊需求</span></article>
    <article><strong>复合体验</strong><span>活动赛事、文创商城、会员积分</span></article>
  </section>

  <DataState
    :loading="loading"
    :error="error"
    :empty="!siteStore.home"
    loading-title="首页内容加载中"
    empty-title="暂无首页内容"
    description="请确认后端 API 已启动。"
    @retry="loadHome"
  >
    <section class="section">
      <div class="section-head">
        <div><h2>今日推荐</h2><p class="lead">咖啡、书籍和活动的运营位已接入后端接口。</p></div>
      </div>
      <div class="grid">
        <article v-for="item in siteStore.home?.recommendations || []" :key="item.title" class="card media-card featured-card">
          <img v-if="item.image" :src="item.image" :alt="item.title" />
          <div class="body">
            <span class="status">{{ item.tag }}</span>
            <h3>{{ item.title }}</h3>
            <p class="muted">{{ item.description }}</p>
          </div>
        </article>
      </div>
    </section>

    <section class="section">
      <div class="section-head"><div><h2>最新动态</h2><p class="lead">公告、活动和社区内容统一进入信息流。</p></div></div>
      <div class="feed">
        <article v-for="item in siteStore.home?.news || []" :key="item.title" class="card timeline-card">
          <div class="post-meta"><strong>{{ item.title }}</strong><span>{{ item.date }}</span></div>
          <p>{{ item.summary }}</p>
        </article>
      </div>
    </section>
  </DataState>
</template>
