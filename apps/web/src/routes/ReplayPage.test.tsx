import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { ReplayPage } from "./ReplayPage";
import { encodeReplayState } from "../features/planet/replayCodec";
import { fetchReplay } from "../services/simulationService";

vi.mock("../services/simulationService", () => ({
  fetchReplay: vi.fn(),
}));

describe("ReplayPage", () => {
  it("renders a graceful invalid token state", async () => {
    vi.mocked(fetchReplay).mockRejectedValueOnce(new Error("missing"));
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={["/replay/bad-token"]}>
          <Routes>
            <Route path="/replay/:token" element={<ReplayPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByText(/Replay not found or the replay payload is invalid/i),
    ).toBeInTheDocument();
  });

  it("renders a local encoded replay", async () => {
    const payload = encodeReplayState({
      id: "sim-1",
      countryCode: "MA",
      countryCode3: "MAR",
      countryName: "Morocco",
      actionKey: "war",
      actionLabel: "War Escalation",
      createdAt: "2026-04-14T10:00:00.000Z",
      severityScore: 84,
      narrative: {
        headline: "War Escalation around Morocco",
        summary: "Morocco becomes the ignition point for a military escalation.",
      },
      assets: [
        {
          key: "oil",
          label: "Brent Oil",
          unit: "USD",
          from: 98,
          to: 112,
          delta: 14,
        },
      ],
      impacts: [
        {
          id: "imp-1",
          countryCode: "MA",
          countryCode3: "MAR",
          countryName: "Morocco",
          lat: 31.5,
          lng: -7,
          tone: "severe-negative",
          score: -0.91,
          label: "Epicenter",
          detail: "Morocco absorbs the first-order shock.",
          delayMs: 0,
        },
      ],
      arcs: [],
      rings: [
        {
          id: "ring-1",
          lat: 31.5,
          lng: -7,
          tone: "severe-negative",
          delayMs: 0,
          maxRadius: 7.5,
          propagationSpeed: 2.2,
          repeatPeriod: 1400,
        },
      ],
      replayUrl: "/replay/local?state=test",
      mode: "local",
      replayToken: null,
      simulationId: null,
      simulationsRemaining: 2,
      unlimited: false,
    });

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={[`/replay/local?state=${payload}`]}>
          <Routes>
            <Route path="/replay/local" element={<ReplayPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(await screen.findByText(/Replay surface/i)).toBeInTheDocument();
    expect(screen.getByText(/War Escalation around Morocco/i)).toBeInTheDocument();
    expect(screen.getByText(/Brent Oil/i)).toBeInTheDocument();
  });
});
