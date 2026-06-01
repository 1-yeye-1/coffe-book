const API_BASE = import.meta.env.VITE_API_BASE
  || window.COFFEE_BOOK_API
  || "http://localhost:4173";

export async function request(path, options = {}) {
  const token = localStorage.getItem("coffee_token") || "";
  let response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });
  } catch {
    throw new Error("无法连接后端服务，请确认 backend 已启动在 http://localhost:4173");
  }

  const body = await response.json().catch(() => null);
  if (!body?.success) throw new Error(body?.message || "请求失败");
  return body.data;
}

export async function adminRequest(path, options = {}) {
  const token = localStorage.getItem("coffee_admin_token") || "";
  let response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });
  } catch {
    throw new Error("无法连接后端服务，请确认 backend 已启动在 http://localhost:4173");
  }

  const body = await response.json().catch(() => null);
  if (!body?.success) throw new Error(body?.message || "请求失败");
  return body.data;
}
