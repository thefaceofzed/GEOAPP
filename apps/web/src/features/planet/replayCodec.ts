import type { LocalReplaySeed, PlanetSimulation } from "./types";

function encodeBase64Url(value: string) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function toSeed(simulation: PlanetSimulation): LocalReplaySeed {
  return {
    id: simulation.id,
    countryCode: simulation.countryCode,
    actionKey: simulation.actionKey,
    createdAt: simulation.createdAt,
    simulationsRemaining: simulation.simulationsRemaining,
    unlimited: simulation.unlimited,
  };
}

export function encodeReplayState(simulation: PlanetSimulation) {
  return encodeBase64Url(JSON.stringify(toSeed(simulation)));
}

export function decodeReplayState(payload: string | null) {
  if (!payload) {
    return null;
  }

  try {
    return JSON.parse(decodeBase64Url(payload)) as LocalReplaySeed;
  } catch {
    return null;
  }
}

export function buildLocalReplayHref(simulation: PlanetSimulation | LocalReplaySeed) {
  const seed =
    "countryCode" in simulation && "actionKey" in simulation && !("countryCode3" in simulation)
      ? simulation
      : toSeed(simulation as PlanetSimulation);

  return `/replay/local?state=${encodeURIComponent(encodeBase64Url(JSON.stringify(seed)))}`;
}
