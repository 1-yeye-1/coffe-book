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
const categoryCards = [
  { label: "全部", icon: "▦", desc: "全部类型活动" },
  { label: "读书会", icon: "▰", desc: "好书共读交流" },
  { label: "咖啡课堂", icon: "☕", desc: "咖啡文化体验" },
  { label: "城市沙龙", icon: "◉", desc: "主题交流沙龙" },
  { label: "比赛赛事", icon: "♕", desc: "写作摄影绘画" }
];
const demoActivities = [
  { id: "demo-act-1", title: "周末读书沙龙：城市与记忆", description: "围绕城市文学作品展开共读与讨论。", date: "2026-06-13", time: "19:30", location: "咖啡书屋 A 区", applied: 18, capacity: 32, status: "open" },
  { id: "demo-act-2", title: "精品咖啡手冲课堂", description: "学习水温、研磨度和萃取时间对风味的影响。", date: "2026-06-15", time: "15:00", location: "咖啡吧台", applied: 22, capacity: 28, status: "open" },
  { id: "demo-act-3", title: "城市写作开放麦", description: "用十分钟分享一段属于自己的城市故事。", date: "2026-06-20", time: "20:00", location: "交流区", applied: 26, capacity: 40, status: "open" },
  { id: "demo-act-4", title: "咖啡拉花友谊赛", description: "面向会员开放的小型拉花挑战活动。", date: "2026-06-27", time: "14:30", location: "咖啡吧台", applied: 20, capacity: 20, status: "closed" }
];
const activityPool = computed(() => {
  const realActivities = siteStore.activities || [];
  return realActivities.length >= 6 ? realActivities : [...realActivities, ...demoActivities].slice(0, 8);
});

