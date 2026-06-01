<script setup>
import { computed, onMounted, ref } from "vue";
import { request } from "@/api";
import { useUserStore } from "@/stores/user";

const API_BASE = import.meta.env.VITE_API_BASE || window.COFFEE_BOOK_API || "http://localhost:4173";

const userStore = useUserStore();
const activeGift = ref(null);
const loadingId = ref("");
const message = ref("");
const error = ref("");

const gifts = computed(() => userStore.member?.gifts || []);
const unusedCount = computed(() => gifts.value.filter((gift) => !isUsed(gift)).length);

onMounted(() => userStore.fetchMember());

function isUsed(gift) {
  return gift.status === "已使用" || Boolean(gift.usedAt);
}

function formatTime(value) {
  if (!value) return "暂无";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("zh-CN", { hour12: false });
}

function qrUrl(gift) {
  const data = gift.verifyCode || `${gift.id}-${gift.title}`;
  return `${API_BASE}/api/qr?data=${encodeURIComponent(data)}`;
}

async function useGift(gift) {
  if (isUsed(gift)) return;
  error.value = "";
  message.value = "";
  loadingId.value = gift.id;

  try {
    userStore.member = await request(`/api/member/gifts/${encodeURIComponent(gift.id)}/use`, {
      method: "POST",
      body: "{}"
    });
    message.value = "礼券已核销，状态已同步到会员中心";
    activeGift.value = null;
  } catch (err) {
    error.value = err.message || "礼券核销失败";
  } finally {
    loadingId.value = "";
  }
}
</script>

<template>
  <section class="section">
    <div class="section-head">
      <div>
        <p class="eyebrow">Member Gifts</p>
        <h2>我的礼品</h2>
        <p class="lead">展示积分兑换后的咖啡券、优惠券和活动权益，二维码为系统模拟核销码。</p>
      </div>
      <RouterLink class="btn ghost" to="/points">去积分中心兑换</RouterLink>
    </div>

    <div class="card gifts-summary">
      <div>
        <span class="muted">礼品总数</span>
        <strong>{{ gifts.length }}</strong>
      </div>
      <div>
        <span class="muted">未使用</span>
        <strong>{{ unusedCount }}</strong>
      </div>
      <div>
        <span class="muted">说明</span>
        <p>本页只做毕业设计展示与模拟核销，不接入真实优惠券或支付系统。</p>
      </div>
    </div>

    <p v-if="message" class="toast-inline">{{ message }}</p>
    <p v-if="error" class="error">{{ error }}</p>

    <div v-if="gifts.length" class="grid gift-grid">
      <article v-for="gift in gifts" :key="gift.id" class="card gift-card" :class="{ used: isUsed(gift) }">
        <div class="gift-card-head">
          <span class="status">{{ gift.type || "会员礼券" }}</span>
          <span class="status-pill" :class="isUsed(gift) ? 'done' : 'pending'">{{ isUsed(gift) ? "已使用" : "未使用" }}</span>
        </div>
        <h3>{{ gift.title }}</h3>
        <p class="muted">{{ gift.desc }}</p>
        <div class="gift-meta">
          <span>兑换时间：{{ formatTime(gift.redeemedAt) }}</span>
          <span>使用时间：{{ formatTime(gift.usedAt) }}</span>
        </div>
        <button class="gift-code" type="button" @click="activeGift = gift">
          <img :src="qrUrl(gift)" alt="模拟礼券二维码">
          <span>{{ isUsed(gift) ? "查看核销码" : "出示核销码" }}</span>
        </button>
        <div class="cart-total">
          <small class="muted">{{ gift.verifyCode || gift.id }}</small>
          <button class="btn" type="button" :disabled="isUsed(gift) || loadingId === gift.id" @click="useGift(gift)">
            {{ loadingId === gift.id ? "核销中..." : isUsed(gift) ? "已核销" : "模拟核销" }}
          </button>
        </div>
      </article>
    </div>

    <div v-else class="card empty-state">
      <h3>还没有礼品</h3>
      <p class="muted">去积分中心兑换咖啡券、优惠券或活动优先报名券后，会出现在这里。</p>
      <RouterLink class="btn" to="/points">立即去兑换</RouterLink>
    </div>

    <div v-if="activeGift" class="gift-qr-overlay" @click.self="activeGift = null">
      <div class="card gift-qr-dialog">
        <button class="link-button gift-qr-close" type="button" @click="activeGift = null">关闭</button>
        <p class="eyebrow">Simulated Verify Code</p>
        <h3>{{ activeGift.title }}</h3>
        <img :src="qrUrl(activeGift)" alt="模拟核销二维码">
        <p class="muted">{{ activeGift.verifyCode || activeGift.id }}</p>
        <button class="btn" type="button" :disabled="isUsed(activeGift) || loadingId === activeGift.id" @click="useGift(activeGift)">
          {{ isUsed(activeGift) ? "已核销" : "模拟门店核销" }}
        </button>
      </div>
    </div>
  </section>
</template>
