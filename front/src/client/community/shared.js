export async function openUserHome(ctx, userId) {
  if (!userId) return ctx.toast("该用户暂未开放个人主页");
  try {
    ctx.state.selectedCommunityProfile = await ctx.request(`/api/community/users/${userId}`);
    ctx.state.selectedCommunityUser = Number(userId);
    ctx.setPage("userHome");
  } catch (error) {
    ctx.toast(error.message);
  }
}

export function requireCommunityLogin(ctx, message) {
  if (ctx.state.user) return true;
  ctx.toast(message);
  ctx.setPage("userLogin");
  return false;
}
