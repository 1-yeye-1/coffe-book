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

const gifts = computed(() => userStore.member?.gifts || []);
const filteredGifts = computed(() => gifts.value.filter((gift) => activeTab.value === "all" || giftState(gift).value === activeTab.value));
const giftStats = computed(() => [
  { label: "礼品总数", value: gifts.value.length, type: "accent" },
  { label: "未使用", value: gifts.value.filter((gift) => giftState(gift).value === "unused").length, type: "success" },
  { label: "已使用", value: gifts.value.filter((gift) => giftState(gift).value === "used").length, type: "default" },
  { label: "已过期", value: gifts.value.filter((gift) => giftState(gift).value === "expired").length, type: "danger" }
]);
const records = computed(() => gifts.value.map((gift) => ({
  id: `${gift.id}-record`,
  title: gift.title,
  type: gift.type || "会员礼品",
  redeemedAt: formatTime(gift.redeemedAt),
  usedAt: formatTime(gift.usedAt),
  state: giftState(gift)
})));

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

async function useGift(gift) {
  if (isUsed(gift) || isExpired(gift)) return;
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
  <section class="section gift-page-pro">
    <BaseToast :visible="Boolean(toastMessage)" :message="toastMessage" :type="toastType" />

    <div class="member-hero-pro gift-hero">
      <div>
        <p class="eyebrow">My Gifts</p>
        <h2>我的礼品</h2>
        <p class="lead">管理积分兑换后的咖啡券、优惠券和活动权益，支持查看详情、兑换记录与模拟核销。</p>
      </div>
      <RouterLink class="btn ghost" to="/points">去积分中心兑换</RouterLink>
    </div>

    <div class="member-stat-grid">
      <article v-for="item in giftStats" :key="item.label" class="card member-stat-card">
        <StatusBadge :label="item.label" :type="item.type" />
        <strong>{{ item.value }}</strong>
      </article>
    </div>

    <article class="card member-filter-card">
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
              <div class="gift-card-head">
                <StatusBadge :label="gift.type || '会员礼券'" type="accent" />
                <StatusBadge :label="giftState(gift).label" :type="giftState(gift).type" />
              </div>
              <h3>{{ gift.title }}</h3>
              <p>{{ gift.desc }}</p>
              <div class="gift-code-preview">
                <img :src="qrUrl(gift)" alt="模拟礼券二维码" />
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
          <h3>兑换记录</h3>
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
            <span>本页为门店核销模拟展示，真实优惠金额与核销以系统记录为准。</span>
          </div>
        </aside>
      </div>
    </DataState>

    <AdminDrawer :open="Boolean(activeGift)" :title="activeGift?.title || '礼品详情'" @close="activeGift = null">
      <div v-if="activeGift" class="gift-detail-drawer">
        <img class="gift-detail-qr" :src="qrUrl(activeGift)" alt="模拟核销二维码" />
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
