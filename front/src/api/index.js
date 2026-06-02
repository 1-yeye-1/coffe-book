function defaultApiBase() {
  const host = window.location.hostname || "localhost";
  return `${window.location.protocol}//${host}:4173`;
}

const API_BASE = import.meta.env.VITE_API_BASE
  || window.COFFEE_BOOK_API
  || defaultApiBase();

export class ApiError extends Error {
  constructor(message, status = 0, payload = null) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

function tokenFor(scope) {
  return localStorage.getItem(scope === "admin" ? "coffee_admin_token" : "coffee_token") || "";
}

function normalizeBody(body) {
  if (body === undefined || body === null || typeof body === "string" || body instanceof FormData) return body;
  return JSON.stringify(body);
}

async function apiRequest(path, options = {}, scope = "user") {
  const token = tokenFor(scope);
  const headers = {
    ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };
  let response;

  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      body: normalizeBody(options.body)
    });
  } catch {
    throw new ApiError(`无法连接后端服务，请确认 backend 已启动在 ${API_BASE}`);
  }

  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.success) {
    throw new ApiError(body?.message || "请求失败", response.status, body);
  }
  return body.data;
}

export function request(path, options = {}) {
  return apiRequest(path, options, "user");
}

export function adminRequest(path, options = {}) {
  return apiRequest(path, options, "admin");
}
