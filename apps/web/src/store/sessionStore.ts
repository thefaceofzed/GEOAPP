import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { AuthResponse, Profile } from "../lib/types";

type BootstrapStatus = "idle" | "loading" | "ready";

interface SessionState {
  accessToken: string | null;
  profile: Profile | null;
  bootstrapStatus: BootstrapStatus;
  setSession: (session: AuthResponse, profile?: Profile | null) => void;
  setProfile: (profile: Profile | null) => void;
  clearSession: () => void;
  setBootstrapStatus: (status: BootstrapStatus) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      accessToken: null,
      profile: null,
      bootstrapStatus: "idle",
      setSession: (session, profile) =>
        set({
          accessToken: session.accessToken,
          profile:
            profile ??
            ({
              subjectId: session.subjectId,
              subjectType: session.subjectType,
              planTier: session.planTier,
              role: session.role,
              email: session.email,
              simulationsRemaining: session.simulationsRemaining,
              unlimited: session.unlimited,
            } satisfies Profile),
        }),
      setProfile: (profile) => set({ profile }),
      clearSession: () => set({ accessToken: null, profile: null }),
      setBootstrapStatus: (bootstrapStatus) => set({ bootstrapStatus }),
    }),
    {
      name: "geoecon-wars-session",
      partialize: (state) => ({
        accessToken: state.accessToken,
        profile: state.profile,
      }),
    },
  ),
);
