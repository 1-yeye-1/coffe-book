<script setup>
import { onMounted } from "vue";
import { useRouter } from "vue-router";
import { useSiteStore } from "@/stores/site";
import { useUserStore } from "@/stores/user";

const router = useRouter();
const siteStore = useSiteStore();
const userStore = useUserStore();

onMounted(() => {
  if (!siteStore.activities.length) siteStore.fetchActivities();
});

async function apply(activity, kind) {
  if (kind === "early" && !userStore.isLoggedIn) return router.push({ name: "login", query: { redirect: "/activities" } });
  if (kind === "regular" && !userStore.isLoggedIn) return router.push(`/activities/${activity.id}`);
  await siteStore.applyActivity(activity.id, { kind, people: 1, phone: userStore.user?.phone || "" });
}
</script>

<template>
  <section class="section">
    <div class="section-head"><div><h2>活动赛事</h2><p class="lead">查看完整时间安排，也可以按会员等级使用每月提前报名次数。</p></div></div>
    <div class="grid event-grid">
      <article v-for="activity in siteStore.activities" :key="activity.id" class="card event-card">
        <div class="post-meta"><strong>{{ activity.title }}</strong><span>{{ activity.date }}</span></div>
        <p>{{ activity.time || "时间待定" }} · {{ activity.location || "咖啡书屋" }}</p>
        <p class="muted">{{ activity.description || "查看详情了解活动安排。" }}</p>
        <div class="event-signup-times">
          <span>提前报名：{{ activity.earlyStart || "待公布" }}</span>
          <span>直接报名：{{ activity.registrationStart || "待公布" }}</span>
        </div>
        <p class="muted">报名 {{ activity.applied }}/{{ activity.capacity }}</p>
        <div class="actions event-actions">
          <RouterLink class="btn ghost" :to="`/activities/${activity.id}`">查看详情</RouterLink>
          <button class="btn" type="button" @click="apply(activity, 'regular')">直接报名</button>
          <button class="btn secondary" type="button" @click="apply(activity, 'early')">提前报名</button>
        </div>
      </article>
    </div>
  </section>
</template>
