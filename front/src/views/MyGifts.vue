<script setup>
import { computed, onMounted, ref } from "vue";
import AdminDrawer from "@/components/admin/AdminDrawer.vue";
import DataState from "@/components/DataState.vue";
import BaseToast from "@/components/front/BaseToast.vue";
import StatusBadge from "@/components/front/StatusBadge.vue";
import { request } from "@/api";
import { useUserStore } from "@/stores/user";

const API_BASE = import.meta.env.VITE_API_BASE || window.COFFEE_BOOK_API || "http://localhost:4173";

const userStore = useUserStore();
const activeGift = ref(null);
const activeTab = ref("all");
const loading = ref(false);
const loadingId = ref("");
const error = ref("");
const toastMessage = ref("");
const toastType = ref("success");

const demoGifts = [
  {
    id: "demo-latte-coupon",
    title: "精品拿铁兑换券",
    type: "咖啡礼券",
    desc: "可在门店兑换一杯精品拿铁，适合工作日下午茶时段使用。",
    verifyCode: "CB-LATTE-2026",
    redeemedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    expiresAt: new Date(Date.now() + 86400000 * 18).toISOString()
  },
  {
    id: "demo-reading-seat",
    title: "安静阅读区预约优先券",
    type: "预约权益",
    desc: "预约 A 区安静阅读座位时享受优先确认权益。",
    verifyCode: "CB-SEAT-A",
    redeemedAt: new Date(Date.now() - 86400000 * 6).toISOString(),
    expiresAt: new Date(Date.now() + 86400000 * 30).toISOString()
  },
  {
    id: "demo-bookmark",
    title: "咖啡书屋限定书签",
    type: "文创礼品",
    desc: "到店可领取限定金属书签一枚，数量有限。",
    verifyCode: "CB-GIFT-BOOKMARK",
    redeemedAt: new Date(Date.now() - 86400000 * 9).toISOString(),
    usedAt: new Date(Date.now() - 86400000 * 4).toISOString()
  },
  {
    id: "demo-salon",
    title: "读书沙龙报名抵扣券",
    type: "活动礼券",
    desc: "报名线下读书沙龙可抵扣部分费用。",
    verifyCode: "CB-ACT-2026",
    redeemedAt: new Date(Date.now() - 86400000 * 16).toISOString(),
    expiresAt: new Date(Date.now() - 86400000).toISOString()
  }
];

const gifts = computed(() => userStore.member?.gifts || []);
const displayGifts = computed(() => gifts.value.length ? gifts.value : demoGifts);
const filteredGifts = computed(() => displayGifts.value.filter((gift) => activeTab.value === "all" || giftState(gift).value === activeTab.value));
const giftStats = computed(() => [
  { label: "礼品总数", value: displayGifts.value.length, type: "accent" },
  { label: "未使用", value: displayGifts.value.filter((gift) => giftState(gift).value === "unused").length, type: "success" },
  { label: "已使用", value: displayGifts.value.filter((gift) => giftState(gift).value === "used").length, type: "default" },
  { label: "已过期", value: displayGifts.value.filter((gift) => giftState(gift).value === "expired").length, type: "danger" }
]);
const records = computed(() => displayGifts.value.map((gift) => ({
  id: `${gift.id}-record`,
  title: gift.title,
  type: gift.type || "会员礼品",
  redeemedAt: formatTime(gift.redeemedAt),
  usedAt: formatTime(gift.usedAt),
  state: giftState(gift)
})));
const giftTips = [
  "积分可用于兑换平台内所有礼品",
  "兑换成功后，礼品将发放到您的账户",
  "虚拟礼品凭券码到店使用",
  "实物礼品将为您包邮寄出"
];

onMounted(loadMember);

