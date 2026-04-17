import { useEffect, useMemo, useState } from "react";
import type { AnimatedAsset } from "../lib/types";

const DURATION_MS = 10000;

export function useTickerAnimation(assets: AnimatedAsset[]) {
  const [progress, setProgress] = useState(assets.length > 0 ? 0 : 1);

  useEffect(() => {
    if (assets.length === 0) {
      setProgress(1);
      return;
    }

    let frame = 0;
    const start = performance.now();

    const tick = (now: number) => {
      const next = Math.min((now - start) / DURATION_MS, 1);
      setProgress(next);
      if (next < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    setProgress(0);
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [assets]);

  return useMemo(
    () =>
      assets.map((asset) => ({
        ...asset,
        current: Number((asset.from + (asset.to - asset.from) * progress).toFixed(2)),
      })),
    [assets, progress],
  );
}
