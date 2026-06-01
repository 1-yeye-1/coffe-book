<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { request } from "@/api";
import { useUserStore } from "@/stores/user";

const route = useRoute();
const userStore = useUserStore();
const text = ref("");
const message = ref("");

const config = computed(() => ({
  favorites: ["我的收藏", "收藏书籍、饮品、活动或文创商品，一行一条。"],
  notes: ["我的笔记", "记录阅读摘抄、咖啡课要点或到店灵感，一行一条。"],
  notifications: ["消息通知", "管理个人消息列表，一行一条。"]
}[route.meta.listType] || ["会员内容", "一行一条。"]));

function syncText() {
  const items = userStore.member?.[route.meta.listType] || [];
  text.value = items.join("\n");
}

onMounted(async () => {
  await userStore.fetchMember();
  syncText();
});

watch(() => route.meta.listType, syncText);

async function save() {
  const items = text.value.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  userStore.member = await request("/api/member/list", {
    method: "PATCH",
    body: JSON.stringify({ type: route.meta.listType, items })
  });
  message.value = "保存成功";
}
</script>

<template>
  <section class="section">
    <div class="section-head"><div><h2>{{ config[0] }}</h2><p class="lead">{{ config[1] }}</p></div></div>
    <form class="card list-editor" @submit.prevent="save">
      <p v-if="message" class="toast-inline">{{ message }}</p>
      <label class="field"><span>{{ config[0] }}</span><textarea v-model="text" rows="10" placeholder="请输入内容，一行一条"></textarea></label>
      <button class="btn" type="submit">保存{{ config[0] }}</button>
    </form>
  </section>
</template>
