<script setup>
import { computed, onMounted, ref } from "vue";
import DataState from "@/components/DataState.vue";
import StatusBadge from "@/components/front/StatusBadge.vue";
import { useEngagementStore } from "@/stores/engagement";

const engagementStore = useEngagementStore();
const loading = ref(false);
const error = ref("");
const message = ref("");
const bindCode = ref("");

const invite = computed(() => engagementStore.invite || {});
const records = computed(() => invite.value.records || []);
const ranking = computed(() => invite.value.ranking || []);

onMounted(loadInvite);

async function loadInvite() {
  loading.value = true;
  error.value = "";
  try {
    await engagementStore.fetchInvite();
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

async function copyInviteLink() {
  await navigator.clipboard?.writeText(invite.value.inviteLink || "");
  message.value = "邀请链接已复制";
}

async function bindInvite() {
  if (!bindCode.value.trim()) return;
  try {
    await engagementStore.bindInvite(bindCode.value.trim());
    bindCode.value = "";
    message.value = "邀请关系绑定成功";
    await loadInvite();
  } catch (err) {
    message.value = err.message;
  }
}
</script>

<template>
  <section class="section points-page-pro" data-testid="invite-page">
    <DataState
      :loading="loading"
      :error="error"
      :empty="!invite.inviteCode"
      loading-title="邀请数据同步中"
      empty-title="暂无邀请数据"
      description="分享邀请码和邀请链接，邀请好友注册和首单可获得积分与优惠券奖励。"
      @retry="loadInvite"
    >
      <div class="points-hero-final">
        <div class="points-hero-copy">
          <p class="eyebrow">Invite Rewards</p>
          <h1>邀请有礼</h1>
          <p>邀请好友加入咖啡书屋，注册奖励积分，好友首单后继续获得优惠券。</p>
        </div>
        <div class="points-balance-card">
          <span>我的邀请码</span>
          <strong>{{ invite.inviteCode }}</strong>
          <small>{{ invite.inviteLink }}</small>
          <button class="btn" type="button" @click="copyInviteLink">复制链接</button>
        </div>
      </div>

      <div class="points-layout-pro">
        <main class="points-main-stack">
          <article class="card level-progress-card">
            <div class="level-progress-head">
              <div>
                <p class="eyebrow">Poster Placeholder</p>
                <h3>分享海报占位</h3>
              </div>
              <StatusBadge label="可运营" type="accent" />
            </div>
            <p class="muted">后续可替换为活动海报生成能力；当前保留邀请码、链接和奖励规则，满足增长闭环演示。</p>
            <p v-if="message" class="toast-inline">{{ message }}</p>
          </article>

          <section class="section-block">
            <div class="section-head compact">
              <div>
                <p class="eyebrow">Invite Records</p>
                <h3>邀请记录</h3>
              </div>
            </div>
            <div class="reward-grid-pro">
              <article v-for="record in records" :key="record.id" class="card reward-card-pro">
                <div class="reward-icon">邀</div>
                <div>
                  <StatusBadge :label="record.status" type="success" />
                  <h3>好友 #{{ record.inviteeUserId || "待注册" }}</h3>
                  <p>邀请码 {{ record.inviteCode }} · 奖励积分 {{ record.rewardPoints || 0 }}</p>
                </div>
              </article>
              <article v-if="!records.length" class="card reward-card-pro">
                <div class="reward-icon">邀</div>
                <div>
                  <StatusBadge label="待开始" type="warning" />
                  <h3>暂无邀请记录</h3>
                  <p>复制邀请链接分享给好友即可开始累计。</p>
                </div>
              </article>
            </div>
          </section>
        </main>

        <aside class="points-side-stack">
          <article class="card member-rights-card">
            <h3>奖励规则</h3>
            <div class="points-rights-list">
              <div v-for="rule in invite.rewardRules || []" :key="rule.title">
                <span>奖</span>
                <b>{{ rule.title }}</b>
                <small>{{ rule.reward }}</small>
              </div>
            </div>
          </article>

          <article class="card point-record-card">
            <h3>绑定邀请码</h3>
            <label class="field">
              <span>好友邀请码</span>
              <input v-model.trim="bindCode" maxlength="24" placeholder="输入邀请码" />
            </label>
            <button class="btn" type="button" @click="bindInvite">绑定</button>
          </article>

          <article class="card point-record-card">
            <h3>邀请排行榜</h3>
            <div class="point-record-list">
              <p v-for="item in ranking" :key="item.userId">
                <span>
                  <strong>{{ item.name }}</strong>
                  <small>{{ item.inviteCode }}</small>
                </span>
                <b class="success">{{ item.count }} 人</b>
              </p>
            </div>
          </article>
        </aside>
      </div>
    </DataState>
  </section>
</template>
