import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import type { Profile } from "../lib/types";

interface TopBarProps {
  profile: Profile | null;
  onAuthOpen: () => void;
  onLogout?: () => void;
}

export function TopBar({ profile, onAuthOpen, onLogout }: TopBarProps) {
  const { t } = useTranslation();
  return (
    <header className="flex flex-col gap-4 rounded-panel border border-b-default bg-surface px-5 py-4 backdrop-blur-panel shadow-panel lg:flex-row lg:items-center lg:justify-between transition-colors duration-300">
      <Link to="/" className="inline-flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-lg bg-accent text-base font-bold text-white dark:text-[#080b12] font-display">
          G
        </div>
        <div>
          <p className="font-display text-base font-semibold text-t-primary tracking-wide">{t("app.name")}</p>
          <p className="text-[10px] uppercase tracking-[0.3em] text-t-tertiary font-mono">{t("app.tagline")}</p>
        </div>
      </Link>

      <nav className="flex flex-wrap items-center gap-2 text-sm text-t-secondary">
        <Link className="rounded-btn border border-b-subtle px-4 py-2 transition hover:border-accent/40 hover:text-accent" to="/app">{t("nav.simulator")}</Link>
        <Link className="rounded-btn border border-b-subtle px-4 py-2 transition hover:border-accent/40 hover:text-accent" to="/intelligence">{t("nav.intelligence")}</Link>
        <Link className="rounded-btn border border-b-subtle px-4 py-2 transition hover:border-accent/40 hover:text-accent" to="/account">{t("nav.account")}</Link>
      </nav>

      <div className="flex flex-wrap items-center gap-3">
        {profile && (
          <div className="rounded-btn border border-b-subtle bg-surface-alt px-3 py-1.5 text-xs text-t-secondary font-mono">
            {profile.planTier} |{" "}
            {profile.unlimited ? "∞" : `${profile.simulationsRemaining ?? 0} remaining`}
          </div>
        )}
        {!profile || profile.subjectType === "GUEST" ? (
          <button className="rounded-btn bg-accent px-4 py-2 text-sm font-medium text-white dark:text-[#080b12] transition hover:brightness-110" onClick={onAuthOpen} type="button">
            {t("auth.open_access")}
          </button>
        ) : null}
        {profile && onLogout ? (
          <button className="rounded-btn border border-b-subtle px-4 py-2 text-sm text-t-secondary transition hover:border-accent/40 hover:text-accent" onClick={onLogout} type="button">
            {t("auth.logout")}
          </button>
        ) : null}
      </div>
    </header>
  );
}
