import { Link } from "react-router-dom";
import type { Profile } from "../lib/types";

interface TopBarProps {
  profile: Profile | null;
  onAuthOpen: () => void;
  onLogout?: () => void;
}

export function TopBar({ profile, onAuthOpen, onLogout }: TopBarProps) {
  return (
    <header className="flex flex-col gap-4 rounded-[1.8rem] border border-white/10 bg-black/35 px-5 py-4 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
      <Link to="/" className="inline-flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[linear-gradient(135deg,#7de5ff,#ffe170)] text-sm font-bold text-slate-950">
          GW
        </div>
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/70">
            GEOECON WARS
          </p>
          <p className="text-sm text-white/60">
            Planetary economic conflict simulator
          </p>
        </div>
      </Link>

      <nav className="flex flex-wrap items-center gap-2 text-sm text-white/72">
        <Link
          className="rounded-full border border-white/10 px-4 py-2 transition hover:border-white/25 hover:text-white"
          to="/app"
        >
          Simulator
        </Link>
        <Link
          className="rounded-full border border-white/10 px-4 py-2 transition hover:border-white/25 hover:text-white"
          to="/account"
        >
          Account
        </Link>
      </nav>

      <div className="flex flex-wrap items-center gap-3">
        {profile ? (
          <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
            {profile.planTier} |{" "}
            {profile.unlimited
              ? "Unlimited"
              : `${profile.simulationsRemaining ?? 0} remaining`}
          </div>
        ) : null}
        {!profile || profile.subjectType === "GUEST" ? (
          <button
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-100"
            onClick={onAuthOpen}
            type="button"
          >
            Open access
          </button>
        ) : null}
        {profile && onLogout ? (
          <button
            className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/75 transition hover:border-white/25 hover:text-white"
            onClick={onLogout}
            type="button"
          >
            Logout
          </button>
        ) : null}
      </div>
    </header>
  );
}
