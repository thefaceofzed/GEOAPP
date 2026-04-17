import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AuthModal } from "../components/AuthModal";
import { PriceTicker } from "../components/PriceTicker";
import { TopBar } from "../components/TopBar";
import { PlanetGlobe } from "../features/planet/PlanetGlobe";
import {
  createPlanetSimulationFromBackend,
  restoreLocalReplay,
} from "../features/planet/impactEngine";
import { decodeReplayState } from "../features/planet/replayCodec";
import { fetchReplay } from "../services/simulationService";
import { logout } from "../services/authService";
import { useSessionStore } from "../store/sessionStore";

export function ReplayPage() {
  const params = useParams<{ token: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const profile = useSessionStore((state) => state.profile);
  const clearSession = useSessionStore((state) => state.clearSession);
  const [authOpen, setAuthOpen] = useState(false);

  const localReplay = useMemo(
    () => decodeReplayState(searchParams.get("state")),
    [searchParams],
  );

  const replayQuery = useQuery({
    queryKey: ["replay", params.token],
    queryFn: () => fetchReplay(params.token ?? ""),
    enabled: Boolean(params.token) && !localReplay,
  });

  const replay = useMemo(() => {
    if (localReplay) {
      return restoreLocalReplay(localReplay);
    }
    if (!replayQuery.data) {
      return null;
    }
    return createPlanetSimulationFromBackend(replayQuery.data);
  }, [localReplay, replayQuery.data]);

  async function copyReplayLink() {
    await navigator.clipboard.writeText(window.location.href);
  }

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // Local clear is enough for the UI.
    }
    clearSession();
    navigate("/");
  }

  if (!localReplay && replayQuery.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center px-6 text-white">
        <div className="rounded-[2rem] border border-white/10 bg-black/25 px-6 py-5 backdrop-blur">
          Loading replay...
        </div>
      </div>
    );
  }

  if (replayQuery.isError || !replay) {
    return (
      <div className="min-h-screen px-4 py-6 text-white sm:px-6 lg:px-10">
        <div className="mx-auto max-w-5xl space-y-6">
          <TopBar
            onAuthOpen={() => setAuthOpen(true)}
            onLogout={handleLogout}
            profile={profile}
          />
          <div className="rounded-[2rem] border border-red-400/20 bg-red-500/10 px-6 py-8 text-red-100">
            Replay not found or the replay payload is invalid.
          </div>
        </div>
        <AuthModal onClose={() => setAuthOpen(false)} open={authOpen} />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-6 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1500px] space-y-6">
        <TopBar
          onAuthOpen={() => setAuthOpen(true)}
          onLogout={handleLogout}
          profile={profile}
        />

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <div className="space-y-4">
            <div className="rounded-[2rem] border border-white/10 bg-black/28 p-5 backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/72">
                    Replay surface
                  </p>
                  <h1 className="mt-3 font-display text-4xl text-white sm:text-5xl">
                    {replay.narrative.headline}
                  </h1>
                </div>
                <div className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/70">
                  {replay.mode === "persisted" ? "Persisted replay" : "Encoded replay"}
                </div>
              </div>
              <p className="mt-3 max-w-4xl text-base text-white/68">
                {replay.narrative.summary}
              </p>
            </div>

            <PlanetGlobe
              className="h-[62vh] lg:h-[calc(100vh-19rem)]"
              interactive={false}
              hoveredCountryCode3={null}
              selectedCountryCode3={replay.countryCode3}
              simulation={replay}
            />

            <section className="rounded-[2rem] border border-white/10 bg-black/30 p-5 backdrop-blur-xl">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/72">
                    Market tape
                  </p>
                  <h2 className="mt-2 font-display text-2xl text-white">
                    Replay asset stream
                  </h2>
                </div>
                <button
                  className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/75 transition hover:border-white/25 hover:text-white"
                  onClick={copyReplayLink}
                  type="button"
                >
                  Copy replay link
                </button>
              </div>
              <PriceTicker assets={replay.assets} />
            </section>
          </div>

          <aside className="space-y-4 rounded-[2rem] border border-white/10 bg-black/35 p-5 backdrop-blur-xl lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
            <section className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/72">
                Summary
              </p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-[1.2rem] border border-white/10 bg-[#08111a] p-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/42">
                    Country
                  </p>
                  <p className="mt-2 text-sm text-white/82">{replay.countryName}</p>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-[#08111a] p-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/42">
                    Severity
                  </p>
                  <p className="mt-2 text-sm text-white/82">{replay.severityScore}/100</p>
                </div>
              </div>
            </section>

            <section className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.35em] text-cyan-200/72">
                Impact list
              </p>
              <div className="mt-4 space-y-3">
                {replay.impacts.slice(0, 8).map((impact) => (
                  <div
                    className="rounded-[1.2rem] border border-white/10 bg-[#08111a] p-3"
                    key={impact.id}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-white">{impact.countryName}</p>
                      <span className="text-xs uppercase tracking-[0.2em] text-white/46">
                        {impact.label}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-white/62">{impact.detail}</p>
                  </div>
                ))}
              </div>
            </section>

            <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
              <Link
                className="rounded-[1.3rem] bg-white px-4 py-3 text-center text-sm font-semibold text-slate-950 transition hover:bg-cyan-100"
                to="/app"
              >
                Open simulator
              </Link>
              <Link
                className="rounded-[1.3rem] border border-white/10 px-4 py-3 text-center text-sm text-white/80 transition hover:border-white/25 hover:text-white"
                to="/account"
              >
                View account
              </Link>
            </div>
          </aside>
        </section>
      </div>

      <AuthModal onClose={() => setAuthOpen(false)} open={authOpen} />
    </div>
  );
}
