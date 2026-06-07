<script setup>
import { computed, onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import BaseToast from "@/components/front/BaseToast.vue";
import EmptyState from "@/components/front/EmptyState.vue";
import StatusBadge from "@/components/front/StatusBadge.vue";
import { useSiteStore } from "@/stores/site";
import { useUserStore } from "@/stores/user";
import { integerRangeMessage, lengthMessage, phoneMessage } from "@/utils/validators";

const router = useRouter();
const siteStore = useSiteStore();
const userStore = useUserStore();
const message = ref("");
const toastType = ref("success");
const error = ref("");
const loading = ref(false);
const form = reactive({
  date: siteStore.reservationDate,
  time: siteStore.reservationTime,
  people: 1,
  phone: userStore.user?.phone || "",
  purpose: "阅读自习",
  note: ""
});

const steps = [
  ["Step 1", "选择日期", "锁定到店日期"],
  ["Step 2", "选择时间", "选择 10:00 / 14:00 / 19:00"],
  ["Step 3", "选择人数", "最多支持 12 人"],
  ["Step 4", "填写信息", "手机号与用途"],
  ["Step 5", "确认提交", "生成预约记录"]
];

const seatZones = computed(() => {
  const zones = [
    { key: "A", title: "A 安静阅读区", desc: "适合自习、独处阅读", seats: [] },
    { key: "B", title: "B 咖啡交流区", desc: "适合朋友会面、小组讨论", seats: [] },
    { key: "C", title: "C 靠窗座位区", desc: "适合拍照、轻办公", seats: [] }
  ];
  siteStore.seats.forEach((seat, index) => {
    zones[zoneIndex(seat, index)].seats.push(seat);
  });
  return zones;
});

const selectedSeatLabels = computed(() => siteStore.selectedSeats.join("、") || "暂未选择");
const selectedCount = computed(() => siteStore.selectedSeats.length);
const estimatedCost = computed(() => Number(form.people || 1) * 28);
const freeCount = computed(() => siteStore.seats.filter((seat) => seat.status === "free").length);
const reservedCount = computed(() => siteStore.seats.filter((seat) => seat.status !== "free").length);

onMounted(loadSeats);
watch(() => [form.date, form.time], () => {
  siteStore.selectedSeats = [];
  loadSeats();
});

async function loadSeats() {
  loading.value = true;
  error.value = "";
  try {
    await siteStore.fetchSeats(form.date, form.time);
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}

function toggleSeat(seat) {
  if (seat.status !== "free") return;
  const ok = siteStore.toggleSeat(seat.id, Number(form.people || 1));
  if (!ok) showToast(`当前预约 ${form.people} 人，最多选择 ${form.people} 个座位`, "warning");
}

function validate() {
  const peopleError = integerRangeMessage(form.people, 1, 12, "预约人数");
  if (peopleError) return peopleError;
  const phoneError = phoneMessage(form.phone);
  if (phoneError) return phoneError;
  const noteError = lengthMessage(form.note, 120, "特殊需求");
  if (noteError) return noteError;
  if (siteStore.selectedSeats.length < Number(form.people)) {
    return `还需要选择 ${Number(form.people) - siteStore.selectedSeats.length} 个座位`;
  }
  return "";
}

async function submit() {
  message.value = "";
  const validationError = validate();
  if (validationError) {
    showToast(validationError, "warning");
    return;
  }

  try {
    await siteStore.createReservation({ ...form, people: Number(form.people), seatIds: siteStore.selectedSeats });
    showToast("预约成功，已为你锁定座位");
    if (userStore.isLoggedIn) router.push("/my-reservations");
  } catch (err) {
    showToast(err.message, "danger");
  }
}

function showToast(text, type = "success") {
  toastType.value = type;
  message.value = text;
  setTimeout(() => { message.value = ""; }, 2200);
}

function zoneIndex(seat, index) {
  const prefix = String(seat.id || "").slice(0, 1).toUpperCase();
  if (prefix === "A") return 0;
  if (prefix === "B") return 1;
  if (prefix === "C") return 2;
  return index % 3;
}

function seatLabel(status) {
  const labels = {
    free: "空闲",
    occupied: "使用中",
    reserved: "已预约"
  };
  return labels[status] || status || "未知";
}
</script>

<template>
  <section class="section reservation-page-pro" data-testid="reservation-page">
    <BaseToast :visible="Boolean(message)" :message="message" :type="toastType" />

    <div class="business-hero business-hero--reservation">
      <div>
        <p class="eyebrow">Seat Reservation</p>
        <h1>在线预约</h1>
        <p>用步骤式预约完成日期、时间、人数、座位和联系方式选择，继续复用原有座位状态接口和预约提交接口。</p>
        <div class="hero-chip-row">
          <span>空闲 {{ freeCount }}</span>
          <span>占用/预约 {{ reservedCount }}</span>
          <span>已选 {{ selectedCount }}</span>
        </div>
      </div>
      <div class="hero-glass-card">
        <strong>￥{{ estimatedCost }}</strong>
        <span>预计到店消费</span>
        <small>含人均咖啡与阅读服务预估</small>
      </div>
    </div>

    <div class="reservation-layout-pro">
      <div class="reservation-main-pro">
        <div class="stepper-card">
          <div v-for="step in steps" :key="step[0]" class="stepper-item">
            <b>{{ step[0] }}</b>
            <span>{{ step[1] }}</span>
            <small>{{ step[2] }}</small>
          </div>
        </div>

        <div class="reservation-tabs">
          <RouterLink class="active" to="/reservations">座位选择</RouterLink>
          <RouterLink to="/my-reservations">我的预约</RouterLink>
        </div>

        <div class="seat-legend pro">
          <span><i class="free"></i>空闲</span>
          <span><i class="occupied"></i>使用中</span>
          <span><i class="reserved"></i>已预约</span>
          <span><i class="selected"></i>已选择</span>
        </div>

        <div v-if="loading" class="skeleton-grid reservation-skeleton">
          <div v-for="item in 9" :key="item" class="skeleton-card"></div>
        </div>
        <p v-else-if="error" class="form-error">{{ error }}</p>
        <div v-else-if="siteStore.seats.length" class="seat-zone-list">
          <section v-for="zone in seatZones" :key="zone.key" class="seat-zone-card">
            <header>
              <div>
                <h3>{{ zone.title }}</h3>
                <p>{{ zone.desc }}</p>
              </div>
              <StatusBadge :label="`${zone.seats.filter((seat) => seat.status === 'free').length} 可选`" type="success" />
            </header>
            <div class="seat-map pro-map">
              <button
                v-for="seat in zone.seats"
                :key="seat.id"
                class="seat"
                data-testid="seat-button"
                :class="[seat.status, { selected: siteStore.selectedSeats.includes(seat.id) }]"
                type="button"
                :title="seatLabel(seat.status)"
                :disabled="seat.status !== 'free'"
                @click="toggleSeat(seat)"
              >
                {{ seat.id }}
              </button>
            </div>
          </section>
        </div>
        <EmptyState v-else title="暂无座位数据" description="请检查后端服务或换一个时间段。" />
      </div>

      <aside class="reservation-side-pro">
        <form class="card reservation-form reservation-form-pro" data-testid="reservation-form" @submit.prevent="submit">
          <h3>预约信息</h3>
          <label class="field">
            <span>日期</span>
            <input v-model="form.date" data-testid="reservation-date" type="date" required />
          </label>
          <label class="field">
            <span>时间</span>
            <select v-model="form.time">
              <option>10:00</option>
              <option>14:00</option>
              <option>19:00</option>
            </select>
          </label>
          <label class="field">
            <span>人数</span>
            <input v-model.number="form.people" data-testid="reservation-people" type="number" min="1" max="12" step="1" required />
          </label>
          <label class="field">
            <span>预留手机号</span>
            <input v-model.trim="form.phone" data-testid="reservation-phone" type="tel" maxlength="11" required />
          </label>
          <label class="field">
            <span>用途</span>
            <select v-model="form.purpose">
              <option>阅读自习</option>
              <option>朋友聚会</option>
              <option>活动沙龙</option>
            </select>
          </label>
          <label class="field">
            <span>特殊需求</span>
            <textarea v-model.trim="form.note" data-testid="reservation-note" rows="3" maxlength="120" placeholder="靠窗、插座、安静区等"></textarea>
          </label>
          <button class="btn" data-testid="submit-reservation" type="submit">提交预约</button>
        </form>

        <div class="side-panel reservation-summary-card">
          <h3>预约摘要</h3>
          <p><span>座位</span><strong>{{ selectedSeatLabels }}</strong></p>
          <p><span>日期时间</span><strong>{{ form.date }} {{ form.time }}</strong></p>
          <p><span>人数</span><strong>{{ form.people }} 人</strong></p>
          <p><span>预计消费</span><strong>￥{{ estimatedCost }}</strong></p>
        </div>

        <div class="side-panel">
          <h3>预约须知</h3>
          <p>到店保留 15 分钟，超时座位将释放；会员到店可享咖啡升级和积分奖励。</p>
          <p>联系电话：400-826-BOOK</p>
        </div>
      </aside>
    </div>
  </section>
</template>
