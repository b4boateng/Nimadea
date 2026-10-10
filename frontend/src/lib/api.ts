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

  return fetch(apiUrl(path), { ...init, headers }).then((response) => {
    if (
      response.status === 401 &&
      typeof window !== "undefined" &&
      window.location.pathname !== "/auth"
    ) {
      clearAuthToken();
      // The API helper has no access to a Next router instance.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/auth");
    }
    return response;
  });
}
