const API_BASE_URL = "http://localhost:8000";
const TOKEN_KEY = "nimadea_auth_token";

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  window.localStorage.removeItem(TOKEN_KEY);
}

export function apiUrl(path: string): string {
  return `${API_BASE_URL}${path}`;
}

export function authFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const token = getAuthToken();
  headers.set("Accept", "application/json");
  if (token) headers.set("Authorization", `Token ${token}`);

  return fetch(apiUrl(path), { ...init, headers });
}
