import { useEffect, useMemo, useState } from "react";
import type { PlanetSimulation } from "./types";

const TRAIL_MS = 2200;

export function useImpactTimeline(simulation: PlanetSimulation | null) {
  const [elapsedMs, setElapsedMs] = useState(0);

  useEffect(() => {
    if (!simulation) {
      setElapsedMs(0);
      return;
    }

    let frame = 0;
    const start = performance.now();

    const tick = (timestamp: number) => {
      const elapsed = Math.max(0, timestamp - start);
      setElapsedMs(elapsed);

      const lastDelay = Math.max(
        0,
        ...simulation.impacts.map((impact) => impact.delayMs),
      );

      if (elapsed < lastDelay + TRAIL_MS) {
        frame = requestAnimationFrame(tick);
      }
    };

    setElapsedMs(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [simulation?.id]);

  return useMemo(() => {
    if (!simulation) {
      return {
        elapsedMs: 0,
        progress: 0,
        activeImpacts: [],
        activeArcs: [],
        activeRings: [],
      };
    }

    const activeImpacts = simulation.impacts.filter((impact) => impact.delayMs <= elapsedMs);
    const activeArcs = simulation.arcs.filter((arc) => arc.delayMs <= elapsedMs);
    const activeRings = simulation.rings.filter((ring) => ring.delayMs <= elapsedMs);
    const totalDuration = Math.max(
      1,
      ...simulation.impacts.map((impact) => impact.delayMs),
      TRAIL_MS,
    );

    return {
      elapsedMs,
      progress: Math.min(elapsedMs / totalDuration, 1),
      activeImpacts,
      activeArcs,
      activeRings,
    };
  }, [elapsedMs, simulation]);
}
