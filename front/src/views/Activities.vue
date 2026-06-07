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
const message = ref("");
const toastType = ref("success");
const error = ref("");
const activeCategory = ref("全部");
const query = ref("");

const categories = ["全部", "读书会", "咖啡课堂", "城市沙龙", "比赛赛事"];

const filteredActivities = computed(() => {
  const keyword = query.value.trim().toLowerCase();
  return siteStore.activities.filter((activity, index) => {
    const matchedText = !keyword || [activity.title, activity.description, activity.location]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .includes(keyword);
    const matchedCategory = activeCategory.value === "全部" || activityCategory(activity, index) === activeCategory.value;
    return matchedText && matchedCategory;
  });
});

const highlighted = computed(() => filteredActivities.value.slice(0, 1)[0]);
const upcoming = computed(() => [...siteStore.activities].slice(0, 4));
const pastReviews = computed(() => [...siteStore.activities].slice(-3).reverse());
const totalApplied = computed(() => siteStore.activities.reduce((sum, item) => sum + Number(item.applied || 0), 0));

onMounted(() => {
  if (!siteStore.activities.length) siteStore.fetchActivities();
});

async function apply(activity, kind) {
  message.value = "";
  error.value = "";
  if (activity.status && activity.status !== "open") {
    showToast("活动报名已关闭", "warning");
    return;
  }
  if (Number(activity.applied || 0) >= Number(activity.capacity || 0)) {
    showToast("活动人数已满", "warning");
    return;
  }
  if (kind === "early" && !userStore.isLoggedIn) return router.push({ name: "login", query: { redirect: "/activities" } });
  if (kind === "regular" && !userStore.isLoggedIn) return router.push(`/activities/${activity.id}`);
  try {
    await siteStore.applyActivity(activity.id, { kind, people: 1, phone: userStore.user?.phone || "" });
    showToast(kind === "early" ? "提前报名成功" : "报名成功");
  } catch (err) {
    error.value = err.message;
    showToast(err.message, "danger");
  }
}

function canApply(activity) {
  return (!activity.status || activity.status === "open") && Number(activity.applied || 0) < Number(activity.capacity || 0);
}

function progress(activity) {
  return Math.min(100, Math.round((Number(activity.applied || 0) / Math.max(1, Number(activity.capacity || 0))) * 100));
}

function statusInfo(activity) {
  if (!canApply(activity)) {
    if (Number(activity.applied || 0) >= Number(activity.capacity || 0)) return { label: "名额已满", type: "danger" };
    return { label: "已结束", type: "default" };
  }
  if (progress(activity) > 70) return { label: "火热报名", type: "warning" };
  return { label: "报名中", type: "success" };
}

function activityCategory(activity, index = 0) {
  if (activity.title?.includes("咖啡") || activity.description?.includes("咖啡")) return "咖啡课堂";
  if (activity.title?.includes("赛") || activity.title?.includes("比赛")) return "比赛赛事";
  return categories[(Number(activity.id || index) % 3) + 1];
}

function showToast(text, type = "success") {
  toastType.value = type;
  message.value = text;
  setTimeout(() => { message.value = ""; }, 1800);
}
</script>

