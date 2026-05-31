import { state } from "./state.js";

const API = window.COFFEE_BOOK_API || "http://localhost:4173";

export async function request(path, options = {}) {
  const token = path.startsWith("/api/admin") ? state.adminToken : state.token;
  let response;
  try {
    response = await fetch(API + path, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      }
    });
  } catch {
    throw new Error("无法连接后端服务，请确认后端已通过 node index.js 启动");
  }

  let body;
  try {
    body = await response.json();
  } catch {
    throw new Error("后端返回格式异常，请检查接口服务");
  }

  if (!body.success) throw new Error(body.message || "请求失败");
  return body.data;
}
