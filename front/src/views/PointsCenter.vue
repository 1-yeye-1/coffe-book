<script setup>
import { computed, onMounted, ref } from "vue";
import { request } from "@/api";
import DataState from "@/components/DataState.vue";
import BaseToast from "@/components/front/BaseToast.vue";
import StatusBadge from "@/components/front/StatusBadge.vue";
import { useCommercialStore } from "@/stores/commercial";
import { useEngagementStore } from "@/stores/engagement";
import { useUserStore } from "@/stores/user";

const commercialStore = useCommercialStore();
const engagementStore = useEngagementStore();
const userStore = useUserStore();
const loading = ref(false);
const error = ref("");
const loadingReward = ref("");
const toastMessage = ref("");
const toastType = ref("success");

const member = computed(() => userStore.member);
const membership = computed(() => member.value?.membership || {});
const memberCoupons = computed(() => commercialStore.unusedCoupons.slice(0, 3));
const checkInSummary = computed(() => engagementStore.checkIn || {});
const earnedBadges = computed(() => engagementStore.earnedBadges.slice(0, 4));
const rewards = computed(() => membership.value.rewards || []);
const pointValue = computed(() => (Number(member.value?.points || 0) / 10).toFixed(1));
const annualPoints = computed(() => Math.max(Number(member.value?.points || 0), Number(membership.value.current || 0) * 2));
const progressPercent = computed(() => {
  const target = Number(membership.value.target || 1);
  const current = Number(membership.value.current || 0);
  return Math.min(100, Math.round((current / target) * 100));
});
const quickBenefits = [
  { icon: "☕", title: "积分兑换", desc: "兑换咖啡券" },
  { icon: "▣", title: "抵扣现金", desc: "下单可抵扣" },
  { icon: "◎", title: "参与活动", desc: "活动优先权" },
  { icon: "♢", title: "会员特权", desc: "专属折扣" }
];
const rights = [
  { icon: "▣", title: "积分抵现", desc: "最高可抵订单金额 50%" },
  { icon: "☕", title: "积分兑换", desc: "兑换咖啡、周边和优惠券" },
  { icon: "★", title: "会员活动", desc: "积分可参与专属活动" },
  { icon: "◇", title: "生日礼包", desc: "生日当月双倍积分" },
  { icon: "✓", title: "优先体验", desc: "新品优先试用资格" }
];
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
    await Promise.allSettled([
      userStore.fetchMember(),
      commercialStore.fetchMemberLevel(),
      commercialStore.fetchMemberCoupons(),
      engagementStore.fetchTasks(),
      engagementStore.fetchBadges()
    ]);
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
    await engagementStore.fetchTasks();
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
  <section class="section points-page-pro" data-testid="points-page">
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
      <div class="points-hero-final">
        <div class="points-hero-copy">
          <p class="eyebrow">Member Points</p>
          <h1>积分中心</h1>
          <p>每一次互动，都是积分的积累。用积分兑换咖啡、周边和会员专属权益。</p>
        </div>
        <div class="points-balance-card">
          <span>当前可用积分</span>
          <strong>{{ member?.points || 0 }}</strong>
          <small>积分价值约 ¥{{ pointValue }}</small>
          <button class="btn" type="button" :disabled="membership.checkedInToday" @click="checkIn">
            {{ membership.checkedInToday ? "已签到" : "立即签到" }}
          </button>
        </div>
      </div>

      <div class="points-overview-grid">
        <article class="points-value-card">
          <p class="eyebrow">Points Value</p>
          <h3>1 积分 = ¥0.1</h3>
          <div class="points-benefit-icons">
            <span v-for="item in quickBenefits" :key="item.title">
              <b>{{ item.icon }}</b>
              <small>{{ item.title }}</small>
            </span>
          </div>
        </article>
        <article class="points-member-card">
          <div>
            <p class="eyebrow">{{ membership.level || member?.level || "普通会员" }}</p>
            <h3>{{ membership.level || member?.level || "普通会员" }}会员</h3>
          </div>
          <div class="member-growth-bar">
            <span :style="{ width: `${progressPercent}%` }"></span>
          </div>
          <p>成长值 {{ membership.current || membership.levelProgress || 0 }} / {{ membership.target || 1000 }}</p>
          <button class="btn ghost" type="button" @click="showToast('会员权益已展示在下方')">查看会员权益</button>
        </article>
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
            <p class="muted">当前成长值 {{ membership.levelProgress || membership.current || 0 }}，距离下一等级还需 {{ membership.need || 0 }}。</p>
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
                <div class="task-card-icon">{{ task.title.slice(0, 1) }}</div>
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
                    <button class="btn" type="button" :disabled="(member?.points || 0) < reward.cost || loadingReward === reward.id" @click="redeem(reward)">
                      {{ loadingReward === reward.id ? "兑换中..." : (member?.points || 0) < reward.cost ? "积分不足" : "立即兑换" }}
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
            <div class="points-rights-list">
              <div v-for="benefit in rights" :key="benefit.title">
                <span>{{ benefit.icon }}</span>
                <b>{{ benefit.title }}</b>
                <small>{{ benefit.desc }}</small>
              </div>
            </div>
          </article>

          <article class="card member-rights-card">
            <h3>会员等级权益</h3>
            <div class="points-rights-list">
              <div>
                <span>折</span>
                <b>{{ Number((membership.discountRate || 1) * 10).toFixed(1) }} 折</b>
                <small>下单时自动展示会员折扣</small>
              </div>
              <div>
                <span>倍</span>
                <b>{{ membership.pointsMultiplier || 1 }} 倍积分</b>
                <small>支付确认后按倍率返积分</small>
              </div>
              <div>
                <span>先</span>
                <b>优先 {{ membership.activityPriority || 0 }} 次</b>
                <small>热门活动优先报名权益</small>
              </div>
            </div>
          </article>

          <article class="card point-record-card">
            <h3>我的优惠券</h3>
            <div class="point-record-list">
              <p v-for="coupon in memberCoupons" :key="coupon.userCouponId">
                <span>
                  <strong>{{ coupon.name }}</strong>
                  <small>满 {{ coupon.threshold || 0 }} 可用 · {{ coupon.validTo }} 到期</small>
                </span>
                <b class="success">{{ coupon.type === "member_exclusive" && Number(coupon.value) < 1 ? `${Number(coupon.value * 10).toFixed(1)}折` : `￥${coupon.value}` }}</b>
              </p>
              <p v-if="!memberCoupons.length" class="muted">暂无可用优惠券</p>
            </div>
          </article>

          <article class="card point-record-card">
            <h3>连续签到</h3>
            <div class="point-record-list">
              <p>
                <span>
                  <strong>{{ checkInSummary.streak || 0 }} 天</strong>
                  <small>{{ checkInSummary.checkedInToday ? "今日已签到" : "今日待签到" }}</small>
                </span>
                <b class="success">签到</b>
              </p>
              <p v-for="reward in (checkInSummary.rewards || []).slice(0, 3)" :key="reward.days">
                <span>
                  <strong>连续 {{ reward.label }}</strong>
                  <small>奖励预览</small>
                </span>
                <b class="success">+{{ reward.points }}</b>
              </p>
            </div>
          </article>

          <article class="card point-record-card">
            <h3>我的成就</h3>
            <div class="point-record-list">
              <p v-for="badge in earnedBadges" :key="badge.id">
                <span>
                  <strong>{{ badge.name }}</strong>
                  <small>{{ badge.description }}</small>
                </span>
                <b class="success">已获得</b>
              </p>
              <p v-if="!earnedBadges.length" class="muted">完成任务后点亮成就</p>
            </div>
            <RouterLink class="btn ghost" to="/badges">查看勋章墙</RouterLink>
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
            <p class="muted">本年度累计积分 {{ annualPoints }}，等级越高兑换权益越丰富。</p>
          </article>
        </aside>
      </div>

      <section class="points-rights-band">
        <article v-for="benefit in rights" :key="`band-${benefit.title}`">
          <span>{{ benefit.icon }}</span>
          <strong>{{ benefit.title }}</strong>
          <small>{{ benefit.desc }}</small>
        </article>
      </section>
    </DataState>
  </section>
</template>
