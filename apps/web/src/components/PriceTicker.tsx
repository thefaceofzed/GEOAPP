import { memo } from "react";
import type { AnimatedAsset } from "../lib/types";
import { useTickerAnimation } from "../hooks/useTickerAnimation";

interface PriceTickerProps {
  assets: AnimatedAsset[];
}

export const PriceTicker = memo(function PriceTicker({ assets }: PriceTickerProps) {
  const animatedAssets = useTickerAnimation(assets);

  if (assets.length === 0) {
    return (
      <div className="rounded-card border border-b-subtle bg-surface-alt px-4 py-5 text-sm text-t-tertiary shadow-card">
        Run a scenario to animate the live market tape.
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {animatedAssets.map((asset) => (
        <div
          className="min-w-[200px] rounded-card border border-b-subtle bg-surface-raised p-4 shadow-raised transition-all hover:shadow-card"
          key={asset.key}
        >
          <p className="text-[10px] uppercase tracking-[0.25em] text-accent font-mono">
            {asset.label}
          </p>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <p className="font-mono text-2xl font-semibold text-t-primary tabular-nums">{asset.current}</p>
              <p className="text-[10px] text-t-tertiary font-mono">{asset.unit}</p>
            </div>
            <p
              className={`font-mono rounded-btn px-2.5 py-1 text-xs font-medium tabular-nums ${
                asset.delta >= 0
                  ? "bg-emerald-400/12 text-emerald-700 dark:text-emerald-300"
                  : "bg-red-400/12 text-red-700 dark:text-red-300"
              }`}
            >
              {asset.delta >= 0 ? "+" : ""}
              {asset.delta}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
});
