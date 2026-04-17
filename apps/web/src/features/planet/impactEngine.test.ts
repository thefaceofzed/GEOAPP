import {
  buildReplayHistoryItem,
  createPlanetSimulation,
  restoreLocalReplay,
} from "./impactEngine";
import { findCountryByCode } from "./planetData";
import { decodeReplayState, encodeReplayState } from "./replayCodec";

describe("impactEngine", () => {
  it("creates deterministic simulations for arbitrary countries", () => {
    const country = findCountryByCode("MA");

    expect(country).not.toBeNull();

    const first = createPlanetSimulation(country!, "sanctions", {
      simulationsRemaining: 2,
      unlimited: false,
    });
    const second = createPlanetSimulation(country!, "sanctions", {
      simulationsRemaining: 2,
      unlimited: false,
    });

    expect(first.countryName).toBe("Morocco");
    expect(first.actionLabel).toBe("Financial Sanctions");
    expect(first.impacts.map((impact) => impact.countryCode3)).toEqual(
      second.impacts.map((impact) => impact.countryCode3),
    );
    expect(first.assets.map((asset) => asset.label)).toEqual(
      second.assets.map((asset) => asset.label),
    );
  });

  it("round-trips encoded replay payloads", () => {
    const country = findCountryByCode("BR");
    const simulation = createPlanetSimulation(country!, "alliance", {
      simulationsRemaining: 1,
      unlimited: false,
    });

    const encoded = encodeReplayState(simulation);
    const decoded = decodeReplayState(encoded);
    const restored = restoreLocalReplay(decoded!);

    expect(restored).toMatchObject({
      countryName: "Brazil",
      actionKey: "alliance",
    });
    expect(restored?.replayUrl).toMatch(/^\/replay\/local\?state=/);
  });

  it("builds history links for the replay shelf", () => {
    const country = findCountryByCode("JP");
    const simulation = createPlanetSimulation(country!, "cyberattack", {
      simulationsRemaining: 0,
      unlimited: false,
    });

    const historyItem = buildReplayHistoryItem(simulation);

    expect(historyItem.href).toMatch(/^\/replay\/local\?state=/);
    expect(historyItem.source).toBe("local");
  });
});