const filteredActivities = computed(() => {
  const keyword = query.value.trim().toLowerCase();
  return activityPool.value.filter((activity, index) => {
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
const upcoming = computed(() => [...activityPool.value].slice(0, 4));
const pastReviews = computed(() => [...activityPool.value].slice(-3).reverse());
const totalApplied = computed(() => activityPool.value.reduce((sum, item) => sum + Number(item.applied || 0), 0));
const hotActivities = computed(() => [...activityPool.value]
  .sort((a, b) => progress(b) - progress(a))
  .slice(0, 3));

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
  if (String(activity.id || "").startsWith("demo-act")) {
    showToast("演示活动仅用于前端展示");
    return;
  }
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
  const date = activityDate(activity);
  const today = new Date("2026-06-08T00:00:00+08:00");
  const diffDays = date ? Math.ceil((date - today) / 86400000) : 8;
  if (activity.status === "closed" || Number(activity.applied || 0) >= Number(activity.capacity || 0) || diffDays < 0) {
    return { label: "已结束", type: "default" };
  }
  if (diffDays === 0) return { label: "进行中", type: "success" };
  if (diffDays <= 7) return { label: "即将开始", type: "warning" };
  return { label: "报名中", type: "success" };
}

function activityCategory(activity, index = 0) {
  if (activity.title?.includes("咖啡") || activity.description?.includes("咖啡")) return "咖啡课堂";
  if (activity.title?.includes("赛") || activity.title?.includes("比赛")) return "比赛赛事";
  const numericId = Number(activity.id);
  const fallbackIndex = Number.isFinite(numericId) ? numericId : index;
  return categories[(fallbackIndex % 3) + 1] || "读书会";
}

function showToast(text, type = "success") {
  toastType.value = type;
  message.value = text;
  setTimeout(() => { message.value = ""; }, 1800);
}

function activityDate(activity) {
  if (!activity.date) return null;
  const parsed = new Date(`${activity.date}T00:00:00+08:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function coverImage(activity, index = 0) {
  if (activity.cover || activity.image) return activity.cover || activity.image;
  return eventPlaceholder(index, activityCategory(activity, index));
}

function eventPlaceholder(index = 0, category = "活动") {
  const palettes = [
    ["#fff4e6", "#c9853e", "#4a2c17"],
    ["#f6eadc", "#a66a35", "#2d1d14"],
    ["#f8efe5", "#d6a052", "#5a3824"],
    ["#eef4e8", "#8ab36b", "#4a2c17"]
  ];
  const [base, mid, deep] = palettes[index % palettes.length];
  const label = category || "活动";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="580" viewBox="0 0 900 580">
    <defs>
      <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
        <stop stop-color="${base}"/>
        <stop offset=".62" stop-color="${mid}"/>
        <stop offset="1" stop-color="${deep}"/>
      </linearGradient>
    </defs>
    <rect width="900" height="580" fill="url(#g)"/>
    <circle cx="716" cy="116" r="118" fill="#fffdf8" opacity=".24"/>
    <rect x="120" y="124" width="390" height="250" rx="30" fill="#fffdf8" opacity=".44"/>
    <path d="M184 278c76-54 168-62 266-18" fill="none" stroke="${deep}" stroke-width="26" stroke-linecap="round" opacity=".2"/>
    <circle cx="244" cy="204" r="46" fill="#fffdf8" opacity=".5"/>
    <text x="120" y="454" fill="#fffdf8" font-family="Arial, sans-serif" font-size="48" font-weight="900">Coffee Book</text>
    <text x="120" y="506" fill="#4a2c17" font-family="Arial, sans-serif" font-size="32" font-weight="900">${label}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function imageFallback(event) {
  event.currentTarget.classList.add("image-placeholder-active");
  event.currentTarget.src = eventPlaceholder(1, "活动");
}

function leftSeats(activity) {
  return Math.max(0, Number(activity.capacity || 0) - Number(activity.applied || 0));
}

function collect(activity) {
  showToast(`${activity.title} 已加入收藏`);
}

function dateLabel(activity) {
  const date = String(activity.date || "待定");
  return date.includes("-") ? date.slice(5).replace("-", "月") + "日" : date;
}
</script>

<template>
  <section class="section activities-page-pro" data-testid="activities-page">
    <BaseToast :visible="Boolean(message)" :message="message" :type="toastType" />

    <div class="activities-hero-final">
      <div class="activities-hero-copy">
        <p class="eyebrow">Events & Contests</p>
        <h1>活动赛事</h1>
        <p>参与丰富多彩的咖啡与阅读活动，遇见志同道合的朋友。</p>
        <label class="activities-hero-search">
          <input v-model.trim="query" type="search" placeholder="搜索活动、赛事、主题或地点..." />
          <button type="button">搜索</button>
        </label>
        <div class="activities-hero-stats">
          <span>活动 {{ activityPool.length }}</span>
          <span>报名 {{ totalApplied }}</span>
          <span>开放 {{ activityPool.filter(canApply).length }}</span>
        </div>
      </div>
      <div v-if="highlighted" class="activities-hero-card">
        <img :src="coverImage(highlighted, 0)" :alt="highlighted.title" @error="imageFallback" />
        <StatusBadge :label="statusInfo(highlighted).label" :type="statusInfo(highlighted).type" />
        <strong>{{ highlighted.title }}</strong>
        <span>{{ highlighted.date }} {{ highlighted.time || "" }} · {{ highlighted.location || "咖啡书屋" }}</span>
        <RouterLink class="btn ghost" :to="`/activities/${highlighted.id}`">查看详情</RouterLink>
      </div>
    </div>

    <div class="activity-category-strip">
      <button
        v-for="item in categoryCards"
        :key="item.label"
        type="button"
        :class="{ active: activeCategory === item.label }"
        @click="activeCategory = item.label"
      >
        <span>{{ item.icon }}</span>
        <b>{{ item.label }}</b>
        <small>{{ item.desc }}</small>
      </button>
    </div>

    <p v-if="error" class="form-error">{{ error }}</p>

    <div class="activities-layout-final">
      <div class="business-main">
        <div class="activity-feed-head">
          <div>
            <h2>精选活动</h2>
            <p class="lead">咖啡课堂、读书分享、城市沙龙与主题赛事。</p>
          </div>
          <div class="activity-feed-actions">
            <StatusBadge :label="`${filteredActivities.length} 场活动`" type="accent" />
            <select aria-label="活动排序">
              <option>最新发布</option>
              <option>报名最多</option>
              <option>即将开始</option>
            </select>
          </div>
        </div>

        <div v-if="filteredActivities.length" class="event-grid-pro">
          <article v-for="(activity, index) in filteredActivities" :key="activity.id" class="event-card-pro">
            <RouterLink class="event-cover-link" :to="`/activities/${activity.id}`">
              <img :src="coverImage(activity, index)" :alt="activity.title" @error="imageFallback" />
              <StatusBadge :label="statusInfo(activity).label" :type="statusInfo(activity).type" />
              <button type="button" aria-label="收藏活动" @click.prevent="collect(activity)">♡</button>
            </RouterLink>
            <div class="event-card-pro__body">
              <div class="event-card-pro__head">
                <StatusBadge :label="activityCategory(activity, index)" type="accent" />
                <span>{{ dateLabel(activity) }} {{ activity.time || "" }}</span>
              </div>
              <RouterLink class="event-title-link" :to="`/activities/${activity.id}`">
                {{ activity.title }}
              </RouterLink>
              <p>{{ activity.description || "查看详情了解活动安排。" }}</p>
              <div class="event-info-grid">
                <span>时间 {{ activity.date || "待定" }} {{ activity.time || "" }}</span>
                <span>地点 {{ activity.location || "咖啡书屋" }}</span>
              </div>
              <div class="progress-block">
                <div>
                  <span>报名进度</span>
                  <b>{{ activity.applied || 0 }}/{{ activity.capacity || 0 }} 人</b>
                </div>
                <div class="mini-progress"><i :style="{ width: `${progress(activity)}%` }"></i></div>
                <small>剩余名额 {{ leftSeats(activity) }} 人 · {{ progress(activity) }}%</small>
              </div>
              <div class="event-tag-row">
                <span>提前报名 {{ activity.earlyStart || "待公布" }}</span>
                <span>直接报名 {{ activity.registrationStart || "待公布" }}</span>
              </div>
              <div class="actions event-actions">
                <RouterLink class="btn ghost" :to="`/activities/${activity.id}`">查看详情</RouterLink>
                <button class="btn" type="button" :disabled="!canApply(activity)" @click="apply(activity, 'regular')">立即报名</button>
              </div>
            </div>
          </article>
        </div>

        <EmptyState v-else title="暂无匹配活动" description="换一个分类或关键词再试试。" />

        <section class="past-activity-section">
          <div class="section-head compact-head">
            <h2>往期精彩回顾</h2>
            <RouterLink to="/activities">更多</RouterLink>
          </div>
          <div class="past-activity-grid">
            <article v-for="(item, index) in pastReviews" :key="item.id" class="past-activity-card">
              <img :src="coverImage(item, index + 3)" :alt="item.title" @error="imageFallback" />
              <div>
                <strong>{{ item.title }}</strong>
                <span>{{ item.date }} · {{ item.applied || 0 }} 人参与</span>
              </div>
            </article>
          </div>
        </section>
      </div>

      <aside class="business-sidebar activities-sidebar-final">
        <div class="side-panel activity-highlight-panel">
          <h3>活动亮点</h3>
          <div class="activity-highlight-row">
            <span>▣</span>
            <div><b>专业指导</b><small>行业专家亲自指导，品质保证</small></div>
          </div>
          <div class="activity-highlight-row">
            <span>♢</span>
            <div><b>小众精品</b><small>精选小众活动，深度体验</small></div>
          </div>
          <div class="activity-highlight-row">
            <span>◌</span>
            <div><b>社群互动</b><small>结识同好，拓展人脉圈</small></div>
          </div>
        </div>
        <div v-if="highlighted" class="side-panel activity-cta-card">
          <h3>举办活动</h3>
          <p>在咖啡书屋分享你的想法</p>
          <RouterLink class="btn" :to="`/activities/${highlighted.id}`">立即申请</RouterLink>
        </div>
        <div class="side-panel">
          <h3>热门活动推荐</h3>
          <RouterLink v-for="(item, index) in hotActivities" :key="item.id" class="activity-mini-row" :to="`/activities/${item.id}`">
            <img :src="coverImage(item, index + 5)" :alt="item.title" @error="imageFallback" />
            <span>
              <b>{{ item.title }}</b>
              <small>{{ item.date }} · {{ item.location || "咖啡书屋" }}</small>
            </span>
            <StatusBadge :label="statusInfo(item).label" :type="statusInfo(item).type" />
          </RouterLink>
        </div>
        <div class="side-panel">
          <h3>即将开始</h3>
          <RouterLink v-for="item in upcoming" :key="item.id" class="activity-mini-row compact" :to="`/activities/${item.id}`">
            <span>
              <b>{{ item.title }}</b>
              <small>{{ item.date }} {{ item.time || "" }}</small>
            </span>
            <StatusBadge :label="statusInfo(item).label" :type="statusInfo(item).type" />
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
