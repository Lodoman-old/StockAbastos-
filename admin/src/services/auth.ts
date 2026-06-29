export function clearSession() {
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
}

export function getToken(): string | null {
    return localStorage.getItem("token");
}

export function getUsuario(): any {
    try { return JSON.parse(localStorage.getItem("usuario") || "null"); }
    catch { return null; }
}

export function isAuthenticated(): boolean {
    const token = getToken();
    if (!token) return false;
    return !isTokenExpired(token);
}

export function isTokenExpired(token: string): boolean {
    try {
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (!payload.exp) return false;
        return Date.now() >= payload.exp * 1000;
    } catch {
        return true;
    }
}

export function logout() {
    clearSession();
    window.location.reload();
}