<template>
  <section class="section activities-page-pro">
    <BaseToast :visible="Boolean(message)" :message="message" :type="toastType" />

    <div class="business-hero business-hero--activities">
      <div>
        <p class="eyebrow">Events & Contests</p>
        <h1>活动赛事</h1>
        <p>活动报名、提前报名权益和报名人数仍使用原接口，视觉升级为活动日历、进度卡和右侧运营推荐。</p>
        <div class="hero-chip-row">
          <span>活动 {{ siteStore.activities.length }}</span>
          <span>报名 {{ totalApplied }}</span>
          <span>开放 {{ siteStore.activities.filter(canApply).length }}</span>
        </div>
      </div>
      <div v-if="highlighted" class="hero-glass-card">
        <strong>{{ highlighted.title }}</strong>
        <span>{{ highlighted.date }} {{ highlighted.time || "" }}</span>
        <RouterLink class="btn ghost" :to="`/activities/${highlighted.id}`">查看详情</RouterLink>
      </div>
    </div>

    <p v-if="error" class="form-error">{{ error }}</p>

    <div class="activities-layout-pro">
      <aside class="filter-rail">
        <div class="filter-card">
          <label class="field">
            <span>搜索活动</span>
            <input v-model.trim="query" type="search" placeholder="活动名称、地点或简介" />
          </label>
        </div>
        <div class="filter-card">
          <h3>活动分类</h3>
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
        <div class="filter-card calendar-card">
          <h3>活动日历</h3>
          <div v-for="item in upcoming" :key="item.id" class="calendar-row">
            <b>{{ String(item.date || "").slice(5) || "待定" }}</b>
            <span>{{ item.title }}</span>
          </div>
        </div>
      </aside>

      <div class="business-main">
        <div class="section-head compact-head">
          <div>
            <h2>活动列表</h2>
            <p class="lead">支持活动分类、报名进度、活动状态和快捷报名。</p>
          </div>
          <StatusBadge :label="`${filteredActivities.length} 场活动`" type="accent" />
        </div>

        <div v-if="filteredActivities.length" class="event-grid-pro">
          <article v-for="(activity, index) in filteredActivities" :key="activity.id" class="event-card-pro">
            <div class="event-card-pro__head">
              <StatusBadge :label="activityCategory(activity, index)" type="accent" />
              <StatusBadge :label="statusInfo(activity).label" :type="statusInfo(activity).type" />
            </div>
            <h3>{{ activity.title }}</h3>
            <p>{{ activity.description || "查看详情了解活动安排。" }}</p>
            <div class="event-info-grid">
              <span>{{ activity.date }}</span>
              <span>{{ activity.time || "时间待定" }}</span>
              <span>{{ activity.location || "咖啡书屋" }}</span>
            </div>
            <div class="progress-block">
              <div><span>报名进度</span><b>{{ activity.applied }}/{{ activity.capacity }}</b></div>
              <div class="mini-progress"><i :style="{ width: `${progress(activity)}%` }"></i></div>
            </div>
            <div class="event-signup-times">
              <span>提前报名：{{ activity.earlyStart || "待公布" }}</span>
              <span>直接报名：{{ activity.registrationStart || "待公布" }}</span>
            </div>
            <div class="actions event-actions">
              <RouterLink class="btn ghost" :to="`/activities/${activity.id}`">查看详情</RouterLink>
              <button class="btn" type="button" :disabled="!canApply(activity)" @click="apply(activity, 'regular')">直接报名</button>
              <button class="btn secondary" type="button" :disabled="!canApply(activity)" @click="apply(activity, 'early')">提前报名</button>
            </div>
          </article>
        </div>

        <EmptyState v-else title="暂无匹配活动" description="换一个分类或关键词再试试。" />
      </div>

      <aside class="business-sidebar">
        <div class="side-panel">
          <h3>活动亮点</h3>
          <p>会员可使用提前报名权益，热门活动会显示进度提示，报名提交继续写入原活动报名接口。</p>
        </div>
        <div class="side-panel">
          <h3>即将开始</h3>
          <RouterLink v-for="item in upcoming" :key="item.id" class="activity-mini-row" :to="`/activities/${item.id}`">
            <span>{{ item.title }}</span>
            <b>{{ item.date }}</b>
          </RouterLink>
        </div>
        <div class="side-panel">
          <h3>往期回顾</h3>
          <div v-for="item in pastReviews" :key="item.id" class="rank-row">
            <span>{{ item.title }}</span>
            <small>{{ item.applied || 0 }} 人参与</small>
          </div>
        </div>
      </aside>
    </div>
  </section>
</template>
