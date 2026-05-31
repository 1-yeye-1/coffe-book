export function renderPublishPost() {
  return `
    <section class="section auth-page">
      <div class="section-head"><div><h2>发布动态</h2><p class="lead">分享读书笔记、咖啡体验或活动感想。</p></div></div>
      <form class="card" id="post-form">
        <label class="field"><span>标题</span><input name="title" maxlength="120" required /></label>
        <label class="field"><span>内容</span><textarea name="content" rows="6" maxlength="1200" required></textarea></label>
        <label class="btn ghost upload-button">上传图片<input id="post-image-file" type="file" accept="image/*" /></label>
        <input type="hidden" id="post-image-value" name="image" />
        <img class="post-image-preview" id="post-image-preview" alt="动态图片预览" hidden />
        <button class="btn" type="submit">发布</button>
      </form>
    </section>
  `;
}

export function bindPublishPost(ctx) {
  const fileInput = document.querySelector("#post-image-file");
  const imageValue = document.querySelector("#post-image-value");
  const preview = document.querySelector("#post-image-preview");
  fileInput?.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return ctx.toast("请选择图片文件");
    if (file.size > 1024 * 1024) return ctx.toast("动态图片不能超过 1MB");
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      imageValue.value = reader.result;
      preview.src = reader.result;
      preview.hidden = false;
    });
    reader.readAsDataURL(file);
  });

  document.querySelector("#post-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      await ctx.request("/api/posts", { method: "POST", body: JSON.stringify(ctx.formData(event.currentTarget)) });
      ctx.toast("动态已发布");
      ctx.setPage("community");
    } catch (error) {
      ctx.toast(error.message);
    }
  });
}
