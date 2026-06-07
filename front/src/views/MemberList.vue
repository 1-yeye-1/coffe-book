<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { request } from "@/api";
import BaseModal from "@/components/BaseModal.vue";
import DataState from "@/components/DataState.vue";
import BaseToast from "@/components/front/BaseToast.vue";
import StatusBadge from "@/components/front/StatusBadge.vue";
import { useUserStore } from "@/stores/user";

const route = useRoute();
const userStore = useUserStore();

const loading = ref(false);
const error = ref("");
const query = ref("");
const favoriteTab = ref("all");
const noteCategory = ref("all");
const noteTag = ref("all");
const messageTab = ref("all");
const confirmTarget = ref(null);
const toastMessage = ref("");
const toastType = ref("success");
const readIds = ref([]);

const listType = computed(() => route.meta.listType || "favorites");
const pageConfig = computed(() => ({
  favorites: {
    eyebrow: "My Collection",
    title: "我的收藏",
    lead: "按图书、商品和活动管理收藏内容，支持搜索、分类与取消收藏。"
  },
  notes: {
    eyebrow: "Knowledge Base",
    title: "我的笔记",
    lead: "把阅读摘抄、咖啡心得和门店灵感整理成可检索的知识库。"
  },
  notifications: {
    eyebrow: "Message Center",
    title: "消息中心",
    lead: "集中查看订单、活动、积分和系统通知，未读消息会在右上角显示。"
  }
}[listType.value] || {
  eyebrow: "Member",
  title: "会员内容",
  lead: "管理会员中心内容。"
}));

const rawItems = computed(() => {
  const items = userStore.member?.[listType.value];
  return Array.isArray(items) ? items : [];
});

const favoriteCards = computed(() => rawItems.value.map((item, index) => {
  const text = normalizeText(item);
  const category = inferFavoriteCategory(text);
  return {
    id: `favorite-${index}-${text}`,
    originalIndex: index,
    title: text,
    category,
    tag: categoryLabel(category),
    description: favoriteDescription(text, category),
    meta: favoriteMeta(index, category)
  };
}));

const filteredFavorites = computed(() => favoriteCards.value.filter((item) => {
  const matchesTab = favoriteTab.value === "all" || item.category === favoriteTab.value;
  const matchesQuery = !query.value || item.title.toLowerCase().includes(query.value.toLowerCase());
  return matchesTab && matchesQuery;
}));

const favoriteStats = computed(() => [
  { label: "全部收藏", value: favoriteCards.value.length, type: "accent" },
  { label: "收藏书籍", value: favoriteCards.value.filter((item) => item.category === "books").length, type: "success" },
  { label: "收藏商品", value: favoriteCards.value.filter((item) => item.category === "products").length, type: "warning" },
  { label: "收藏活动", value: favoriteCards.value.filter((item) => item.category === "events").length, type: "default" }
]);

const noteCards = computed(() => rawItems.value.map((item, index) => {
  const text = normalizeText(item);
  const title = noteTitle(text);
  const category = inferNoteCategory(text);
  const tags = inferNoteTags(text, category);
  return {
    id: `note-${index}-${title}`,
    originalIndex: index,
    title,
    content: noteContent(text),
    category,
    tags,
    updatedAt: recentDate(index),
    words: text.length
  };
}));

const noteTags = computed(() => Array.from(new Set(noteCards.value.flatMap((item) => item.tags))).slice(0, 8));
const filteredNotes = computed(() => noteCards.value.filter((item) => {
  const value = `${item.title} ${item.content} ${item.tags.join(" ")}`.toLowerCase();
  const matchesQuery = !query.value || value.includes(query.value.toLowerCase());
  const matchesCategory = noteCategory.value === "all" || item.category === noteCategory.value;
  const matchesTag = noteTag.value === "all" || item.tags.includes(noteTag.value);
  return matchesQuery && matchesCategory && matchesTag;
}));