async function loadMember() {
  loading.value = true;
  error.value = "";
  try {
    await userStore.fetchMember();
  } catch (err) {
    error.value = err.message || "礼品数据加载失败";
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

function isExpired(gift) {
  if (gift.status === "已过期") return true;
  if (!gift.expiresAt) return false;
  const date = new Date(gift.expiresAt);
  return !Number.isNaN(date.getTime()) && date.getTime() < Date.now();
}

function isUsed(gift) {
  return gift.status === "已使用" || Boolean(gift.usedAt);
}

function giftState(gift) {
  if (isExpired(gift)) return { value: "expired", label: "已过期", type: "danger" };
  if (isUsed(gift)) return { value: "used", label: "已使用", type: "default" };
  return { value: "unused", label: "未使用", type: "success" };
}

function formatTime(value) {
  if (!value) return "暂无";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("zh-CN", { hour12: false });
}

function qrUrl(gift) {
  const data = gift.verifyCode || `${gift.id}-${gift.title}`;
  return `${API_BASE}/api/qr?data=${encodeURIComponent(data)}`;
}

function giftIcon(gift) {
  if (gift.type?.includes("咖啡")) return "☕";
  if (gift.type?.includes("活动")) return "◎";
  if (gift.type?.includes("预约")) return "⌖";
  if (gift.type?.includes("文创")) return "▣";
  return "礼";
}

function qrFallback(event) {
  event.currentTarget.classList.add("image-placeholder-active");
  event.currentTarget.src = qrPlaceholder();
}

function qrPlaceholder() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220">
    <rect width="220" height="220" rx="24" fill="#fffdf8"/>
    <rect x="34" y="34" width="58" height="58" rx="10" fill="#8b5e3c"/>
    <rect x="128" y="34" width="58" height="58" rx="10" fill="#8b5e3c"/>
    <rect x="34" y="128" width="58" height="58" rx="10" fill="#8b5e3c"/>
    <rect x="116" y="118" width="22" height="22" rx="4" fill="#d9b51f"/>
    <rect x="150" y="128" width="38" height="18" rx="4" fill="#8b5e3c"/>
    <rect x="118" y="158" width="18" height="38" rx="4" fill="#8b5e3c"/>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

async function useGift(gift) {
  if (isUsed(gift) || isExpired(gift)) return;
  if (String(gift.id || "").startsWith("demo-")) {
    showToast("演示礼品仅用于前端展示，不会写入后端");
    return;
  }
  error.value = "";
  loadingId.value = gift.id;
  try {
    userStore.member = await request(`/api/member/gifts/${encodeURIComponent(gift.id)}/use`, {
      method: "POST",
      body: "{}"
    });
    activeGift.value = null;
    showToast("礼券已核销，状态已同步到会员中心");
  } catch (err) {
    showToast(err.message || "礼券核销失败", "danger");
  } finally {
    loadingId.value = "";
  }
}
</script>

<template>
  <section class="section gift-page-pro" data-testid="gifts-page">
    <BaseToast :visible="Boolean(toastMessage)" :message="toastMessage" :type="toastType" />

    <div class="gift-hero-final">
      <div class="gift-hero-copy">
        <p class="eyebrow">My Gifts</p>
        <h1>我的礼品</h1>
        <p>用积分兑换心仪好礼，享受咖啡书屋的专属回馈。</p>
      </div>
      <RouterLink class="btn ghost" to="/points">去积分中心兑换</RouterLink>
    </div>

    <div class="gift-stat-strip">
      <article v-for="item in giftStats" :key="item.label" class="card member-stat-card">
        <StatusBadge :label="item.label" :type="item.type" />
        <strong>{{ item.value }}</strong>
      </article>
    </div>

    <article class="card member-filter-card gift-filter-card">
      <div class="tabs compact-tabs">
        <button type="button" :class="{ active: activeTab === 'all' }" @click="activeTab = 'all'">全部</button>
        <button type="button" :class="{ active: activeTab === 'unused' }" @click="activeTab = 'unused'">未使用</button>
        <button type="button" :class="{ active: activeTab === 'used' }" @click="activeTab = 'used'">已使用</button>
        <button type="button" :class="{ active: activeTab === 'expired' }" @click="activeTab = 'expired'">已过期</button>
      </div>
      <RouterLink class="btn ghost" to="/points">兑换更多</RouterLink>
    </article>

    <DataState
      :loading="loading"
      :error="error"
      :empty="!filteredGifts.length"
      loading-title="礼品同步中"
      empty-title="暂无对应礼品"
      description="去积分中心兑换咖啡券、优惠券或活动优先报名券后，会出现在这里。"
      @retry="loadMember"
    >
      <div class="gift-layout-pro">
        <main>
          <div class="gift-card-grid-pro">
            <article v-for="gift in filteredGifts" :key="gift.id" class="card gift-card-pro" :class="giftState(gift).value">
              <div class="gift-card-pattern"></div>
              <div class="gift-cover-icon">{{ giftIcon(gift) }}</div>
              <div class="gift-card-head">
                <StatusBadge :label="gift.type || '会员礼券'" type="accent" />
                <StatusBadge :label="giftState(gift).label" :type="giftState(gift).type" />
              </div>
              <h3>{{ gift.title }}</h3>
              <p>{{ gift.desc }}</p>
              <div class="gift-code-preview">
                <img :src="qrUrl(gift)" alt="模拟礼券二维码" @error="qrFallback" />
                <span>{{ gift.verifyCode || gift.id }}</span>
              </div>
              <div class="profile-inline-list">
                <p><span>兑换时间</span><strong>{{ formatTime(gift.redeemedAt) }}</strong></p>
                <p><span>使用时间</span><strong>{{ formatTime(gift.usedAt) }}</strong></p>
              </div>
              <div class="actions">
                <button class="btn ghost" type="button" @click="activeGift = gift">查看详情</button>
                <button class="btn" type="button" :disabled="giftState(gift).value !== 'unused' || loadingId === gift.id" @click="useGift(gift)">
                  {{ loadingId === gift.id ? "核销中..." : giftState(gift).value === "unused" ? "模拟核销" : giftState(gift).label }}
                </button>
              </div>
            </article>
          </div>
        </main>

        <aside class="card gift-record-panel">
          <div class="gift-record-head">
            <h3>兑换记录</h3>
            <RouterLink to="/points">查看全部</RouterLink>
          </div>
          <div class="gift-record-list">
            <p v-for="record in records" :key="record.id">
              <span>
                <strong>{{ record.title }}</strong>
                <small>{{ record.redeemedAt }} · {{ record.type }}</small>
              </span>
              <StatusBadge :label="record.state.label" :type="record.state.type" />
            </p>
          </div>
          <div class="summary-hint">
            <strong>兑换须知</strong>
            <span v-for="tip in giftTips" :key="tip">{{ tip }}</span>
          </div>
        </aside>
      </div>
    </DataState>

    <AdminDrawer :open="Boolean(activeGift)" :title="activeGift?.title || '礼品详情'" @close="activeGift = null">
      <div v-if="activeGift" class="gift-detail-drawer">
        <img class="gift-detail-qr" :src="qrUrl(activeGift)" alt="模拟核销二维码" @error="qrFallback" />
        <div class="status-row">
          <StatusBadge :label="activeGift.type || '会员礼券'" type="accent" />
          <StatusBadge :label="giftState(activeGift).label" :type="giftState(activeGift).type" />
        </div>
        <p class="muted">{{ activeGift.desc }}</p>
        <div class="profile-inline-list">
          <p><span>礼品编号</span><strong>{{ activeGift.verifyCode || activeGift.id }}</strong></p>
          <p><span>兑换时间</span><strong>{{ formatTime(activeGift.redeemedAt) }}</strong></p>
          <p><span>使用时间</span><strong>{{ formatTime(activeGift.usedAt) }}</strong></p>
          <p><span>有效期</span><strong>{{ formatTime(activeGift.expiresAt) }}</strong></p>
        </div>
        <button class="btn" type="button" :disabled="giftState(activeGift).value !== 'unused' || loadingId === activeGift.id" @click="useGift(activeGift)">
          {{ loadingId === activeGift.id ? "核销中..." : "模拟门店核销" }}
        </button>
      </div>
    </AdminDrawer>
  </section>
</template>
