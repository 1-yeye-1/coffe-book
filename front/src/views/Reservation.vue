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
const formError = ref("");
const reservationError = ref("");
const loading = ref(false);
const reservationsLoading = ref(false);

const minDate = localDateString();
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
  ["Step 2", "选择时间", "选择阅读时段"],
  ["Step 3", "选择人数", "确认同行人数"],
  ["Step 4", "填写信息", "手机号与用途"],
  ["Step 5", "确认提交", "生成预约记录"]
];

const demoReservations = [
  { id: "demo-1", date: minDate.slice(5), weekday: "周五", time: "10:00-12:00", seatId: "B3、C4", people: "2", purpose: "阅读自习", status: "即将到来" },
  { id: "demo-2", date: "06-03", weekday: "周二", time: "14:00-16:00", seatId: "A2", people: "1", purpose: "阅读自习", status: "已完成" },
  { id: "demo-3", date: "05-28", weekday: "周三", time: "10:00-12:00", seatId: "C5", people: "1", purpose: "朋友聚会", status: "已取消" }
];
const demoSeatStatus = {
  A4: "occupied",
  A5: "reserved",
  B5: "reserved",
  C2: "occupied",
  C5: "reserved"
};

const seatZones = computed(() => {
  const zones = [
    { key: "A", icon: "□", title: "A 区 安静阅读区", desc: "适合自习与深度阅读", seats: [] },
    { key: "B", icon: "☕", title: "B 区 咖啡交流区", desc: "适合交流与轻松阅读", seats: [] },
    { key: "C", icon: "▦", title: "C 区 靠窗座位区", desc: "视野开阔，光线舒适", seats: [] }
  ];
  siteStore.seats.forEach((seat, index) => {
    zones[zoneIndex(seat, index)].seats.push(seat);
  });
  return zones;
});

const selectedSeatLabels = computed(() => siteStore.selectedSeats.join("、") || "暂未选择");
const selectedCount = computed(() => siteStore.selectedSeats.length);
const safePeople = computed(() => Math.min(12, Math.max(1, Number(form.people || 1))));
const estimatedCost = computed(() => safePeople.value * 28);
const hasSeatStatusFromApi = computed(() => siteStore.seats.some((seat) => seat.status !== "free"));
const freeCount = computed(() => siteStore.seats.filter((seat) => visualSeatStatus(seat) === "free").length);
const occupiedCount = computed(() => siteStore.seats.filter((seat) => visualSeatStatus(seat) === "occupied").length);
const reservedCount = computed(() => siteStore.seats.filter((seat) => visualSeatStatus(seat) === "reserved").length);
const remainingSelection = computed(() => Math.max(0, safePeople.value - selectedCount.value));
const activeStep = computed(() => {
  if (!form.date) return 0;
  if (!form.time) return 1;
  if (!safePeople.value) return 2;
  if (!form.phone || phoneMessage(form.phone)) return 3;
  return 4;
});
const visibleReservations = computed(() => {
  if (!userStore.isLoggedIn) return demoReservations;
  return siteStore.reservations.slice(0, 3).map((item) => ({
    ...item,
    date: String(item.date || "").slice(5),
    weekday: weekdayLabel(item.date)
  }));
});

onMounted(() => {
  loadSeats();
  loadReservations();
});

watch(() => [form.date, form.time], () => {
  siteStore.selectedSeats = [];
  loadSeats();
});

watch(() => form.people, () => {
  const people = safePeople.value;
  if (siteStore.selectedSeats.length > people) {
    siteStore.selectedSeats = siteStore.selectedSeats.slice(0, people);
  }
});

