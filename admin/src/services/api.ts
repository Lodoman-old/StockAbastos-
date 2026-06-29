import { getToken, logout } from "./auth";

const API = "/api";

async function request<T = any>(path: string, options: RequestInit = {}): Promise<T> {
    const token = getToken();
    const res = await fetch(`${API}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(options.headers || {}),
        },
    });
    if (res.status === 401) {
        logout();
        throw new Error("Sesión expirada");
    }
    if (!res.ok) {
        const text = await res.text();
        let detail: any = { message: text };
        try { detail = JSON.parse(text); } catch {}
        const err: any = new Error(detail.error || detail.message || `Error ${res.status}`);
        Object.assign(err, detail);
        throw err;
    }
    return res.json();
}

export function get<T = any>(path: string) { return request<T>(path); }

export function post<T = any>(path: string, body?: any) {
    return request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined });
}

export function put<T = any>(path: string, body?: any) {
    return request<T>(path, { method: "PUT", body: body ? JSON.stringify(body) : undefined });
}

export function del<T = any>(path: string) {
    return request<T>(path, { method: "DELETE" });
}
