export function todayLocal(): string {
    const d = new Date();
    const mx = new Date(d.toLocaleString("en-US", { timeZone: "America/Mexico_City" }));
    return mx.toISOString().substring(0, 10);
}
