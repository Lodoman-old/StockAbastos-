import { getApiUrl, getToken } from "../api";

function apiPath(path: string): string {
    return path.startsWith("/api/") ? path : `/api${path.startsWith("/") ? "" : "/"}${path}`;
}

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
    const base = getApiUrl();
    if (!base) throw new Error("API no configurada");
    const token = getToken();
    const fullPath = apiPath(path);
    const res = await fetch(`${base}${fullPath}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        },
    });
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
