<script setup>
import { computed, onMounted, ref } from "vue";
import { request } from "@/api";
import DataState from "@/components/DataState.vue";
import BaseToast from "@/components/front/BaseToast.vue";
import StatusBadge from "@/components/front/StatusBadge.vue";
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();
const loading = ref(false);
const error = ref("");
const loadingReward = ref("");
const toastMessage = ref("");
const toastType = ref("success");

const member = computed(() => userStore.member);
const membership = computed(() => member.value?.membership || {});
const rewards = computed(() => membership.value.rewards || []);
const progressPercent = computed(() => {
  const target = Number(membership.value.target || 1);
  const current = Number(membership.value.current || 0);
  return Math.min(100, Math.round((current / target) * 100));
});
const taskCards = computed(() => [
  {
    title: "每日签到",
    desc: membership.value.checkedInToday ? "今日已签到，明天继续领取积分。" : "签到可获得积分和成长值。",
    value: membership.value.checkedInToday ? "已完成" : "+10",
    done: membership.value.checkedInToday,
    action: "签到"
  },
  { title: "完成一笔订单", desc: "商城消费完成后按实付金额返还积分。", value: "+成长值", done: false, action: "去下单", to: "/shop" },
  { title: "记录读书笔记", desc: "把阅读心得沉淀到知识库。", value: "+5", done: (member.value?.notes || []).length > 0, action: "查看笔记", to: "/notes" },
  { title: "参与活动", desc: "报名读书会或咖啡沙龙可提升会员活跃度。", value: "+活动权益", done: (member.value?.reservations || []).length > 0, action: "看活动", to: "/activities" }
]);
const pointRecords = computed(() => [
  { title: "会员当前积分", amount: `+${member.value?.points || 0}`, desc: "来自订单、签到、兑换后的实时余额", type: "success" },
  ...((member.value?.gifts || []).slice(0, 3).map((gift) => ({
    title: `兑换 ${gift.title}`,
    amount: `-${gift.cost || "积分"}`,
    desc: formatTime(gift.redeemedAt),
    type: "warning"
  }))),
  ...((member.value?.orders || []).slice(0, 2).map((order) => ({
    title: `订单返积分 #${order.id}`,
    amount: `+${order.earnedPoints || Math.max(1, Math.floor(Number(order.total || order.payAmount || 0) / 10))}`,
    desc: formatTime(order.createdAt),
    type: "success"
  })))
]);

onMounted(loadMember);

