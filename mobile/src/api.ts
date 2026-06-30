const STORAGE_KEY = "stockabastos_api_url";

export function getApiUrl(): string {
  return localStorage.getItem(STORAGE_KEY) || "";
}

export function setApiUrl(url: string) {
  localStorage.setItem(STORAGE_KEY, url.replace(/\/+$/, ""));
}

export function clearApiUrl() {
  localStorage.removeItem(STORAGE_KEY);
}

export function hasApiUrl(): boolean {
  return !!getApiUrl();
}

export function getToken(): string | null {
  return localStorage.getItem("token");
}

function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
  localStorage.removeItem(STORAGE_KEY);
}

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
  const base = getApiUrl();
  if (!base) throw new Error("API no configurada");
  const apiPath = path.startsWith("/api/") ? path : `/api${path.startsWith("/") ? "" : "/"}${path}`;
  const token = getToken();
  const res = await fetch(`${base}${apiPath}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    clearSession();
    window.location.href = "/setup";
    throw new Error("Sesión expirada");
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `Error ${res.status}`);
  }
  return res.json();
}

export function get<T = any>(path: string) {
  return request<T>(path);
}

export function post<T = any>(path: string, body?: any) {
  return request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
}

export function put<T = any>(path: string, body?: any) {
  return request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined });
}

export function del<T = any>(path: string) {
  return request<T>(path, { method: "DELETE" });
}

export async function testConnection(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${url.replace(/\/+$/, "")}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function login(url: string, email: string, password: string) {
  const base = url.replace(/\/+$/, "");
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Error de conexión" }));
    throw new Error(body.error || `Error ${res.status}`);
  }
  const data = await res.json();
  setApiUrl(base);
  return data;
}