function localDateString() {
  const now = new Date();
  const pad = (number) => String(number).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

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

async function loadReservations() {
  if (!userStore.isLoggedIn) return;
  reservationsLoading.value = true;
  reservationError.value = "";
  try {
    await siteStore.fetchReservations();
  } catch (err) {
    reservationError.value = err.message;
  } finally {
    reservationsLoading.value = false;
  }
}

function toggleSeat(seat) {
  const status = visualSeatStatus(seat);
  const selected = siteStore.selectedSeats.includes(seat.id);
  if (seat.status !== "free" || (status !== "free" && !selected)) return;
  formError.value = "";
  const ok = siteStore.toggleSeat(seat.id, safePeople.value);
  if (!ok) showToast(`当前预约 ${safePeople.value} 人，最多选择 ${safePeople.value} 个座位`, "warning");
}

function validate() {
  if (!form.date) return "请选择预约日期";
  if (form.date < minDate) return "预约日期不能早于今天";
  const peopleError = integerRangeMessage(form.people, 1, 12, "预约人数");
  if (peopleError) return peopleError;
  const phoneError = phoneMessage(form.phone);
  if (phoneError) return phoneError;
  const noteError = lengthMessage(form.note, 120, "特殊需求");
  if (noteError) return noteError;
  if (siteStore.selectedSeats.length < safePeople.value) {
    return `还需要选择 ${safePeople.value - siteStore.selectedSeats.length} 个座位`;
  }
  return "";
}

async function submit() {
  message.value = "";
  formError.value = "";
  const validationError = validate();
  if (validationError) {
    formError.value = validationError;
    showToast(validationError, "warning");
    return;
  }

  try {
    await siteStore.createReservation({ ...form, people: safePeople.value, seatIds: siteStore.selectedSeats });
    showToast("预约成功，已为你锁定座位");
    await loadReservations();
    if (userStore.isLoggedIn) router.push("/my-reservations");
  } catch (err) {
    formError.value = err.message;
    showToast(err.message, "danger");
  }
}

async function cancelReservation(item) {
  if (String(item.id).startsWith("demo") || item.status === "已取消") return;
  if (!confirm("确认取消这条预约吗？")) return;
  try {
    await siteStore.cancelReservation(item.id);
    showToast("预约已取消", "success");
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
    reserved: "已预约",
    selected: "已选择"
  };
  return labels[status] || status || "未知";
}

function visualSeatStatus(seat) {
  if (siteStore.selectedSeats.includes(seat.id)) return "selected";
  if (!hasSeatStatusFromApi.value && demoSeatStatus[seat.id]) return demoSeatStatus[seat.id];
  return seat.status || "free";
}

function seatDisabled(seat) {
  if (siteStore.selectedSeats.includes(seat.id)) return false;
  return seat.status !== "free" || visualSeatStatus(seat) !== "free";
}

function statusType(status) {
  if (status === "即将到来" || status === "已预约") return "warning";
  if (status === "已完成") return "success";
  if (status === "已取消") return "default";
  if (status === "使用中") return "accent";
  return "default";
}

function weekdayLabel(date) {
  if (!date) return "";
  const labels = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? "" : labels[parsed.getDay()];
}
</script>

<template>
  <section class="section reservation-page-pro" data-testid="reservation-page">
    <BaseToast :visible="Boolean(message)" :message="message" :type="toastType" />

    <div class="business-hero business-hero--reservation">
      <div>
        <p class="eyebrow">Seat Reservation</p>
        <h1>在线预约</h1>
        <p>选择座位、时间和人数，享受惬意的阅读时光。</p>
        <div class="hero-chip-row">
          <span>空闲 {{ freeCount }}</span>
          <span>使用中 {{ occupiedCount }}</span>
          <span>已预约 {{ reservedCount }}</span>
          <span>已选 {{ selectedCount }}</span>
        </div>
      </div>
      <div class="hero-glass-card reservation-hero-card">
        <strong>￥{{ estimatedCost }}</strong>
        <span>预计到店消费</span>
        <small>含人均咖啡与阅读服务预估</small>
      </div>
    </div>

    <div class="reservation-layout-pro">
      <main class="reservation-main-pro">
        <div class="stepper-card reservation-stepper-card" aria-label="预约步骤">
          <div
            v-for="(step, index) in steps"
            :key="step[0]"
            class="stepper-item"
            :class="{ active: index === activeStep, done: index < activeStep }"
          >
            <b>{{ step[0] }}</b>
            <span>{{ step[1] }}</span>
            <small>{{ step[2] }}</small>
          </div>
        </div>

        <section class="reservation-seat-panel">
          <header class="reservation-panel-head">
            <div>
              <h2>选择座位</h2>
              <p>按区域选择座位，绿色可选，红色使用中，黄色已预约，深咖色为已选择。</p>
            </div>
            <div class="seat-legend pro">
              <span><i class="free"></i>空闲</span>
              <span><i class="occupied"></i>使用中</span>
              <span><i class="reserved"></i>已预约</span>
              <span><i class="selected"></i>已选择</span>
            </div>
          </header>

          <div class="reservation-tabs">
            <RouterLink class="active" to="/reservations">座位选择</RouterLink>
            <RouterLink to="/my-reservations">我的预约</RouterLink>
          </div>

          <div v-if="loading" class="skeleton-grid reservation-skeleton">
            <div v-for="item in 9" :key="item" class="skeleton-card"></div>
          </div>
          <p v-else-if="error" class="form-error">{{ error }}</p>
          <div v-else-if="siteStore.seats.length" class="seat-zone-list">
            <section v-for="zone in seatZones" :key="zone.key" class="seat-zone-card reservation-zone-card">
              <div class="reservation-zone-intro">
                <span class="reservation-zone-icon">{{ zone.icon }}</span>
                <div>
                  <h3>{{ zone.title }}</h3>
                  <p>{{ zone.desc }}</p>
                </div>
                <StatusBadge :label="`${zone.seats.filter((seat) => visualSeatStatus(seat) === 'free').length} 可选`" type="success" />
              </div>
              <div class="seat-map pro-map">
                <button
                  v-for="seat in zone.seats"
                  :key="seat.id"
                  class="seat"
                  data-testid="seat-button"
                  :class="[visualSeatStatus(seat)]"
                  type="button"
                  :title="seatLabel(visualSeatStatus(seat))"
                  :disabled="seatDisabled(seat)"
                  @click="toggleSeat(seat)"
                >
                  {{ seat.id }}
                </button>
              </div>
            </section>
          </div>
          <EmptyState v-else title="暂无座位数据" description="请检查后端服务或换一个时间段。" />

          <div class="reservation-friendly-tip">
            <strong>温馨提示：</strong>
            <span>请爱护书屋环境，保持安静，文明阅读。</span>
          </div>
        </section>
      </main>

      <aside class="reservation-side-pro">
        <form class="card reservation-form reservation-form-pro" data-testid="reservation-form" @submit.prevent="submit">
          <header class="reservation-form-head">
            <div>
              <p class="eyebrow">Booking Info</p>
              <h3>预约信息</h3>
            </div>
            <StatusBadge :label="remainingSelection ? `还需 ${remainingSelection} 座` : '可提交'" :type="remainingSelection ? 'warning' : 'success'" />
          </header>

          <div class="reservation-form-grid">
            <label class="field">
              <span>预约日期</span>
              <input v-model="form.date" data-testid="reservation-date" type="date" :min="minDate" required />
            </label>
            <label class="field">
              <span>预约时间</span>
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
              <span>联系电话</span>
              <input v-model.trim="form.phone" data-testid="reservation-phone" type="tel" maxlength="11" placeholder="13800000000" required />
            </label>
          </div>

          <label class="field">
            <span>用途</span>
            <select v-model="form.purpose">
              <option>阅读自习</option>
              <option>朋友聚会</option>
              <option>活动沙龙</option>
            </select>
          </label>
          <label class="field">
            <span>特殊需求（选填）</span>
            <textarea v-model.trim="form.note" data-testid="reservation-note" rows="3" maxlength="120" placeholder="如靠窗、插座、安静区等需求"></textarea>
          </label>
          <p v-if="formError" class="reservation-form-error">{{ formError }}</p>
          <button class="btn reservation-submit-btn" data-testid="submit-reservation" type="submit">
            提交预约
            <span aria-hidden="true">→</span>
          </button>
          <small class="reservation-submit-note">预约成功后，我们将通过短信与你确认，请保持电话畅通。</small>
        </form>

        <div class="side-panel reservation-summary-card">
          <h3>预约摘要</h3>
          <p><span>座位</span><strong>{{ selectedSeatLabels }}</strong></p>
          <p><span>日期时间</span><strong>{{ form.date }} {{ form.time }}</strong></p>
          <p><span>人数</span><strong>{{ safePeople }} 人</strong></p>
          <p><span>预计消费</span><strong>￥{{ estimatedCost }}</strong></p>
          <div class="reservation-benefit-row">
            <span>会员到店享咖啡升级</span>
            <span>阅读积分 +20</span>
          </div>
        </div>
      </aside>
    </div>

    <div class="reservation-bottom-grid">
      <section class="reservation-record-panel">
        <header class="reservation-panel-head compact">
          <div>
            <h2>我的预约</h2>
            <p>{{ userStore.isLoggedIn ? "查看当前账号最近预约记录。" : "登录后可查看并管理自己的预约记录。" }}</p>
          </div>
          <RouterLink class="btn ghost" to="/my-reservations">查看更多预约记录</RouterLink>
        </header>

        <div class="reservation-record-tabs">
          <button class="active" type="button">全部</button>
          <button type="button">即将到来</button>
          <button type="button">已完成</button>
          <button type="button">已取消</button>
        </div>

        <div v-if="reservationsLoading" class="reservation-record-list">
          <div v-for="item in 3" :key="item" class="skeleton-card reservation-record-skeleton"></div>
        </div>
        <p v-else-if="reservationError" class="form-error">{{ reservationError }}</p>
        <div v-else-if="visibleReservations.length" class="reservation-record-list">
          <article v-for="item in visibleReservations" :key="item.id" class="reservation-mini-card">
            <div class="reservation-date-box">
              <strong>{{ item.date || "-" }}</strong>
              <span>{{ item.weekday }}</span>
            </div>
            <div class="reservation-mini-main">
              <h3>{{ item.time }}</h3>
              <p>{{ item.seatId }} 号座位 · {{ item.people }} 人 · {{ item.purpose }}</p>
            </div>
            <StatusBadge :label="item.status" :type="statusType(item.status)" />
            <div class="reservation-mini-actions">
              <RouterLink class="btn ghost" to="/my-reservations">查看详情</RouterLink>
              <button
                v-if="userStore.isLoggedIn && item.status !== '已取消'"
                class="btn danger"
                type="button"
                @click="cancelReservation(item)"
              >
                取消预约
              </button>
            </div>
          </article>
        </div>
        <EmptyState v-else title="暂无预约记录" description="选择座位并提交后，这里会显示你的预约。" />
      </section>

      <aside class="reservation-rules-panel">
        <div class="side-panel">
          <h3>预约须知</h3>
          <ul class="reservation-rule-list">
            <li>请提前至少 1 小时进行预约</li>
            <li>预约后如需取消，请提前 2 小时操作</li>
            <li>迟到 15 分钟将自动释放座位</li>
            <li>同一时间段最多可预约 6 个座位</li>
          </ul>
        </div>
        <div class="side-panel reservation-contact-card">
          <h3>联系我们</h3>
          <p>400-123-4567</p>
          <p>09:00-21:00（周一至周日）</p>
        </div>
      </aside>
    </div>
  </section>
</template>
