export function toast(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;
  document.body.appendChild(node);
  setTimeout(() => node.remove(), 2400);
}

export function money(value) {
  return `¥${Number(value).toFixed(2)}`;
}

export function formData(form) {
  return Object.fromEntries(new FormData(form).entries());
}

export function card(item) {
  return `
    <article class="card media-card">
      ${item.image ? `<img src="${item.image}" alt="${item.title || item.name}" />` : ""}
      <div class="body">
        <h3>${item.title || item.name}</h3>
        <p class="muted">${item.description || item.author || item.content || ""}</p>
        ${item.price ? `<p class="price">${money(item.price)}</p>` : ""}
        ${item.tag ? `<span class="status">${item.tag}</span>` : ""}
      </div>
    </article>
  `;
}

export function pageTabs(items, active) {
  return `
    <div class="tabs">
      ${items.map(([page, label]) => `<button class="${active === page ? "active" : ""}" data-page="${page}">${label}</button>`).join("")}
    </div>
  `;
}

export function emptyState(text) {
  return `<div class="card empty"><p class="muted">${text}</p></div>`;
}
