export function hoyMexico(): string {
    const now = new Date();
    const mx = new Date(now.toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
    return mx.toISOString().substring(0, 10);
}
