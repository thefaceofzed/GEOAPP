import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { registerRefreshHandler } from "./lib/api";
import { fetchProfile, refreshSession } from "./services/authService";
import { useSessionStore } from "./store/sessionStore";
import App from "./app/App";
import "./styles/index.css";

const queryClient = new QueryClient();

registerRefreshHandler(async () => {
  try {
    const session = await refreshSession();
    const profile = await fetchProfile();
    useSessionStore.getState().setSession(session, profile);
    return session.accessToken;
  } catch {
    useSessionStore.getState().clearSession();
    return null;
  }
});

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
