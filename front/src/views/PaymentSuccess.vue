<script setup>
import { computed } from "vue";
import { useRoute } from "vue-router";
import { paymentMethodText, useOrderStore } from "@/stores/order";

const route = useRoute();
const orderStore = useOrderStore();
const order = computed(() => orderStore.getOrderById(route.params.orderId));
</script>

<template>
  <section class="section success-section">
    <div class="card result-card success-card">
      <div class="success-orb"><span></span></div>
      <div class="success-check" aria-hidden="true"></div>
      <p class="eyebrow">Payment Success</p>
      <h2>支付成功</h2>
      <template v-if="order">
        <div class="success-facts">
          <div><span>订单号</span><strong>{{ order.id }}</strong></div>
          <div><span>支付金额</span><strong>￥{{ Number(order.payAmount).toFixed(2) }}</strong></div>
          <div><span>支付方式</span><strong>{{ paymentMethodText[order.paymentMethod] || "模拟支付" }}</strong></div>
        </div>
      </template>
      <p v-else class="muted">暂无最新订单。</p>
      <div class="actions success-actions">
        <RouterLink v-if="order" class="btn" :to="`/orders/${order.id}`">查看订单</RouterLink>
        <RouterLink class="btn ghost" to="/">返回首页</RouterLink>
        <RouterLink class="btn ghost" to="/shop">继续逛商城</RouterLink>
      </div>
    </div>
  </section>
</template>
