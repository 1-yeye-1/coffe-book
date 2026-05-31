function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function renderField(field) {
  const common = `name="${escapeHtml(field.name)}" ${field.required === false ? "" : "required"} ${field.placeholder ? `placeholder="${escapeHtml(field.placeholder)}"` : ""}`;
  const value = escapeHtml(field.value ?? "");

  if (field.type === "textarea") {
    return `<label class="field"><span>${field.label}</span><textarea ${common} rows="${field.rows || 4}">${value}</textarea></label>`;
  }

  if (field.type === "select") {
    return `
      <label class="field">
        <span>${field.label}</span>
        <select ${common}>
          ${field.options.map(([optionValue, label]) => `<option value="${escapeHtml(optionValue)}" ${String(optionValue) === String(field.value) ? "selected" : ""}>${label}</option>`).join("")}
        </select>
      </label>
    `;
  }

  return `<label class="field"><span>${field.label}</span><input type="${field.type || "text"}" value="${value}" ${common} /></label>`;
}

export function openAdminModal({ title, fields, submitText = "保存", onSubmit }) {
  document.querySelector(".admin-modal-overlay")?.remove();

  const overlay = document.createElement("div");
  overlay.className = "admin-modal-overlay";
  overlay.innerHTML = `
    <section class="card admin-modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
      <div class="admin-modal-head">
        <div><p class="eyebrow">快捷编辑</p><h3>${title}</h3></div>
        <button class="icon-button" type="button" data-close-admin-modal aria-label="关闭">×</button>
      </div>
      <form class="admin-modal-form">
        ${fields.map(renderField).join("")}
        <p class="admin-modal-error" hidden></p>
        <div class="actions admin-modal-actions">
          <button class="btn ghost" type="button" data-close-admin-modal>取消</button>
          <button class="btn" type="submit">${submitText}</button>
        </div>
      </form>
    </section>
  `;

  const close = () => {
    document.removeEventListener("keydown", onKeydown);
    overlay.remove();
  };
  const onKeydown = (event) => {
    if (event.key === "Escape") close();
  };

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay || event.target.closest("[data-close-admin-modal]")) close();
  });

  overlay.querySelector("form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector("[type='submit']");
    const errorBox = event.currentTarget.querySelector(".admin-modal-error");
    button.disabled = true;
    errorBox.hidden = true;
    try {
      await onSubmit(Object.fromEntries(new FormData(event.currentTarget)));
      close();
    } catch (error) {
      errorBox.textContent = error.message;
      errorBox.hidden = false;
      button.disabled = false;
    }
  });

  document.body.append(overlay);
  document.addEventListener("keydown", onKeydown);
  overlay.querySelector("input, textarea, select")?.focus();
}
