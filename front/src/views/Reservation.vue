<script setup>
import { onMounted, reactive, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { useSiteStore } from "@/stores/site";
import { useUserStore } from "@/stores/user";

const router = useRouter();
const siteStore = useSiteStore();
const userStore = useUserStore();
const message = ref("");
const form = reactive({
  date: siteStore.reservationDate,
  time: siteStore.reservationTime,
  people: 1,
  phone: userStore.user?.phone || "",
  purpose: "阅读自习",
  note: ""
});

onMounted(() => siteStore.fetchSeats(form.date, form.time));
watch(() => [form.date, form.time], () => {
  siteStore.selectedSeats = [];
  siteStore.fetchSeats(form.date, form.time);
});

function toggleSeat(seat) {
  if (seat.status !== "free") return;
  const ok = siteStore.toggleSeat(seat.id, Number(form.people || 1));
  if (!ok) message.value = `当前预约 ${form.people} 人，最多选择 ${form.people} 个座位`;
}

function validPhone(phone) {
  return /^1[3-9]\d{9}$/.test(String(phone || "").trim());
}

async function submit() {
  const people = Number(form.people || 1);
  message.value = "";
  if (!Number.isInteger(people) || people < 1 || people > 12) {
    message.value = "预约人数必须是 1 到 12 之间的整数";
    return;
  }
  if (!validPhone(form.phone)) {
    message.value = "请输入正确的 11 位手机号";
    return;
  }
  if (String(form.note || "").length > 120) {
    message.value = "特殊需求不能超过 120 个字符";
    return;
  }
  if (siteStore.selectedSeats.length < people) {
    message.value = `还需要选择 ${people - siteStore.selectedSeats.length} 个座位`;
    return;
  }
  try {
    await siteStore.createReservation({ ...form, people, seatIds: siteStore.selectedSeats });
    message.value = "预约成功";
    if (userStore.isLoggedIn) router.push("/my-reservations");
  } catch (err) {
    message.value = err.message;
  }
}
</script>

<template>
  <section class="section panel">
    <div>
      <div class="section-head"><div><h2>座位选择</h2><p class="lead">选择日期、时间、人数和座位，系统会阻止冲突预约。</p></div></div>
      <div class="tabs"><RouterLink class="active" to="/reservations">座位选择</RouterLink><RouterLink to="/my-reservations">我的预约</RouterLink></div>
      <div class="seat-legend"><span><i class="free"></i>空闲</span><span><i class="occupied"></i>使用中</span><span><i class="reserved"></i>已预约</span><span><i class="selected"></i>已选择</span></div>
      <div class="seat-map">
        <button v-for="seat in siteStore.seats" :key="seat.id" class="seat" :class="[seat.status, { selected: siteStore.selectedSeats.includes(seat.id) }]" type="button" :disabled="seat.status !== 'free'" @click="toggleSeat(seat)">{{ seat.id }}</button>
      </div>
    </div>
    <form class="card" @submit.prevent="submit">
      <h3>预约信息</h3>
      <p v-if="message" class="toast-inline">{{ message }}</p>
      <label class="field"><span>日期</span><input v-model="form.date" type="date" required /></label>
      <label class="field"><span>时间</span><select v-model="form.time"><option>10:00</option><option>14:00</option><option>19:00</option></select></label>
      <label class="field"><span>人数</span><input v-model.number="form.people" type="number" min="1" max="12" step="1" required /></label>
      <label class="field"><span>预留手机号</span><input v-model.trim="form.phone" type="tel" maxlength="11" required /></label>
      <label class="field"><span>用途</span><select v-model="form.purpose"><option>阅读自习</option><option>朋友聚会</option><option>活动沙龙</option></select></label>
      <label class="field"><span>特殊需求</span><textarea v-model.trim="form.note" rows="3" maxlength="120" placeholder="靠窗、插座、安静区等"></textarea></label>
      <button class="btn" type="submit">提交预约</button>
    </form>
  </section>
</template>
