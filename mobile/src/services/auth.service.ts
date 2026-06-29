import { getApiBase } from "./api.config";

interface LoginResponse {
    token: string;
    usuario: { id: string; nombre: string; email: string; rol: string; permisos?: string[] };
}

export async function login(email: string, password: string): Promise<LoginResponse> {
    const base = getApiBase();
    const res = await fetch(`${base}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
    });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ message: "Error de conexión" }));
        throw new Error(err.message || `Error ${res.status}`);
    }

    const data: LoginResponse = await res.json();
    localStorage.setItem("token", data.token);
    localStorage.setItem("usuario", JSON.stringify(data.usuario));
    return data;
}

export function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
}

export function getToken(): string | null {
    return localStorage.getItem("token");
}

export function isAuthenticated(): boolean {
    return !!getToken();
}

export function getUsuario(): any {
    try {
        return JSON.parse(localStorage.getItem("usuario") || "null");
    } catch {
        return null;
    }
}

export function getPermisos(): string[] {
    try {
        const u = JSON.parse(localStorage.getItem("usuario") || "null");
        return u?.permisos || [];
    } catch {
        return [];
    }
}
