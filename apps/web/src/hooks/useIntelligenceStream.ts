import { useEffect, useState } from "react";
import type { ForecastView, ObservedView } from "../lib/types";
import { apiBaseUrl } from "../lib/api";

export type IntelligenceStreamState = "idle" | "connecting" | "open" | "error";

interface IntelligenceStreamResult {
  observed: ObservedView | null;
  forecast: ForecastView | null;
  state: IntelligenceStreamState;
}

export function useIntelligenceStream(
  countryCode: string | null,
  actionKey: string,
  enabled: boolean,
): IntelligenceStreamResult {
  const [observed, setObserved] = useState<ObservedView | null>(null);
  const [forecast, setForecast] = useState<ForecastView | null>(null);
  const [state, setState] = useState<IntelligenceStreamState>("idle");

  useEffect(() => {
    if (!enabled || !countryCode) {
      setObserved(null);
      setForecast(null);
      setState("idle");
      return;
    }

    const streamUrl = new URL("/api/intelligence/stream", apiBaseUrl);
    streamUrl.searchParams.set("countryCode", countryCode);
    streamUrl.searchParams.set("actionKey", actionKey);

    setState("connecting");
    const eventSource = new EventSource(streamUrl.toString());

    eventSource.onopen = () => {
      setState("open");
    };

    eventSource.onerror = () => {
      setState("error");
    };

    eventSource.addEventListener("observed", (event) => {
      const nextObserved = JSON.parse((event as MessageEvent).data) as ObservedView;
      setObserved(nextObserved);
    });

    eventSource.addEventListener("forecast", (event) => {
      const nextForecast = JSON.parse((event as MessageEvent).data) as ForecastView;
      setForecast(nextForecast);
    });

    return () => {
      eventSource.close();
      setState("idle");
    };
  }, [actionKey, countryCode, enabled]);

  return {
    observed,
    forecast,
    state,
  };
}
