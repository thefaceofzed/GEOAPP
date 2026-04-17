import { useEffect } from "react";
import { fetchProfile, refreshSession } from "../services/authService";
import { useSessionStore } from "../store/sessionStore";

export function useBootstrapSession() {
  const bootstrapStatus = useSessionStore((state) => state.bootstrapStatus);
  const setBootstrapStatus = useSessionStore((state) => state.setBootstrapStatus);
  const setSession = useSessionStore((state) => state.setSession);
  const clearSession = useSessionStore((state) => state.clearSession);

  useEffect(() => {
    if (bootstrapStatus !== "idle") {
      return;
    }

    let cancelled = false;
    setBootstrapStatus("loading");

    (async () => {
      try {
        const session = await refreshSession();
        const profile = await fetchProfile();
        if (!cancelled) {
          setSession(session, profile);
        }
      } catch {
        if (!cancelled) {
          clearSession();
        }
      } finally {
        if (!cancelled) {
          setBootstrapStatus("ready");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [bootstrapStatus, clearSession, setBootstrapStatus, setSession]);
}
