<script setup>
import { computed, onMounted } from "vue";
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();
const reservations = computed(() => userStore.member?.reservations || []);

onMounted(() => userStore.fetchMember());
</script>

<template>
  <section class="section">
    <div class="section-head"><div><h2>我的预约</h2><p class="lead">查看当前账号下的预约记录。</p></div></div>
    <div class="tabs"><RouterLink to="/reservations">座位选择</RouterLink><RouterLink class="active" to="/my-reservations">我的预约</RouterLink></div>
    <div v-if="reservations.length" class="grid">
      <article v-for="item in reservations" :key="item.id" class="card">
        <span class="status">{{ item.status }}</span>
        <h3>{{ item.seatId }}</h3>
        <p>{{ item.date }} {{ item.time }} · {{ item.people }} 人 · {{ item.purpose }}</p>
        <p class="muted">预留手机号：{{ item.phone || "-" }}</p>
        <p class="muted">{{ item.note || "无特殊需求" }}</p>
      </article>
    </div>
    <div v-else class="card empty"><p class="muted">暂无预约记录。</p></div>
  </section>
</template>
