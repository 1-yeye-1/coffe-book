<script setup>
import { computed, onMounted, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useSiteStore } from "@/stores/site";
import { useUserStore } from "@/stores/user";

const route = useRoute();
const router = useRouter();
const siteStore = useSiteStore();
const userStore = useUserStore();
const message = ref("");
const fieldError = ref("");
const form = reactive({ people: 1, phone: "" });
const activity = computed(() => siteStore.activities.find((item) => String(item.id) === String(route.params.activityId)));
const remaining = computed(() => activity.value ? Math.max(0, activity.value.capacity - activity.value.applied) : 0);

onMounted(() => {
  if (!siteStore.activities.length) siteStore.fetchActivities();
  form.phone = userStore.user?.phone || "";
});

function validPhone(phone) {
  return /^1[3-9]\d{9}$/.test(String(phone || "").trim());
}

async function submit(kind) {
  fieldError.value = "";
  message.value = "";
  const people = Number(form.people);
  if (!Number.isInteger(people) || people < 1 || people > Math.max(1, remaining.value)) {
    fieldError.value = `报名人数必须是 1 到 ${Math.max(1, remaining.value)} 之间的整数`;
    return;
  }
  if (!userStore.isLoggedIn && !validPhone(form.phone)) {
    fieldError.value = "请输入正确的 11 位手机号";
    return;
  }
  if (kind === "early" && !userStore.isLoggedIn) return router.push({ name: "login", query: { redirect: route.fullPath } });
  try {
    await siteStore.applyActivity(activity.value.id, { kind, people, phone: form.phone });
    message.value = kind === "early" ? "提前报名成功" : "活动报名成功";
  } catch (err) {
    fieldError.value = err.message;
  }
}
</script>

<template>
  <section class="section">
    <RouterLink class="link-button" to="/activities">返回活动列表</RouterLink>
    <div v-if="activity" class="detail-hero event-detail">
      <article class="card">
        <p class="eyebrow">活动详情</p>
        <h2>{{ activity.title }}</h2>
        <p>{{ activity.description }}</p>
        <div class="event-facts">
          <span><strong>活动日期</strong>{{ activity.date }}</span>
          <span><strong>活动时间</strong>{{ activity.time }}</span>
          <span><strong>活动地点</strong>{{ activity.location }}</span>
          <span><strong>提前报名开放</strong>{{ activity.earlyStart || "待公布" }}</span>
          <span><strong>直接报名开放</strong>{{ activity.registrationStart || "待公布" }}</span>
          <span><strong>剩余名额</strong>{{ remaining }} / {{ activity.capacity }}</span>
        </div>
      </article>
      <form class="card" @submit.prevent>
        <h3>{{ userStore.isLoggedIn ? "会员报名" : "手机号预约报名" }}</h3>
        <p v-if="message" class="toast-inline">{{ message }}</p>
        <p class="muted">{{ userStore.isLoggedIn ? `将使用账号手机号 ${userStore.user?.phone}。` : "无需登录也可直接报名；提前报名需要登录会员账号。" }}</p>
        <label v-if="!userStore.isLoggedIn" class="field"><span>预留手机号</span><input v-model.trim="form.phone" type="tel" maxlength="11" required /></label>
        <label class="field"><span>报名人数</span><input v-model.number="form.people" type="number" min="1" :max="Math.max(1, remaining)" step="1" required /></label>
        <p v-if="fieldError" class="form-error">{{ fieldError }}</p>
        <div class="actions">
          <button class="btn" type="button" :disabled="!remaining" @click="submit('regular')">{{ remaining ? "直接报名" : "名额已满" }}</button>
          <button class="btn secondary" type="button" :disabled="!remaining" @click="submit('early')">提前报名</button>
        </div>
      </form>
    </div>
    <div v-else class="card empty"><p class="muted">暂无活动赛事，请稍后再来查看。</p></div>
  </section>
</template>
