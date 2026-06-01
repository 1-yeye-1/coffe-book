<script setup>
import { computed, onMounted, ref } from "vue";
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();
const message = ref("");
const member = computed(() => userStore.member);
const percent = computed(() => {
  const membership = member.value?.membership;
  if (!membership?.target) return 100;
  return Math.min(100, Math.round((membership.current / membership.target) * 100));
});

onMounted(() => userStore.fetchMember());

async function checkIn() {
  const data = await import("@/api").then(({ request }) => request("/api/member/check-in", { method: "POST", body: "{}" }));
  userStore.member = data;
  message.value = "签到成功，等级度和积分已增加";
}
</script>

<template>
  <section v-if="member" class="section">
    <div class="section-head"><div><h2>会员中心</h2><p class="lead">查看当前等级、下一等级、等级度、每日签到和会员权益。</p></div></div>
    <div class="member-hero card">
      <div>
        <span class="status">{{ member.membership.level }}</span>
        <h3>{{ member.name }}</h3>
        <p class="muted">当前等级度 {{ member.membership.levelProgress }}，{{ member.membership.need ? `距离 ${member.membership.nextLevel} 还差 ${member.membership.need} 等级度` : "已经达到最高等级" }}</p>
        <div class="progress-track"><span :style="{ width: `${percent}%` }"></span></div>
        <div class="post-meta"><span>当前：{{ member.membership.level }}</span><span>下一等级：{{ member.membership.nextLevel }}</span></div>
      </div>
      <div class="member-actions">
        <div class="metric"><span class="muted">可用积分</span><strong>{{ member.points }}</strong><span>可在积分中心兑换权益</span></div>
        <button class="btn" type="button" :disabled="member.membership.checkedInToday" @click="checkIn">{{ member.membership.checkedInToday ? "今日已签到" : "今日签到" }}</button>
        <p v-if="message" class="toast-inline">{{ message }}</p>
      </div>
    </div>
    <div class="grid reward-grid member-shortcuts">
      <RouterLink class="card reward-card" to="/points"><h3>积分中心</h3><p class="muted">兑换咖啡券、折扣券和会员权益。</p></RouterLink>
      <RouterLink class="card reward-card" to="/gifts"><h3>我的礼品</h3><p class="muted">查看积分兑换后的礼券和核销状态。</p></RouterLink>
      <RouterLink class="card reward-card" to="/favorites"><h3>我的收藏</h3><p class="muted">保存喜欢的书籍、商品、活动和咖啡。</p></RouterLink>
      <RouterLink class="card reward-card" to="/notes"><h3>我的笔记</h3><p class="muted">记录阅读摘抄、课程要点和到店灵感。</p></RouterLink>
      <RouterLink class="card reward-card" to="/notifications"><h3>消息通知</h3><p class="muted">查看订单、签到、兑换和社区消息。</p></RouterLink>
    </div>
    <div class="grid level-grid">
      <article v-for="level in member.membership.allLevels" :key="level.name" class="card level-card" :class="{ active: level.name === member.membership.level }">
        <h3>{{ level.name }}</h3>
        <p class="muted">{{ level.next ? `${level.min} - ${level.next - 1} 等级度` : `${level.min}+ 等级度` }}</p>
        <p class="level-inheritance">{{ level.inheritedFrom?.length ? `包含 ${level.inheritedFrom.join("、")}全部权益` : "基础会员权益" }}</p>
        <p v-for="item in level.benefits" :key="item">{{ item }}</p>
      </article>
    </div>
  </section>
</template>