async function loadMember() {
  loading.value = true;
  error.value = "";
  try {
    await userStore.fetchMember();
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

function showToast(message, type = "success") {
  toastMessage.value = "";
  toastType.value = type;
  window.setTimeout(() => {
    toastMessage.value = message;
    window.setTimeout(() => {
      if (toastMessage.value === message) toastMessage.value = "";
    }, 2200);
  });
}

function formatTime(value) {
  if (!value) return "最近";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("zh-CN");
}

async function checkIn() {
  try {
    userStore.member = await request("/api/member/check-in", { method: "POST", body: "{}" });
    showToast("签到成功，积分与成长值已更新");
  } catch (err) {
    showToast(err.message, "danger");
  }
}

async function redeem(reward) {
  loadingReward.value = reward.id;
  try {
    userStore.member = await request("/api/member/redeem", {
      method: "POST",
      body: JSON.stringify({ rewardId: reward.id })
    });
    showToast("兑换成功，已加入我的礼品");
  } catch (err) {
    showToast(err.message, "danger");
  } finally {
    loadingReward.value = "";
  }
}
</script>

<template>
  <section class="section points-page-pro">
    <BaseToast :visible="Boolean(toastMessage)" :message="toastMessage" :type="toastType" />

    <DataState
      :loading="loading"
      :error="error"
      :empty="!member"
      loading-title="积分数据同步中"
      empty-title="暂未获取会员积分"
      description="登录后即可查看积分、成长值和会员权益。"
      @retry="loadMember"
    >
      <div class="points-hero-pro">
        <div>
          <p class="eyebrow">Member Points</p>
          <h2>积分中心</h2>
          <p class="lead">签到、消费、参与活动都能沉淀成长值，用积分兑换咖啡券、文创优惠和活动权益。</p>
          <div class="hero-chip-row">
            <StatusBadge :label="membership.level || member.level" type="accent" />
            <StatusBadge :label="membership.checkedInToday ? '今日已签到' : '今日未签到'" :type="membership.checkedInToday ? 'success' : 'warning'" />
          </div>
        </div>
        <div class="points-balance-card">
          <span>当前积分</span>
          <strong>{{ member.points }}</strong>
          <button class="btn" type="button" :disabled="membership.checkedInToday" @click="checkIn">
            {{ membership.checkedInToday ? "已签到" : "立即签到" }}
          </button>
        </div>
      </div>

      <div class="points-layout-pro">
        <main class="points-main-stack">
          <article class="card level-progress-card">
            <div class="level-progress-head">
              <div>
                <p class="eyebrow">Growth Value</p>
                <h3>{{ membership.level }} → {{ membership.nextLevel }}</h3>
              </div>
              <strong>{{ progressPercent }}%</strong>
            </div>
            <div class="mini-progress"><span :style="{ width: `${progressPercent}%` }"></span></div>
            <p class="muted">当前成长值 {{ membership.levelProgress || 0 }}，距离下一等级还需 {{ membership.need || 0 }}。</p>
          </article>

          <section class="section-block">
            <div class="section-head compact">
              <div>
                <p class="eyebrow">Daily Tasks</p>
                <h3>做任务赚积分</h3>
              </div>
            </div>
            <div class="task-card-grid">
              <article v-for="task in taskCards" :key="task.title" class="card task-card" :class="{ done: task.done }">
                <StatusBadge :label="task.done ? '已完成' : '待完成'" :type="task.done ? 'success' : 'warning'" />
                <h3>{{ task.title }}</h3>
                <p>{{ task.desc }}</p>
                <strong>{{ task.value }}</strong>
                <button v-if="task.title === '每日签到'" class="btn ghost" type="button" :disabled="task.done" @click="checkIn">{{ task.action }}</button>
                <RouterLink v-else class="btn ghost" :to="task.to">{{ task.action }}</RouterLink>
              </article>
            </div>
          </section>

          <section class="section-block">
            <div class="section-head compact">
              <div>
                <p class="eyebrow">Exchange Mall</p>
                <h3>积分兑换推荐</h3>
              </div>
              <RouterLink class="btn ghost" to="/gifts">我的礼品</RouterLink>
            </div>
            <div class="reward-grid-pro">
              <article v-for="reward in rewards" :key="reward.id" class="card reward-card-pro">
                <div class="reward-icon">{{ reward.type?.slice(0, 1) || "礼" }}</div>
                <div>
                  <StatusBadge :label="reward.type || '会员礼品'" type="accent" />
                  <h3>{{ reward.title }}</h3>
                  <p>{{ reward.desc }}</p>
                  <div class="cart-total">
                    <strong>{{ reward.cost }} 积分</strong>
                    <button class="btn" type="button" :disabled="member.points < reward.cost || loadingReward === reward.id" @click="redeem(reward)">
                      {{ loadingReward === reward.id ? "兑换中..." : member.points < reward.cost ? "积分不足" : "立即兑换" }}
                    </button>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </main>

        <aside class="points-side-stack">
          <article class="card member-rights-card">
            <h3>积分专属权益</h3>
            <ul class="clean-list">
              <li v-for="benefit in (membership.benefits || [])" :key="benefit">{{ benefit }}</li>
            </ul>
          </article>

          <article class="card point-record-card">
            <h3>积分明细</h3>
            <div class="point-record-list">
              <p v-for="record in pointRecords" :key="`${record.title}-${record.amount}`">
                <span>
                  <strong>{{ record.title }}</strong>
                  <small>{{ record.desc }}</small>
                </span>
                <b :class="record.type">{{ record.amount }}</b>
              </p>
            </div>
          </article>

          <article class="card level-ladder-card">
            <h3>等级体系</h3>
            <div v-for="level in (membership.allLevels || [])" :key="level.name" class="level-ladder-item" :class="{ active: level.name === membership.level }">
              <span>{{ level.name }}</span>
              <strong>{{ level.min }}+</strong>
            </div>
          </article>
        </aside>
      </div>
    </DataState>
  </section>
</template>
