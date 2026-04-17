import type { AnimatedAsset } from "../lib/types";
import { useTickerAnimation } from "../hooks/useTickerAnimation";

interface PriceTickerProps {
  assets: AnimatedAsset[];
}

export function PriceTicker({ assets }: PriceTickerProps) {
  const animatedAssets = useTickerAnimation(assets);

  if (assets.length === 0) {
    return (
      <div className="rounded-[1.75rem] border border-white/10 bg-white/5 px-4 py-5 text-sm text-white/60">
        Run a scenario to animate the live market tape.
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {animatedAssets.map((asset) => (
        <div
          className="min-w-[220px] rounded-[1.5rem] border border-white/10 bg-[#0c1923] p-4"
          key={asset.key}
        >
          <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">
            {asset.label}
          </p>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <p className="font-display text-3xl text-white">{asset.current}</p>
              <p className="text-xs text-white/45">{asset.unit}</p>
            </div>
            <p
              className={`rounded-full px-3 py-1 text-sm font-medium ${
                asset.delta >= 0
                  ? "bg-emerald-400/15 text-emerald-200"
                  : "bg-red-400/15 text-red-200"
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
}
