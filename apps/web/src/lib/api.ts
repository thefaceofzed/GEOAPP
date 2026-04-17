import axios from "axios";
import { useSessionStore } from "../store/sessionStore";

export const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

const api = axios.create({
  baseURL: `${apiBaseUrl}/api`,
  withCredentials: true,
});

let refreshHandler: null | (() => Promise<string | null>) = null;

export function registerRefreshHandler(handler: () => Promise<string | null>) {
  refreshHandler = handler;
}

api.interceptors.request.use((config) => {
  const token = useSessionStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as (typeof error.config & { _retry?: boolean }) | undefined;
    if (
      error.response?.status === 401 &&
      refreshHandler &&
      !original?._retry &&
      typeof original?.url === "string" &&
      !original.url.includes("/auth/refresh")
    ) {
      original._retry = true;
      const token = await refreshHandler();
      if (token) {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      }
    }
    throw error;
  },
);

export { api };