const noteStats = computed(() => [
  { label: "笔记总数", value: noteCards.value.length, type: "accent" },
  { label: "最近编辑", value: noteCards.value[0]?.updatedAt || "-", type: "success" },
  { label: "标签数量", value: noteTags.value.length, type: "warning" },
  { label: "累计字数", value: noteCards.value.reduce((sum, item) => sum + item.words, 0), type: "default" }
]);

const messageCards = computed(() => rawItems.value.map((item, index) => {
  const text = normalizeText(item);
  const type = inferMessageType(text);
  const id = messageId(text, index);
  return {
    id,
    originalIndex: index,
    title: messageTitle(text, type),
    content: text,
    type,
    label: messageTypeLabel(type),
    createdAt: recentDate(index),
    unread: !readIds.value.includes(id)
  };
}));

const filteredMessages = computed(() => messageCards.value.filter((item) => {
  if (messageTab.value === "all") return true;
  if (messageTab.value === "unread") return item.unread;
  return item.type === messageTab.value;
}));

const messageStats = computed(() => [
  { label: "全部消息", value: messageCards.value.length, type: "accent" },
  { label: "未读消息", value: messageCards.value.filter((item) => item.unread).length, type: "warning" },
  { label: "订单通知", value: messageCards.value.filter((item) => item.type === "order").length, type: "success" },
  { label: "活动通知", value: messageCards.value.filter((item) => item.type === "activity").length, type: "default" }
]);

onMounted(loadMember);

watch(() => route.meta.listType, () => {
  query.value = "";
  favoriteTab.value = "all";
  noteCategory.value = "all";
  noteTag.value = "all";
  messageTab.value = "all";
  loadReadIds();
  if (!userStore.member) loadMember();
});

