<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { request } from "@/api";
import DataState from "@/components/DataState.vue";
import StatusBadge from "@/components/front/StatusBadge.vue";
import BaseToast from "@/components/front/BaseToast.vue";

const categories = [
  ["all", "全部"],
  ["system", "系统"],
  ["activity", "活动"],
  ["order", "订单"],
  ["reservation", "预约"],
  ["task", "任务"],
  ["coupon", "优惠券"],
  ["growth", "成长"],
  ["recommend", "推荐"]
];

const loading = ref(false);
const error = ref("");
const items = ref([]);
const category = ref("all");
const status = ref("all");
const query = ref("");
const selectedIds = ref([]);
const toastMessage = ref("");
const toastType = ref("success");

const filteredItems = computed(() => items.value);
const unreadItems = computed(() => items.value.filter((item) => !item.isRead));
const highPriorityItems = computed(() => items.value.filter((item) => item.priority === "high"));
const stats = computed(() => [
  { label: "全部消息", value: items.value.length, type: "accent" },
  { label: "未读消息", value: unreadItems.value.length, type: "warning" },
  { label: "高优先级", value: highPriorityItems.value.length, type: "danger" },
  { label: "已读消息", value: items.value.filter((item) => item.isRead).length, type: "success" }
]);

watch([category, status], () => {
  selectedIds.value = [];
  fetchNotifications();
});

let queryTimer = null;
watch(query, () => {
  if (queryTimer) clearTimeout(queryTimer);
  queryTimer = setTimeout(fetchNotifications, 250);
});

onMounted(fetchNotifications);

function categoryLabel(value) {
  return categories.find(([key]) => key === value)?.[1] || value || "系统";
}

function priorityLabel(value) {
  return value === "high" ? "高优先级" : "普通";
}

function badgeType(item) {
  if (!item.isRead) return item.priority === "high" ? "danger" : "warning";
  return "success";
}

function formatTime(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value).slice(0, 16);
  return date.toLocaleString("zh-CN", { hour12: false });
}

function showToast(text, type = "success") {
  toastMessage.value = text;
  toastType.value = type;
}

async function fetchNotifications() {
  loading.value = true;
  error.value = "";
  try {
    const params = new URLSearchParams({
      category: category.value,
      status: status.value,
      q: query.value
    });
    items.value = await request(`/api/notifications?${params.toString()}`);
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function markRead(ids) {
  const list = Array.isArray(ids) ? ids : [ids];
  if (!list.length) return;
  try {
    await request("/api/notifications/read", { method: "POST", body: { ids: list } });
    selectedIds.value = selectedIds.value.filter((id) => !list.includes(id));
    await fetchNotifications();
    showToast("消息已标记为已读");
  } catch (err) {
    showToast(err.message, "error");
  }
}

async function markAllRead() {
  try {
    await request("/api/notifications/read-all", { method: "POST", body: { category: category.value } });
    selectedIds.value = [];
    await fetchNotifications();
    showToast("当前分类消息已全部已读");
  } catch (err) {
    showToast(err.message, "error");
  }
}
</script>

<template>
  <section class="section member-page-pro notification-center-page" data-testid="notification-center-page">
    <div class="member-hero-pro">
      <div>
        <span class="eyebrow">Message Center</span>
        <h2>消息中心<span v-if="unreadItems.length" class="bell-badge">{{ unreadItems.length }}</span></h2>
        <p class="lead">集中查看系统、活动、订单、预约、任务、优惠券、成长和推荐消息。</p>
      </div>
      <div class="member-hero-actions">
        <button class="btn ghost" type="button" :disabled="!unreadItems.length" @click="markAllRead">一键已读</button>
        <RouterLink class="btn" to="/points">查看积分</RouterLink>
      </div>
    </div>

    <div class="member-stat-grid">
      <article v-for="item in stats" :key="item.label" class="card member-stat-card">
        <StatusBadge :label="item.label" :type="item.type" />
        <strong>{{ item.value }}</strong>
      </article>
    </div>

    <article class="card member-filter-card">
      <div class="tabs compact-tabs">
        <button
          v-for="[key, label] in categories"
          :key="key"
          type="button"
          :class="{ active: category === key }"
          @click="category = key"
        >
          {{ label }}
        </button>
      </div>
      <div class="notification-toolbar">
        <label class="field compact-field">
          <span>搜索</span>
          <input v-model.trim="query" type="search" placeholder="标题、摘要或来源" />
        </label>
        <label class="field compact-field">
          <span>状态</span>
          <select v-model="status">
            <option value="all">全部状态</option>
            <option value="unread">未读</option>
            <option value="read">已读</option>
          </select>
        </label>
        <button class="btn ghost" type="button" :disabled="!selectedIds.length" @click="markRead(selectedIds)">批量已读</button>
      </div>
    </article>

    <DataState
      :loading="loading"
      :error="error"
      :empty="!loading && !filteredItems.length"
      empty-title="暂无匹配消息"
      description="切换分类、状态或搜索词后查看消息。"
      @retry="fetchNotifications"
    >
      <div class="message-layout-pro">
        <main>
          <div class="message-card-list">
            <article
              v-for="item in filteredItems"
              :key="item.id"
              class="card message-card-pro"
              :class="{ unread: !item.isRead }"
            >
              <label class="notification-check">
                <input v-model="selectedIds" type="checkbox" :value="item.id" :disabled="item.isRead" />
              </label>
              <div class="message-icon">{{ categoryLabel(item.category).slice(0, 1) }}</div>
              <div>
                <div class="message-card-head">
                  <h3>{{ item.title }}</h3>
                  <StatusBadge :label="item.isRead ? '已读' : '未读'" :type="badgeType(item)" />
                </div>
                <p>{{ item.content }}</p>
                <span class="muted">
                  {{ formatTime(item.createdAt) }} · {{ item.source || "system" }} · {{ priorityLabel(item.priority) }}
                </span>
              </div>
              <RouterLink v-if="item.link" class="btn ghost" :to="item.link">查看</RouterLink>
              <button class="btn ghost" type="button" :disabled="item.isRead" @click="markRead(item.id)">已读</button>
            </article>
          </div>
        </main>

        <aside class="card message-side-panel">
          <h3>快速入口</h3>
          <RouterLink class="quick-link" to="/orders">我的订单</RouterLink>
          <RouterLink class="quick-link" to="/my-reservations">我的预约</RouterLink>
          <RouterLink class="quick-link" to="/tasks">任务中心</RouterLink>
          <RouterLink class="quick-link" to="/points">积分中心</RouterLink>
          <div class="message-bell-card">
            <span>未读消息</span>
            <strong>{{ unreadItems.length }}</strong>
          </div>
        </aside>
      </div>
    </DataState>

    <BaseToast :message="toastMessage" :type="toastType" @close="toastMessage = ''" />
  </section>
</template>
