<script setup>
import { computed, onMounted, ref } from "vue";
import { request } from "@/api";
import { useUserStore } from "@/stores/user";

const userStore = useUserStore();
const message = ref("");
const member = computed(() => userStore.member);
const rewards = computed(() => member.value?.membership?.rewards || []);

onMounted(() => userStore.fetchMember());

async function redeem(reward) {
  userStore.member = await request("/api/member/redeem", {
    method: "POST",
    body: JSON.stringify({ rewardId: reward.id })
  });
  message.value = "兑换成功，已加入我的礼品";
}
</script>

<template>
  <section v-if="member" class="section">
    <div class="section-head"><div><h2>积分中心</h2><p class="lead">积分可兑换特定商品、优惠券和活动权益。</p></div></div>
    <div class="card points-hero">
      <div><span class="muted">当前积分</span><strong>{{ member.points }}</strong><p>购物、签到都会增加积分和等级度。</p></div>
      <RouterLink class="btn ghost" to="/member">查看会员等级</RouterLink>
    </div>
    <p v-if="message" class="toast-inline">{{ message }}</p>
    <div class="grid reward-grid">
      <article v-for="reward in rewards" :key="reward.id" class="card reward-card">
        <h3>{{ reward.title }}</h3>
        <p class="muted">{{ reward.desc }}</p>
        <div class="cart-total"><strong>{{ reward.cost }} 积分</strong><button class="btn" type="button" :disabled="member.points < reward.cost" @click="redeem(reward)">兑换</button></div>
      </article>
    </div>
  </section>
</template>
