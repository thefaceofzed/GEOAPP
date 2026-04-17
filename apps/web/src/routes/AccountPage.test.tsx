import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AccountPage } from "./AccountPage";
import { usePlanetStore } from "../store/planetStore";
import { useSessionStore } from "../store/sessionStore";
import * as adminService from "../services/adminService";

vi.mock("../services/billingService", () => ({
  createCheckoutSession: vi.fn(),
}));

vi.mock("../services/simulationService", () => ({
  fetchHistory: vi.fn().mockResolvedValue([]),
}));

vi.mock("../services/adminService", () => ({
  fetchAdminIngestionStatus: vi.fn().mockResolvedValue({
    generatedAt: "2026-01-01T00:00:00.000Z",
    ingestion: {
      enabled: true,
      scheduleEnabled: true,
      bootstrapOnStartup: false,
      refreshIntervalMs: 300000,
      storedSignalCount: 25,
      latestSignalPublishedAt: "2026-01-01T00:00:00.000Z",
      lastRefresh: {
        startedAt: "2026-01-01T00:00:00.000Z",
        completedAt: "2026-01-01T00:01:00.000Z",
        inProgress: false,
        summary: null,
        failureMessage: null,
      },
      adapters: [
        { sourceKey: "news", sourceName: "GDELT", enabled: true },
        { sourceKey: "fx", sourceName: "Frankfurter", enabled: true },
      ],
    },
    intelligenceCache: {
      observedEntries: 1,
      forecastEntries: 2,
      ttlMs: 60000,
    },
    intelligenceStream: {
      activeSubscriptions: 1,
      activeClients: 1,
      maxConcurrentStreams: 100,
      maxConcurrentStreamsPerClient: 5,
      streamIntervalMs: 10000,
      lastBroadcastAt: "2026-01-01T00:02:00.000Z",
    },
  }),
  triggerAdminSignalRefresh: vi.fn().mockResolvedValue({
    triggeredAt: "2026-01-01T00:03:00.000Z",
    sourceKey: "news",
    summary: {
      adapterCount: 1,
      rawRecordCount: 5,
      insertedCount: 2,
      updatedCount: 1,
      deduplicatedCount: 2,
      failedAdapterCount: 0,
    },
    refreshState: {
      startedAt: "2026-01-01T00:03:00.000Z",
      completedAt: "2026-01-01T00:03:05.000Z",
      inProgress: false,
      summary: null,
      failureMessage: null,
    },
  }),
  invalidateAdminIntelligenceCache: vi.fn().mockResolvedValue({
    invalidatedAt: "2026-01-01T00:04:00.000Z",
    invalidation: {
      countryCode: null,
      actionKey: null,
      observedEntriesRemoved: 1,
      forecastEntriesRemoved: 2,
    },
    cache: {
      observedEntries: 0,
      forecastEntries: 0,
      ttlMs: 60000,
    },
  }),
}));

describe("AccountPage", () => {
  beforeEach(() => {
    useSessionStore.setState({
      accessToken: "guest-token",
      profile: {
        subjectId: "guest-1",
        subjectType: "GUEST",
        planTier: "GUEST",
        role: null,
        email: null,
        simulationsRemaining: 1,
        unlimited: false,
      },
      bootstrapStatus: "ready",
    });

    usePlanetStore.setState({
      selectedCountryCode3: null,
      hoveredCountryCode3: null,
      selectedActionKey: "war",
      activeSimulation: null,
      history: [],
      guestRunsUsed: 1,
      userRunsByDay: {},
    });
  });

  it("asks guests to register before checkout", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AccountPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: /Register to upgrade/i }));

    expect(
      await screen.findByText(/Create an account to start checkout and unlock Pro/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Create your operator account|Resume your session/i),
    ).toBeInTheDocument();
  });

  it("shows the control plane to admins and sends targeted refreshes", async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    useSessionStore.setState({
      accessToken: "admin-token",
      profile: {
        subjectId: "admin-1",
        subjectType: "USER",
        planTier: "ADMIN",
        role: "ADMIN",
        email: "admin@example.com",
        simulationsRemaining: null,
        unlimited: true,
      },
      bootstrapStatus: "ready",
    });

    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <AccountPage />
        </MemoryRouter>
      </QueryClientProvider>,
    );

    expect(
      await screen.findByRole("heading", {
        name: /Ingestion and intelligence operations/i,
      }),
    ).toBeInTheDocument();
    expect(await screen.findByText(/Stored signals/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Refresh source/i), {
      target: { value: "news" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Refresh signals/i }));

    await waitFor(() =>
      expect(adminService.triggerAdminSignalRefresh).toHaveBeenCalledWith(
        { sourceKey: "news" },
        expect.any(Object),
      ),
    );
    expect(
      await screen.findByText(/news refresh completed\. Inserted 2, updated 1, deduplicated 2\./i),
    ).toBeInTheDocument();
  });
});
