import { getApiBase } from "./api.config";

function headers() {
    const token = localStorage.getItem("token");
    return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

async function request(method: string, path: string, body?: any) {
    const base = getApiBase();
    const res = await fetch(`${base}${path}`, {
        method,
        headers: headers(),
        body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text()}`);
    return res.json();
}

export async function get(path: string) {
    return request("GET", path);
}

export async function post(path: string, body: any) {
    return request("POST", path, body);
}

export async function del(path: string) {
    const token = localStorage.getItem("token");
    const base = getApiBase();
    const res = await fetch(`${base}${path}`, {
        method: "DELETE",
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    });
    if (!res.ok) throw new Error(`Error ${res.status}: ${await res.text()}`);
    return res.json();
}

export async function put(path: string, body: any) {
    return request("PUT", path, body);
}
