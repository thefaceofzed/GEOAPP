import { api } from "../lib/api";
import type { AuthResponse, Profile } from "../lib/types";

export async function createGuestSession() {
  const { data } = await api.post<AuthResponse>("/auth/guest");
  return data;
}

export async function login(email: string, password: string) {
  const { data } = await api.post<AuthResponse>("/auth/login", { email, password });
  return data;
}

export async function register(email: string, password: string) {
  const { data } = await api.post<AuthResponse>("/auth/register", { email, password });
  return data;
}

export async function refreshSession() {
  const { data } = await api.post<AuthResponse>("/auth/refresh", {});
  return data;
}

export async function logout() {
  await api.post("/auth/logout");
}

export async function fetchProfile() {
  const { data } = await api.get<Profile>("/users/me");
  return data;
}
