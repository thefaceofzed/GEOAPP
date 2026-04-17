import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthModal } from "../components/AuthModal";
import { TopBar } from "../components/TopBar";
import { PlanetGlobe } from "../features/planet/PlanetGlobe";
import { createPlanetSimulation } from "../features/planet/impactEngine";
import { findCountryByCode } from "../features/planet/planetData";
import { createGuestSession, logout } from "../services/authService";
import { useSessionStore } from "../store/sessionStore";

export function LandingPage() {
  const navigate = useNavigate();
  const profile = useSessionStore((state) => state.profile);
  const setSession = useSessionStore((state) => state.setSession);
  const clearSession = useSessionStore((state) => state.clearSession);
  const [authOpen, setAuthOpen] = useState(false);
  const [loadingGuest, setLoadingGuest] = useState(false);

  const previewSimulation = useMemo(() => {
    const previewCountry = findCountryByCode("SG") ?? findCountryByCode("BR");
    if (!previewCountry) {
      return null;
    }

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
    } catch {
      // The local planet experience still works without an API-backed guest token.
    } finally {
      setLoadingGuest(false);
      navigate("/app");
    }
  }

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // Local state clear is enough for the UI.
    }
    clearSession();
    navigate("/");
  }

  return (
    <div className="min-h-screen px-4 py-5 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <TopBar
          onAuthOpen={() => setAuthOpen(true)}
          onLogout={handleLogout}
          profile={profile}
        />

        <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <div className="space-y-6 rounded-[2.2rem] border border-white/10 bg-black/28 p-6 backdrop-blur-xl">
            <div className="space-y-4">
              <p className="text-xs uppercase tracking-[0.4em] text-cyan-200/72">
                Planet-first experience
              </p>
              <h1 className="max-w-3xl font-display text-5xl leading-[0.92] text-white sm:text-6xl">
                Click any country. Watch economic conflict spread across the
                planet.
              </h1>
              <p className="max-w-2xl text-lg text-white/70">
                GEOECON WARS is now built around a living globe: country
                selection, timed impact propagation, animated zones, and replay
                links that travel with the simulation.
              </p>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                className="rounded-full bg-[linear-gradient(120deg,#7de5ff,#ffe170)] px-6 py-3 text-base font-semibold text-slate-950 transition hover:brightness-105"
                disabled={loadingGuest}
                onClick={handleGuestStart}
                type="button"
              >
                {loadingGuest ? "Opening simulator..." : "Enter as guest"}
              </button>
              <button
                className="rounded-full border border-white/15 px-6 py-3 text-base text-white/82 transition hover:border-white/30 hover:text-white"
                onClick={() => setAuthOpen(true)}
                type="button"
              >
                Login / Register
              </button>
              <Link
                className="rounded-full border border-white/15 px-6 py-3 text-base text-white/72 transition hover:border-white/30 hover:text-white"
                to="/app"
              >
                View simulator
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                [
                  "Global selection",
                  "Every country boundary is selectable and can become the origin point for a new scenario.",
                ],
                [
                  "Visual propagation",
                  "Impacts radiate through color overlays, arcs, labels, and pulsing rings instead of static tables.",
                ],
                [
                  "Replay-first links",
                  "Runs can be reopened and shared without making the ticker or account pages dominate the experience.",
                ],
              ].map(([title, copy]) => (
                <div
                  className="rounded-[1.7rem] border border-white/10 bg-white/5 p-4"
                  key={title}
                >
                  <p className="font-display text-xl text-white">{title}</p>
                  <p className="mt-2 text-sm text-white/60">{copy}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <PlanetGlobe
              className="h-[62vh]"
              interactive={false}
              selectedCountryCode3={previewSimulation?.countryCode3 ?? null}
              hoveredCountryCode3={null}
              simulation={previewSimulation}
            />

            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[1.8rem] border border-white/10 bg-black/30 p-5 backdrop-blur-lg">
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/72">
                  Cinematic preview
                </p>
                <h2 className="mt-3 font-display text-3xl text-white">
                  A living geopolitical surface
                </h2>
                <p className="mt-3 text-sm text-white/66">
                  The globe stays at the center. Action controls, ticker data,
                  and replay tools orbit around the planet instead of replacing
                  it.
                </p>
              </div>
              <div className="rounded-[1.8rem] border border-white/10 bg-black/30 p-5 backdrop-blur-lg">
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/72">
                  Scenario set
                </p>
                <ul className="mt-3 space-y-2 text-sm text-white/70">
                  <li>War escalation</li>
                  <li>Trade embargo</li>
                  <li>Financial sanctions</li>
                  <li>Cyberattack wave</li>
                  <li>Alliance buildout</li>
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
