import { Capacitor } from "@capacitor/core";

const STORAGE_KEY = "stockabastos_server_url";

const DEFAULT_URL = Capacitor.isNativePlatform()
    ? "http://192.168.0.24:4000/api"
    : "http://localhost:4000/api";

export function getApiBase(): string {
    if (!Capacitor.isNativePlatform()) return DEFAULT_URL;
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_URL;
}

export function setApiBase(url: string): void {
    localStorage.setItem(STORAGE_KEY, url);
}

export function getPublicUrl(): string {
    return getApiBase().replace("/api", "");
}

export function isServerConfigured(): boolean {
    return !!localStorage.getItem(STORAGE_KEY);
}

export function clearServerConfig(): void {
    localStorage.removeItem(STORAGE_KEY);
}
