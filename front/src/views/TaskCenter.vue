<script setup>
import { computed, onMounted, ref } from "vue";
import DataState from "@/components/DataState.vue";
import StatusBadge from "@/components/front/StatusBadge.vue";
import { useEngagementStore } from "@/stores/engagement";

const engagementStore = useEngagementStore();
const loading = ref(false);
const error = ref("");
const message = ref("");

const dailyTasks = computed(() => engagementStore.dailyTasks);
const growthTasks = computed(() => engagementStore.growthTasks);
const checkIn = computed(() => engagementStore.checkIn || {});
const completion = computed(() => {
  const total = engagementStore.tasks.length || 1;
  return Math.round((engagementStore.completedTasks.length / total) * 100);
});
const calendarDays = computed(() => {
  const checked = new Set(checkIn.value.dates || []);
  const days = [];
  const date = new Date(`${checkIn.value.today || new Date().toISOString().slice(0, 10)}T00:00:00`);
  date.setDate(date.getDate() - 13);
  for (let index = 0; index < 14; index += 1) {
    const key = date.toISOString().slice(0, 10);
    days.push({ key, day: date.getDate(), checked: checked.has(key) });
    date.setDate(date.getDate() + 1);
  }
  return days;
});

onMounted(loadData);

async function loadData() {
  loading.value = true;
  error.value = "";
  try {
    await Promise.all([
      engagementStore.fetchTasks(),
      engagementStore.fetchBadges(),
      engagementStore.fetchNotifications()
    ]);
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function checkInToday() {
  try {
    await engagementStore.checkInToday();
    message.value = "签到成功，任务奖励与连续签到奖励已发放";
  } catch (err) {
    message.value = err.message;
  }
}

function formatTime(value) {
  if (!value) return "待完成";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("zh-CN");
}
</script>

<template>
  <section class="section points-page-pro" data-testid="task-center-page">
    <DataState
      :loading="loading"
      :error="error"
      :empty="!engagementStore.tasks.length"
      loading-title="任务数据同步中"
      empty-title="暂无任务"
      description="完成每日任务和成长任务，可获得积分、勋章和连续签到奖励。"
      @retry="loadData"
    >
      <div class="points-hero-final">
        <div class="points-hero-copy">
          <p class="eyebrow">Task Center</p>
          <h1>任务中心</h1>
          <p>通过签到、浏览、互动和成长行为获得积分奖励，形成持续活跃的会员路径。</p>
        </div>
        <div class="points-balance-card">
          <span>任务完成度</span>
          <strong>{{ completion }}%</strong>
          <small>今日连续签到 {{ checkIn.streak || 0 }} 天</small>
          <button class="btn" type="button" :disabled="checkIn.checkedInToday" @click="checkInToday">
            {{ checkIn.checkedInToday ? "今日已签到" : "立即签到" }}
          </button>
        </div>
      </div>

      <div class="points-layout-pro">
        <main class="points-main-stack">
          <article class="card level-progress-card">
            <div class="level-progress-head">
              <div>
                <p class="eyebrow">Check-in Calendar</p>
                <h3>连续签到 {{ checkIn.streak || 0 }} 天</h3>
              </div>
              <strong>{{ checkIn.checkedInToday ? "已签到" : "待签到" }}</strong>
            </div>
            <div class="task-card-grid">
              <span v-for="day in calendarDays" :key="day.key" class="badge-card-mini" :class="{ active: day.checked }">
                <StatusBadge :label="String(day.day)" :type="day.checked ? 'success' : 'default'" />
                <span>{{ day.checked ? "已签" : "未签" }}</span>
              </span>
            </div>
            <p v-if="message" class="toast-inline">{{ message }}</p>
          </article>

          <section class="section-block">
            <div class="section-head compact">
              <div>
                <p class="eyebrow">Daily Tasks</p>
                <h3>每日任务</h3>
              </div>
            </div>
            <div class="task-card-grid">
              <article v-for="task in dailyTasks" :key="task.actionKey" class="card task-card" :class="{ done: task.status === 'completed' }">
                <StatusBadge :label="task.status === 'completed' ? '已完成' : '待完成'" :type="task.status === 'completed' ? 'success' : 'warning'" />
                <h3>{{ task.title }}</h3>
                <p>{{ task.description }}</p>
                <strong>+{{ task.rewardPoints }} 积分</strong>
                <small>{{ formatTime(task.completedAt) }}</small>
              </article>
            </div>
          </section>

          <section class="section-block">
            <div class="section-head compact">
              <div>
                <p class="eyebrow">Growth Tasks</p>
                <h3>成长任务</h3>
              </div>
            </div>
            <div class="task-card-grid">
              <article v-for="task in growthTasks" :key="task.actionKey" class="card task-card" :class="{ done: task.status === 'completed' }">
                <StatusBadge :label="task.status === 'completed' ? '已完成' : '待完成'" :type="task.status === 'completed' ? 'success' : 'warning'" />
                <h3>{{ task.title }}</h3>
                <p>{{ task.description }}</p>
                <strong>+{{ task.rewardPoints }} 积分</strong>
                <small>{{ formatTime(task.completedAt) }}</small>
              </article>
            </div>
          </section>
        </main>

        <aside class="points-side-stack">
          <article class="card member-rights-card">
            <h3>签到奖励预览</h3>
            <div class="points-rights-list">
              <div v-for="reward in checkIn.rewards || []" :key="reward.days">
                <span>{{ reward.days }}</span>
                <b>连续 {{ reward.label }}</b>
                <small>额外 +{{ reward.points }} 积分</small>
              </div>
            </div>
          </article>

          <article class="card point-record-card">
            <h3>我的成就</h3>
            <div class="point-record-list">
              <p v-for="badge in engagementStore.earnedBadges.slice(0, 5)" :key="badge.id">
                <span>
                  <strong>{{ badge.name }}</strong>
                  <small>{{ badge.description }}</small>
                </span>
                <b class="success">已获得</b>
              </p>
              <p v-if="!engagementStore.earnedBadges.length" class="muted">完成任务后点亮勋章</p>
            </div>
          </article>
        </aside>
      </div>
    </DataState>
  </section>
</template>
