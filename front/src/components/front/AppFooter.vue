<script setup>
import { RouterLink } from "vue-router";

const serviceLinks = [
  { to: "/reservations", label: "在线预约" },
  { to: "/activities", label: "活动赛事" },
  { to: "/shop", label: "文创商城" }
];

const resourceLinks = [
  { to: "/culture", label: "咖啡文化" },
  { to: "/books", label: "精品书库" },
  { to: "/community", label: "书友社区" }
];
</script>

<template>
  <footer class="site-footer app-footer">
    <div class="site-footer-inner app-footer__inner">
      <section class="site-footer-brand">
        <RouterLink class="brand brand-button" to="/brand">
          <span class="brand-mark">咖</span>
          <span>
            <strong>咖啡书屋</strong>
            <small>阅读、咖啡、社群与城市生活</small>
          </span>
        </RouterLink>
        <p>把一杯咖啡的时间，变成一本书、一场交流和一次新的到访理由。</p>
      </section>

      <section>
        <h3>服务</h3>
        <RouterLink v-for="item in serviceLinks" :key="item.to" :to="item.to">{{ item.label }}</RouterLink>
      </section>

      <section>
        <h3>资源</h3>
        <RouterLink v-for="item in resourceLinks" :key="item.to" :to="item.to">{{ item.label }}</RouterLink>
      </section>

      <section>
        <h3>联系我们</h3>
        <p>邮箱：hello@coffeehouse.com</p>
        <p>电话：400-123-4567</p>
        <p>地址：城市咖啡书屋体验空间</p>
      </section>
    </div>
    <p class="site-footer-copy">© 2026 咖啡书屋. All rights reserved.</p>
  </footer>
</template>
