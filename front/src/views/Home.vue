<script setup>
import { onMounted } from "vue";
import { useSiteStore } from "@/stores/site";

const siteStore = useSiteStore();

onMounted(() => {
  siteStore.fetchHome().catch(() => null);
});
</script>

<template>
  <section class="hero">
    <div class="hero-content">
      <span class="hero-eyebrow">Coffee · Books · Community</span>
      <h1>咖啡书屋</h1>
      <p>把精品咖啡、城市阅读、文创零售和社群活动放进一个高交互空间，让每一次到店都有新内容可探索。</p>
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

  <section class="section">
    <div class="section-head">
      <div><h2>今日推荐</h2><p class="lead">咖啡、书籍和活动的运营位已接入接口。</p></div>
    </div>
    <div class="grid">
      <article v-for="item in siteStore.home?.recommendations || []" :key="item.title" class="card media-card">
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
      <article v-for="item in siteStore.home?.news || []" :key="item.title" class="card">
        <div class="post-meta"><strong>{{ item.title }}</strong><span>{{ item.date }}</span></div>
        <p>{{ item.summary }}</p>
      </article>
    </div>
  </section>
</template>
