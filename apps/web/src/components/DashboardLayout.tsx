import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Sidebar } from "./Sidebar";
import { AuthModal } from "./AuthModal";
import { PaywallModal } from "./PaywallModal";
import { createGuestSession, logout } from "../services/authService";
import { useSessionStore } from "../store/sessionStore";
import { useThemeStore } from "../store/themeStore";
import { useSidebarStore } from "../store/sidebarStore";
import { WatchlistSyncProvider } from "../context/WatchlistSyncContext";

export function DashboardLayout() {
  const navigate = useNavigate();
  const clearSession = useSessionStore((s) => s.clearSession);
  const setSession = useSessionStore((s) => s.setSession);
  const profile = useSessionStore((s) => s.profile);
  const accessToken = useSessionStore((s) => s.accessToken);
  const bootstrapStatus = useSessionStore((s) => s.bootstrapStatus);

  const [authOpen, setAuthOpen] = useState(false);
  const [paywallOpen, setPaywallOpen] = useState(false);

  useThemeStore((s) => s.resolved);
  const sidebarCollapsed = useSidebarStore((s) => s.collapsed);
  const sidebarWidth = sidebarCollapsed ? 68 : 240;

  async function handleLogout() {
    try { await logout(); } catch { /* noop */ }
    clearSession();
    navigate("/");
  }

  if (bootstrapStatus !== "ready" && !accessToken) {
    return (
      <div className="grid min-h-screen place-items-center px-6">
        <div className="rounded-panel border border-b-default bg-surface px-6 py-5 backdrop-blur-xl text-t-primary">
          Restoring access...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-btn focus:bg-accent focus:px-4 focus:py-2 focus:text-white focus:shadow-panel">
        Skip to content
      </a>
      <Sidebar />

      <main id="main-content" className="pb-20 lg:pb-0 min-h-screen transition-[padding-left] duration-300 hidden-sidebar-padding"
        style={{ ["--sidebar-w" as string]: `${sidebarWidth}px` }}
      >
        <div className="mx-auto max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8">
          <WatchlistSyncProvider>
            <AnimatePresence mode="wait">
              <Outlet
                context={{
                  profile,
                  accessToken,
                  onAuthOpen: () => setAuthOpen(true),
                  onLogout: handleLogout,
                  onPaywallOpen: () => setPaywallOpen(true),
                }}
              />
            </AnimatePresence>
          </WatchlistSyncProvider>
        </div>
      </main>

      <AuthModal onClose={() => setAuthOpen(false)} open={authOpen} />
      <PaywallModal
        onClose={() => setPaywallOpen(false)}
        onOpenAuth={() => {
          setPaywallOpen(false);
          setAuthOpen(true);
        }}
        open={paywallOpen}
      />
    </div>
  );
}

export interface DashboardContext {
  profile: ReturnType<typeof useSessionStore.getState>["profile"];
  accessToken: string | null;
  onAuthOpen: () => void;
  onLogout: () => void;
  onPaywallOpen: () => void;
}
