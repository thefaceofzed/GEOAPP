import { api } from "../lib/api";
import type {
  ForecastView,
  HistoryItem,
  ObservedView,
  SimulationView,
} from "../lib/types";

export interface SimulationPayload {
  countryCode: string;
  actionKey: string;
  durationHours: number;
  allyCodes: string[];
}

export async function createSimulation(payload: SimulationPayload) {
  const { data } = await api.post<SimulationView>("/simulations/war", payload);
  return data;
}

export async function fetchSimulation(simulationId: string) {
  const { data } = await api.get<SimulationView>(`/simulations/${simulationId}`);
  return data;
}

export async function fetchHistory() {
  const { data } = await api.get<HistoryItem[]>("/history");
  return data;
}

export async function fetchReplay(token: string) {
  const { data } = await api.get<SimulationView>(`/replays/${token}`);
  return data;
}

export async function fetchObservedSignals(countryCode: string, actionKey: string, limit = 8) {
  const { data } = await api.get<ObservedView>("/intelligence/observed", {
    params: {
      countryCode,
      actionKey,
      limit,
    },
  });
  return data;
}

export async function fetchForecast(countryCode: string, actionKey: string, horizonDays = 30) {
  const { data } = await api.get<ForecastView>("/intelligence/forecast", {
    params: {
      countryCode,
      actionKey,
      horizonDays,
    },
  });
  return data;
}
