export function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function avatarMarkup(user, className = "community-avatar") {
  const name = escapeHtml(user?.name || user?.author || user?.user || "书");
  return user?.avatar
    ? `<span class="${className}"><img src="${user.avatar}" alt="${name}" /></span>`
    : `<span class="${className}">${name.slice(0, 1)}</span>`;
}
