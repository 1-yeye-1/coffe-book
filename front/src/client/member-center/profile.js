import { updateUser } from "../../shared/state.js";

function avatarContent(user) {
  return user.avatar ? `<img src="${user.avatar}" alt="${user.name}" />` : `<span>${user.name.slice(0, 1)}</span>`;
}

export function renderProfile(ctx) {
  const member = ctx.state.data.member;
  const roleLabel = member.role === "member" ? "会员用户" : member.role;
  return `
    <section class="section">
      <div class="section-head"><div><h2>个人中心</h2><p class="lead">编辑基础资料并上传头像。</p></div></div>
      <div class="profile-layout single">
        <form class="card profile-card" id="profile-form">
          <div class="profile-avatar-row">
            <div class="profile-avatar" id="profile-avatar-preview">${avatarContent(member)}</div>
            <div>
              <h3>个人资料</h3>
              <p class="muted">支持 JPG、PNG、WebP，建议小于 1MB。</p>
              <label class="btn ghost upload-button">
                上传头像
                <input id="avatar-file" type="file" accept="image/*" />
              </label>
            </div>
          </div>
          <input type="hidden" name="avatar" id="avatar-value" value="${member.avatar || ""}" />
          <label class="field"><span>昵称</span><input name="name" value="${member.name}" required /></label>
          <label class="field"><span>手机号</span><input name="phone" value="${member.phone}" required autocomplete="tel" /></label>
          <label class="field"><span>会员等级</span><input value="${member.level}" disabled /></label>
          <label class="field"><span>角色</span><input value="${roleLabel}" disabled /></label>
          <label class="toggle-field"><input type="checkbox" name="showProfile" ${member.showProfile !== false ? "checked" : ""} /><span>允许其他书友查看我的个人主页</span></label>
          <button class="btn" type="submit">保存资料</button>
        </form>
      </div>
    </section>
  `;
}

export function bindProfile(ctx) {
  const fileInput = document.querySelector("#avatar-file");
  const avatarValue = document.querySelector("#avatar-value");
  const preview = document.querySelector("#profile-avatar-preview");

  fileInput?.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) return ctx.toast("请选择图片文件");
    if (file.size > 1024 * 1024) return ctx.toast("头像图片不能超过 1MB");

    const reader = new FileReader();
    reader.addEventListener("load", () => {
      avatarValue.value = reader.result;
      preview.innerHTML = `<img src="${reader.result}" alt="头像预览" />`;
    });
    reader.readAsDataURL(file);
  });

  document.querySelector("#profile-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    try {
      const user = await ctx.request("/api/member/profile", {
        method: "PATCH",
        body: JSON.stringify(ctx.formData(event.currentTarget))
      });
      updateUser(user);
      ctx.toast("个人资料已保存");
      ctx.render();
    } catch (error) {
      ctx.toast(error.message);
    }
  });
}
