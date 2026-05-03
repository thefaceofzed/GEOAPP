import type { WatchlistItem } from "./types";

interface WatchlistPanelProps {
  items: WatchlistItem[];
  title?: string;
  subtitle?: string;
  emptyMessage?: string;
  onActivate: (item: WatchlistItem) => void;
  onRemove: (id: string) => void;
}

export function WatchlistPanel({
  items,
  title = "Watchlist",
  subtitle,
  emptyMessage = "No saved watch items yet.",
  onActivate,
  onRemove,
}: WatchlistPanelProps) {
  return (
    <section className="rounded-panel border border-b-default bg-surface p-5 backdrop-blur-panel transition-colors shadow-panel">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-mono font-medium">{title}</p>
          {subtitle && <p className="mt-2 max-w-2xl text-sm text-t-secondary">{subtitle}</p>}
        </div>
        <div className="rounded-full border border-b-subtle px-3 py-1 text-[10px] uppercase tracking-widest text-t-tertiary font-mono">
          {items.length} saved
        </div>
      </div>

      {items.length === 0 ? (
        <div className="mt-4 rounded-card border border-dashed border-b-default bg-surface-alt p-4 text-sm text-t-secondary">
          {emptyMessage}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((item) => (
            <div className="rounded-card border border-b-subtle bg-surface-raised p-4 transition-colors shadow-raised" key={item.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-xl font-semibold text-t-primary italic">{item.countryName}</p>
                  <p className="mt-1 text-sm text-t-secondary">{item.actionLabel} | {item.mode}</p>
                  <p className="mt-2 text-[10px] uppercase tracking-widest text-t-tertiary font-mono">
                    Saved {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:brightness-110"
                    onClick={() => onActivate(item)}
                    type="button"
                  >
                    Open
                  </button>
                  <button
                    className="rounded-full border border-b-subtle px-4 py-2 text-sm text-t-secondary transition hover:border-b-default hover:text-t-primary"
                    onClick={() => onRemove(item.id)}
                    type="button"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
