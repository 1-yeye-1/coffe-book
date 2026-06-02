<script setup>
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { useSiteStore } from "@/stores/site";

const router = useRouter();
const siteStore = useSiteStore();
const loading = ref(false);
const error = ref("");
const form = reactive({ title: "", content: "", image: "" });

function handleImage(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => { form.image = reader.result; });
  reader.readAsDataURL(file);
}

async function submit() {
  loading.value = true;
  error.value = "";
  try {
    await siteStore.createPost(form);
    router.push("/community");
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="section" data-testid="publish-page">
    <div class="section-head"><div><h2>发布动态</h2><p class="lead">分享阅读、咖啡和城市生活。内容提交后进入社区信息流。</p></div></div>
    <form class="card list-editor" data-testid="post-form" @submit.prevent="submit">
      <label class="field"><span>标题</span><input v-model.trim="form.title" data-testid="post-title" maxlength="80" required /></label>
      <label class="field"><span>内容</span><textarea v-model.trim="form.content" data-testid="post-content" rows="7" maxlength="800" required></textarea></label>
      <label class="field"><span>图片</span><input type="file" accept="image/*" @change="handleImage" /></label>
      <img v-if="form.image" class="post-image-preview" :src="form.image" alt="动态预览" />
      <p v-if="error" class="form-error">{{ error }}</p>
      <button class="btn" data-testid="submit-post" type="submit" :disabled="loading">{{ loading ? "发布中..." : "发布动态" }}</button>
    </form>
  </section>
</template>