async function loadMember() {
  loading.value = true;
  error.value = "";
  try {
    await userStore.fetchMember();
    loadReadIds();
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

function normalizeText(item) {
  if (typeof item === "string") return item;
  if (item && typeof item === "object") return item.title || item.content || item.message || item.name || "";
  return String(item || "");
}

function categoryLabel(category) {
  return { books: "图书", products: "商品", events: "活动" }[category] || "收藏";
}

function inferFavoriteCategory(text) {
  if (/活动|沙龙|报名|讲座|赛事|读书会/.test(text)) return "events";
  if (/咖啡|杯|豆|周边|文创|拿铁|冷萃|礼盒|手冲/.test(text)) return "products";
  return "books";
}

function favoriteDescription(text, category) {
  if (category === "books") return `已加入书架收藏，可在精品书库继续查看「${text}」相关书籍。`;
  if (category === "events") return "收藏的活动会优先出现在报名提醒和消息中心。";
  return "收藏的文创或咖啡商品，后续可从商城继续加购。";
}

function favoriteMeta(index, category) {
  const base = ["最近收藏", "本周收藏", "会员推荐", "常看内容"];
  return `${base[index % base.length]} · ${categoryLabel(category)}`;
}

function noteTitle(text) {
  return text.split(/[。；;,.，\n]/).find(Boolean)?.slice(0, 24) || "未命名笔记";
}

function noteContent(text) {
  const title = noteTitle(text);
  return text.length > title.length ? text.slice(title.length).replace(/^[。；;,.，\s]+/, "") : text;
}

function inferNoteCategory(text) {
  if (/咖啡|豆|手冲|拿铁|烘焙|萃取/.test(text)) return "coffee";
  if (/书|阅读|作者|章节|摘抄|文学/.test(text)) return "reading";
  return "ideas";
}

function inferNoteTags(text, category) {
  const tags = new Set();
  if (category === "coffee") tags.add("咖啡心得");
  if (category === "reading") tags.add("读书笔记");
  if (category === "ideas") tags.add("灵感记录");
  if (/复盘|总结/.test(text)) tags.add("复盘");
  if (/推荐|清单/.test(text)) tags.add("清单");
  if (/活动|沙龙/.test(text)) tags.add("活动");
  return [...tags].slice(0, 3);
}

function recentDate(index) {
  const date = new Date(Date.now() - index * 86400000);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

function inferMessageType(text) {
  if (/订单|支付|收货|取货/.test(text)) return "order";
  if (/活动|报名|沙龙|赛事/.test(text)) return "activity";
  if (/积分|成长值|签到|兑换/.test(text)) return "points";
  return "system";
}

function messageTypeLabel(type) {
  return {
    system: "系统通知",
    order: "订单通知",
    activity: "活动通知",
    points: "积分通知"
  }[type] || "消息";
}

function messageTitle(text, type) {
  const prefix = messageTypeLabel(type);
  return `${prefix} · ${text.slice(0, 18)}`;
}

function messageId(text, index) {
  return `${userStore.user?.id || "guest"}-${index}-${text.slice(0, 18)}`;
}

function readStorageKey() {
  return `coffee_message_read_${userStore.user?.id || "guest"}`;
}

function loadReadIds() {
  try {
    readIds.value = JSON.parse(localStorage.getItem(readStorageKey()) || "[]");
  } catch {
    readIds.value = [];
  }
}

function saveReadIds() {
  localStorage.setItem(readStorageKey(), JSON.stringify(readIds.value));
}

async function patchItems(type, items) {
  userStore.member = await request("/api/member/list", {
    method: "PATCH",
    body: JSON.stringify({ type, items })
  });
}

function askRemove(kind, card) {
  confirmTarget.value = { kind, card };
}

async function confirmRemove() {
  if (!confirmTarget.value) return;
  const { kind, card } = confirmTarget.value;
  try {
    const nextItems = rawItems.value.filter((_, index) => index !== card.originalIndex);
    await patchItems(kind, nextItems);
    showToast(kind === "favorites" ? "已取消收藏" : "笔记已删除");
  } catch (err) {
    showToast(err.message, "danger");
  } finally {
    confirmTarget.value = null;
  }
}

function markRead(card) {
  if (!readIds.value.includes(card.id)) {
    readIds.value.push(card.id);
    saveReadIds();
  }
  showToast("消息已标记为已读");
}

function markAllRead() {
  readIds.value = Array.from(new Set([...readIds.value, ...messageCards.value.map((item) => item.id)]));
  saveReadIds();
  showToast("全部消息已读");
}
</script>

<template>
  <section class="section member-list-page">
    <BaseToast :visible="Boolean(toastMessage)" :message="toastMessage" :type="toastType" />

    <div class="member-hero-pro">
      <div>
        <p class="eyebrow">{{ pageConfig.eyebrow }}</p>
        <h2>
          {{ pageConfig.title }}
          <span v-if="listType === 'notifications' && messageStats[1].value" class="bell-badge">{{ messageStats[1].value }}</span>
        </h2>
        <p class="lead">{{ pageConfig.lead }}</p>
      </div>
      <RouterLink class="btn ghost" to="/member">返回会员中心</RouterLink>
    </div>

    <DataState
      :loading="loading"
      :error="error"
      :empty="!rawItems.length"
      loading-title="会员数据同步中"
      :empty-title="`${pageConfig.title}暂无内容`"
      description="继续浏览书库、商城、活动或社区后，这里会自动沉淀你的内容。"
      @retry="loadMember"
    >
      <template #action>
        <RouterLink class="btn" to="/">回到首页</RouterLink>
      </template>

      <template v-if="listType === 'favorites'">
        <div class="member-stat-grid">
          <article v-for="item in favoriteStats" :key="item.label" class="card member-stat-card">
            <StatusBadge :label="item.label" :type="item.type" />
            <strong>{{ item.value }}</strong>
          </article>
        </div>

        <article class="card member-filter-card">
          <label class="field search-field">
            <span>搜索收藏</span>
            <input v-model.trim="query" placeholder="输入书名、商品或活动关键词" />
          </label>
          <div class="tabs compact-tabs">
            <button type="button" :class="{ active: favoriteTab === 'all' }" @click="favoriteTab = 'all'">全部</button>
            <button type="button" :class="{ active: favoriteTab === 'books' }" @click="favoriteTab = 'books'">图书</button>
            <button type="button" :class="{ active: favoriteTab === 'products' }" @click="favoriteTab = 'products'">商品</button>
            <button type="button" :class="{ active: favoriteTab === 'events' }" @click="favoriteTab = 'events'">活动</button>
          </div>
        </article>

        <DataState
          :empty="!filteredFavorites.length"
          empty-title="没有匹配的收藏"
          description="换个关键词或分类再试试。"
        >
          <div class="favorite-card-grid">
            <article v-for="item in filteredFavorites" :key="item.id" class="card collection-card">
              <div class="collection-icon">{{ item.tag.slice(0, 1) }}</div>
              <div>
                <StatusBadge :label="item.tag" type="accent" />
                <h3>{{ item.title }}</h3>
                <p>{{ item.description }}</p>
                <span class="muted">{{ item.meta }}</span>
              </div>
              <button class="btn ghost danger-text" type="button" @click="askRemove('favorites', item)">取消收藏</button>
            </article>
          </div>
        </DataState>
      </template>

      <template v-else-if="listType === 'notes'">
        <div class="member-stat-grid">
          <article v-for="item in noteStats" :key="item.label" class="card member-stat-card">
            <StatusBadge :label="item.label" :type="item.type" />
            <strong>{{ item.value }}</strong>
          </article>
        </div>

        <div class="knowledge-layout">
          <main class="knowledge-main">
            <article class="card member-filter-card">
              <label class="field search-field">
                <span>搜索笔记</span>
                <input v-model.trim="query" placeholder="搜索标题、内容、标签" />
              </label>
              <div class="tabs compact-tabs">
                <button type="button" :class="{ active: noteCategory === 'all' }" @click="noteCategory = 'all'">全部</button>
                <button type="button" :class="{ active: noteCategory === 'reading' }" @click="noteCategory = 'reading'">阅读</button>
                <button type="button" :class="{ active: noteCategory === 'coffee' }" @click="noteCategory = 'coffee'">咖啡</button>
                <button type="button" :class="{ active: noteCategory === 'ideas' }" @click="noteCategory = 'ideas'">灵感</button>
              </div>
            </article>

            <DataState :empty="!filteredNotes.length" empty-title="没有匹配的笔记" description="换个关键词、分类或标签继续查找。">
              <div class="note-card-list">
                <article v-for="item in filteredNotes" :key="item.id" class="card knowledge-note-card">
                  <div class="note-card-head">
                    <div>
                      <p class="eyebrow">{{ item.updatedAt }} 最近编辑</p>
                      <h3>{{ item.title }}</h3>
                    </div>
                    <StatusBadge :label="{ reading: '阅读', coffee: '咖啡', ideas: '灵感' }[item.category]" type="accent" />
                  </div>
                  <p>{{ item.content }}</p>
                  <div class="tag-row">
                    <button v-for="tag in item.tags" :key="tag" type="button" :class="{ active: noteTag === tag }" @click="noteTag = tag">{{ tag }}</button>
                  </div>
                  <div class="actions">
                    <button class="btn ghost" type="button" @click="showToast('编辑入口保留在原会员列表数据中，本阶段仅优化展示')">编辑</button>
                    <button class="btn ghost danger-text" type="button" @click="askRemove('notes', item)">删除</button>
                  </div>
                </article>
              </div>
            </DataState>
          </main>

          <aside class="card knowledge-side-panel">
            <h3>热门标签</h3>
            <div class="tag-cloud">
              <button type="button" :class="{ active: noteTag === 'all' }" @click="noteTag = 'all'">全部</button>
              <button v-for="tag in noteTags" :key="tag" type="button" :class="{ active: noteTag === tag }" @click="noteTag = tag">{{ tag }}</button>
            </div>
            <div class="profile-inline-list">
              <p><span>阅读笔记</span><strong>{{ noteCards.filter((item) => item.category === "reading").length }}</strong></p>
              <p><span>咖啡心得</span><strong>{{ noteCards.filter((item) => item.category === "coffee").length }}</strong></p>
              <p><span>灵感记录</span><strong>{{ noteCards.filter((item) => item.category === "ideas").length }}</strong></p>
            </div>
          </aside>
        </div>
      </template>

      <template v-else>
        <div class="member-stat-grid">
          <article v-for="item in messageStats" :key="item.label" class="card member-stat-card">
            <StatusBadge :label="item.label" :type="item.type" />
            <strong>{{ item.value }}</strong>
          </article>
        </div>

        <div class="message-layout-pro">
          <main>
            <article class="card member-filter-card">
              <div class="tabs compact-tabs">
                <button type="button" :class="{ active: messageTab === 'all' }" @click="messageTab = 'all'">全部</button>
                <button type="button" :class="{ active: messageTab === 'unread' }" @click="messageTab = 'unread'">未读</button>
                <button type="button" :class="{ active: messageTab === 'system' }" @click="messageTab = 'system'">系统通知</button>
                <button type="button" :class="{ active: messageTab === 'order' }" @click="messageTab = 'order'">订单通知</button>
                <button type="button" :class="{ active: messageTab === 'activity' }" @click="messageTab = 'activity'">活动通知</button>
                <button type="button" :class="{ active: messageTab === 'points' }" @click="messageTab = 'points'">积分通知</button>
              </div>
              <button class="btn ghost" type="button" @click="markAllRead">全部已读</button>
            </article>

            <DataState :empty="!filteredMessages.length" empty-title="没有匹配的消息" description="切换消息分类或查看全部消息。">
              <div class="message-card-list">
                <article v-for="item in filteredMessages" :key="item.id" class="card message-card-pro" :class="{ unread: item.unread }">
                  <div class="message-icon">{{ item.label.slice(0, 1) }}</div>
                  <div>
                    <div class="message-card-head">
                      <h3>{{ item.title }}</h3>
                      <StatusBadge :label="item.unread ? '未读' : '已读'" :type="item.unread ? 'warning' : 'success'" />
                    </div>
                    <p>{{ item.content }}</p>
                    <span class="muted">{{ item.createdAt }} · {{ item.label }}</span>
                  </div>
                  <button class="btn ghost" type="button" :disabled="!item.unread" @click="markRead(item)">标记已读</button>
                </article>
              </div>
            </DataState>
          </main>

          <aside class="card message-side-panel">
            <h3>快捷入口</h3>
            <RouterLink class="quick-link" to="/orders">查看订单</RouterLink>
            <RouterLink class="quick-link" to="/points">积分中心</RouterLink>
            <RouterLink class="quick-link" to="/activities">活动报名</RouterLink>
            <div class="message-bell-card">
              <span>未读铃铛</span>
              <strong>{{ messageStats[1].value }}</strong>
            </div>
          </aside>
        </div>
      </template>
    </DataState>

    <BaseModal
      :open="Boolean(confirmTarget)"
      :title="confirmTarget?.kind === 'favorites' ? '取消收藏' : '删除笔记'"
      :description="confirmTarget ? `确认处理「${confirmTarget.card.title}」？` : ''"
      @close="confirmTarget = null"
    >
      <div class="admin-modal-actions">
        <button class="btn ghost" type="button" @click="confirmTarget = null">取消</button>
        <button class="btn danger" type="button" @click="confirmRemove">确认</button>
      </div>
    </BaseModal>
  </section>
</template>
