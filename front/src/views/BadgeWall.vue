<script setup>
import { computed, onMounted, ref } from "vue";
import DataState from "@/components/DataState.vue";
import StatusBadge from "@/components/front/StatusBadge.vue";
import { useEngagementStore } from "@/stores/engagement";

const engagementStore = useEngagementStore();
const loading = ref(false);
const error = ref("");
const badges = computed(() => engagementStore.badges);

onMounted(loadBadges);

async function loadBadges() {
  loading.value = true;
  error.value = "";
  try {
    await engagementStore.fetchBadges();
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="section points-page-pro" data-testid="badge-wall-page">
    <DataState
      :loading="loading"
      :error="error"
      :empty="!badges.length"
      loading-title="勋章墙同步中"
      empty-title="暂无勋章"
      description="通过阅读、咖啡、活动、社区和会员成长获得专属勋章。"
      @retry="loadBadges"
    >
      <div class="points-hero-final">
        <div class="points-hero-copy">
          <p class="eyebrow">Badge Wall</p>
          <h1>勋章墙</h1>
          <p>展示用户活跃、成长和高价值会员身份，让留存行为有可见成就感。</p>
        </div>
        <div class="points-balance-card">
          <span>已获得</span>
          <strong>{{ engagementStore.earnedBadges.length }}</strong>
          <small>共 {{ badges.length }} 枚勋章</small>
          <RouterLink class="btn" to="/tasks">去做任务</RouterLink>
        </div>
      </div>

      <div class="reward-grid-pro">
        <article v-for="badge in badges" :key="badge.id" class="card reward-card-pro" :class="{ done: badge.earned }">
          <div class="reward-icon">{{ badge.icon || badge.name.slice(0, 1) }}</div>
          <div>
            <StatusBadge :label="badge.earned ? '已获得' : '未获得'" :type="badge.earned ? 'success' : 'warning'" />
            <h3>{{ badge.name }}</h3>
            <p>{{ badge.description }}</p>
            <small>{{ badge.earnedAt || "完成对应任务后点亮" }}</small>
          </div>
        </article>
      </div>
    </DataState>
  </section>
</template>
