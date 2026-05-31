import { loginAdmin, logoutAdmin } from "../shared/state.js";

export function renderAdminLogin(ctx) {
  const logged = Boolean(ctx.state.adminUser);
  return `
    <section class="section auth-page admin-login-page">
      <div class="auth-panel">
        <div class="auth-copy admin-auth-copy">
          <h2>管理员登录</h2>
          <p>请先完成管理员身份验证，再进入工作台、用户管理、订单管理和数据大屏。</p>
        </div>
        <form class="card login-card" id="admin-login-form">
          <h3>${logged ? "已登录后台" : "后台登录"}</h3>
          ${logged ? `
            <p class="muted">当前管理员：${ctx.state.adminUser.name}</p>
            <div class="actions">
              <button class="btn" type="button" data-page="adminWorkbench">进入工作台</button>
              <button class="btn ghost" type="button" data-action="admin-logout">切换账号</button>
            </div>
          ` : `
            <label class="field"><span>账号</span><input name="account" placeholder="请输入管理员账号" autocomplete="username" /></label>
            <label class="field"><span>密码</span><input type="password" name="password" placeholder="请输入管理员密码" autocomplete="current-password" /></label>
            <p class="form-error" id="admin-login-error" role="alert"></p>
            <button class="btn" type="submit">进入后台</button>
          `}
        </form>
      </div>
    </section>
  `;
}

export function bindAdminLogin(ctx) {
  document.querySelector("[data-action='admin-logout']")?.addEventListener("click", () => {
    logoutAdmin();
    ctx.toast("已退出后台");
    ctx.render();
  });

  document.querySelector("#admin-login-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const errorNode = document.querySelector("#admin-login-error");
    if (errorNode) errorNode.textContent = "";
    try {
      const data = await ctx.request("/api/admin/login", { method: "POST", body: JSON.stringify(ctx.formData(event.currentTarget)) });
      loginAdmin(data);
      ctx.toast("后台登录成功");
      ctx.setPage("adminWorkbench");
    } catch (error) {
      if (errorNode) errorNode.textContent = error.message;
    }
  });
}
