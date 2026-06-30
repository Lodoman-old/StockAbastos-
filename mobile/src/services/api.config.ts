import { Capacitor } from "@capacitor/core";

const OLD_KEY = "stockabastos_server_url";
const NEW_KEY = "stockabastos_api_url";

export function getApiBase(): string {
    let url = localStorage.getItem(OLD_KEY) || localStorage.getItem(NEW_KEY);
    if (!url) {
        url = Capacitor.isNativePlatform()
            ? "http://192.168.0.24:4000/api"
            : "http://localhost:4000/api";
    }
    if (!url.endsWith("/api")) {
        url = url.replace(/\/+$/, "") + "/api";
    }
    return url;
}

export function setApiBase(url: string): void {
    if (!url.endsWith("/api")) {
        url = url.replace(/\/+$/, "") + "/api";
    }
    localStorage.setItem(OLD_KEY, url);
}

export function getPublicUrl(): string {
    return getApiBase().replace(/\/api\/?$/, "");
}

export function isServerConfigured(): boolean {
    return !!(localStorage.getItem(OLD_KEY) || localStorage.getItem(NEW_KEY));
}

export function clearServerConfig(): void {
    localStorage.removeItem(OLD_KEY);
    localStorage.removeItem(NEW_KEY);
}
