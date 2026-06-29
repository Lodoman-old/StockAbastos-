import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
    appId: "com.stockabastos.app",
    appName: "StockAbastos",
    webDir: "dist",
    server: {
        cleartext: true,
        hostname: "localhost",
        androidScheme: "http",
    },
};

export default config;
