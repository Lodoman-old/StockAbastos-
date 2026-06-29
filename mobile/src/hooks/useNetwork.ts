import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

export function useNetwork() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        let cleanup: (() => void) | undefined;

        async function init() {
            if (Capacitor.isNativePlatform()) {
                const { Network } = await import("@capacitor/network");
                const handler = await Network.addListener("networkStatusChange", (status) => {
                    setIsOnline(status.connected);
                });
                const s = await Network.getStatus();
                setIsOnline(s.connected);
                cleanup = () => handler.remove();
            } else {
                const handler = () => setIsOnline(navigator.onLine);
                window.addEventListener("online", handler);
                window.addEventListener("offline", handler);
                cleanup = () => {
                    window.removeEventListener("online", handler);
                    window.removeEventListener("offline", handler);
                };
            }
        }

        init();

        return () => {
            if (cleanup) cleanup();
        };
    }, []);

    return isOnline;
}
