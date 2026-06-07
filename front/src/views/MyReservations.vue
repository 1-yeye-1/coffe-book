<script setup>
import { computed, onMounted, ref } from "vue";
import DataState from "@/components/DataState.vue";
import { useSiteStore } from "@/stores/site";
import { useUserStore } from "@/stores/user";

const siteStore = useSiteStore();
const userStore = useUserStore();
const loading = ref(false);
const error = ref("");
const message = ref("");
const reservations = computed(() => siteStore.reservations);

onMounted(loadReservations);

async function loadReservations() {
  loading.value = true;
  error.value = "";
  try {
    await userStore.fetchMember();
    await siteStore.fetchReservations();
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function cancelReservation(item) {
  if (item.status === "已取消") return;
  if (!confirm("确认取消这条预约吗？")) return;
  try {
    await siteStore.cancelReservation(item.id);
    message.value = "预约已取消";
  } catch (err) {
    error.value = err.message;
  }
}
</script>

<template>
  <section class="section">
    <div class="section-head">
      <div>
        <h2>我的预约</h2>
        <p class="lead">查看当前账号下的预约记录，并取消尚未结束的座位预约。</p>
      </div>
      <RouterLink class="btn ghost" to="/reservations">继续预约</RouterLink>
    </div>
    <div class="tabs">
      <RouterLink to="/reservations">座位选择</RouterLink>
      <RouterLink class="active" to="/my-reservations">我的预约</RouterLink>
    </div>
    <p v-if="message" class="toast-inline">{{ message }}</p>
    <DataState
      :loading="loading"
      :error="error"
      :empty="!reservations.length"
      loading-title="预约同步中"
      empty-title="暂无预约记录"
      description="你可以先去座位选择页创建一条预约。"
      @retry="loadReservations"
    >
      <div class="grid">
        <article v-for="item in reservations" :key="item.id" class="card reservation-record">
          <div class="post-meta"><strong>{{ item.seatId }}</strong><span class="status">{{ item.status }}</span></div>
          <p>{{ item.date }} {{ item.time }} · {{ item.people }} 人 · {{ item.purpose }}</p>
          <p class="muted">预留手机号：{{ item.phone || "-" }}</p>
          <p class="muted">{{ item.note || "无特殊需求" }}</p>
          <div class="actions">
            <button class="btn ghost" type="button" :disabled="item.status === '已取消'" @click="cancelReservation(item)">
              {{ item.status === "已取消" ? "已取消" : "取消预约" }}
            </button>
          </div>
        </article>
      </div>
    </DataState>
  </section>
</template>
