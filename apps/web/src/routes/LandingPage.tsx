import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";
import { AuthModal } from "../components/AuthModal";
import { ThemeToggle } from "../components/ThemeToggle";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { PlanetGlobe } from "../features/planet/PlanetGlobe";
import { createPlanetSimulation } from "../features/planet/impactEngine";
import { findCountryByCode } from "../features/planet/planetData";
import { createGuestSession, logout } from "../services/authService";
import { useSessionStore } from "../store/sessionStore";
import { useThemeStore } from "../store/themeStore";

export function LandingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const profile = useSessionStore((state) => state.profile);
  const setSession = useSessionStore((state) => state.setSession);
  const clearSession = useSessionStore((state) => state.clearSession);
  const [authOpen, setAuthOpen] = useState(false);
  const [loadingGuest, setLoadingGuest] = useState(false);

  useThemeStore((s) => s.resolved);

  const previewSimulation = useMemo(() => {
    const previewCountry = findCountryByCode("SG") ?? findCountryByCode("BR");
    if (!previewCountry) return null;
    return createPlanetSimulation(previewCountry, "cyberattack", {
      simulationsRemaining: 3,
      unlimited: false,
    });
  }, []);

  async function handleGuestStart() {
    setLoadingGuest(true);
    try {
      const session = await createGuestSession();
      setSession(session);
    } catch { /* local fallback */ }
    finally {
      setLoadingGuest(false);
      navigate("/app");
    }
  }

  async function handleLogout() {
    try { await logout(); } catch { /* noop */ }
    clearSession();
    navigate("/");
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 lg:px-10 transition-colors duration-500 relative z-10">
      <div className="mx-auto max-w-[1440px] space-y-8">
        {/* Header */}
        <header className="flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-accent text-white dark:text-[#080b12] font-display text-xl font-bold">
              G
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-t-primary tracking-wide">{t("app.name")}</p>
              <p className="text-[10px] uppercase tracking-[0.3em] text-t-tertiary font-mono">{t("app.tagline")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <ThemeToggle />
            {profile ? (
              <span className="rounded-btn border border-b-default px-3 py-1.5 text-xs text-t-secondary font-mono">{profile.planTier}</span>
            ) : (
              <button className="rounded-btn bg-accent px-4 py-2 text-sm font-medium text-white dark:text-[#080b12] transition hover:brightness-110"
                onClick={() => setAuthOpen(true)} type="button">
                {t("landing.access")}
              </button>
            )}
          </div>
        </header>

        {/* Hero */}
        <section className="grid gap-8 xl:grid-cols-[1fr_1.1fr] items-start">
          <div className="space-y-8 animate-panel-enter">
            <div className="space-y-5">
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 max-w-[40px] bg-accent" />
                <p className="text-[11px] uppercase tracking-[0.4em] text-accent font-mono font-medium">
                  {t("landing.badge")}
                </p>
              </div>
              <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold leading-[0.95] text-t-primary italic">
                {t("landing.headline")}
              </h1>
              <p className="max-w-xl text-lg leading-relaxed text-t-secondary">
                {t("landing.description")}
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                className="rounded-btn bg-accent px-7 py-3.5 text-base font-semibold text-white dark:text-[#080b12] transition hover:brightness-110 hover:shadow-glow-accent"
                disabled={loadingGuest}
                onClick={handleGuestStart}
                type="button"
              >
                {loadingGuest ? t("landing.opening") : t("landing.cta_primary")}
              </button>
              <button
                className="rounded-btn border border-b-default px-7 py-3.5 text-base text-t-secondary transition hover:border-accent hover:text-accent"
                onClick={() => setAuthOpen(true)}
                type="button"
              >
                {t("landing.cta_secondary")}
              </button>
            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 animate-panel-enter stagger-2">
              {[
                [t("landing.feature_signals_title"), t("landing.feature_signals_desc")],
                [t("landing.feature_engine_title"), t("landing.feature_engine_desc")],
                [t("landing.feature_briefs_title"), t("landing.feature_briefs_desc")],
              ].map(([title, copy]) => (
                <div className="group rounded-card border border-b-subtle bg-surface-alt p-5 shadow-card transition-all hover:shadow-panel hover:border-accent/20" key={title}>
                  <p className="font-display text-xl font-semibold text-t-primary italic">{title}</p>
                  <p className="mt-2 text-sm leading-relaxed text-t-secondary">{copy}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 animate-panel-enter stagger-3">
            <PlanetGlobe
              className="h-[35vh] sm:h-[45vh] lg:h-[62vh]"
              interactive={false}
              selectedCountryCode3={previewSimulation?.countryCode3 ?? null}
              hoveredCountryCode3={null}
              simulation={previewSimulation}
            />

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-panel border border-b-default bg-surface p-5 shadow-panel backdrop-blur-panel">
                <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-mono">{t("landing.command_surface")}</p>
                <h2 className="mt-3 font-display text-2xl font-semibold text-t-primary italic">{t("landing.living_map_title")}</h2>
                <p className="mt-3 text-sm text-t-secondary leading-relaxed">
                  {t("landing.living_map_desc")}
                </p>
              </div>
              <div className="rounded-panel border border-b-default bg-surface p-5 shadow-panel backdrop-blur-panel">
                <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-mono">{t("landing.scenario_library")}</p>
                <ul className="mt-3 space-y-2 text-sm text-t-secondary">
                  {["War escalation", "Trade embargo", "Financial sanctions", "Cyberattack wave", "Alliance buildout"].map((s) => (
                    <li key={s} className="flex items-center gap-2">
                      <span className="h-1 w-1 rounded-full bg-accent flex-shrink-0" />
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </div>

      <AuthModal onClose={() => setAuthOpen(false)} open={authOpen} />
    </div>
  );
}
