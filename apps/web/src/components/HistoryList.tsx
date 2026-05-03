import { memo } from "react";
import { Link } from "react-router-dom";
import type { ReplayHistoryItem } from "../features/planet/types";

interface HistoryListProps {
  items: ReplayHistoryItem[];
  onCompare?: (item: ReplayHistoryItem) => void;
}

export const HistoryList = memo(function HistoryList({ items, onCompare }: HistoryListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-panel border border-dashed border-b-default bg-surface-alt p-5 text-sm text-t-secondary italic">
        No saved scenarios yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          className="flex flex-col gap-3 rounded-card border border-b-subtle bg-surface-raised p-4 sm:flex-row sm:items-center sm:justify-between transition-all shadow-raised hover:shadow-card"
          key={item.id}
        >
          <div>
            <p className="font-display text-lg font-semibold text-t-primary italic">
              {item.countryName} | {item.actionLabel}
            </p>
            <p className="text-sm text-t-secondary font-mono tabular-nums">
              Severity {item.severityScore} | {new Date(item.createdAt).toLocaleString()}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-t-tertiary font-mono">
              {item.source} | {item.note}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <Link
              className="rounded-btn border border-accent/30 px-4 py-2 text-center text-[11px] uppercase tracking-[0.2em] font-mono text-accent transition hover:border-accent hover:bg-accent-soft"
              to={item.href}
            >
              Open replay
            </Link>
            {onCompare ? (
              <button
                className="rounded-btn border border-b-subtle px-4 py-2 text-center text-[11px] uppercase tracking-[0.2em] font-mono text-t-secondary transition hover:border-accent/40 hover:text-accent"
                onClick={() => onCompare(item)}
                type="button"
              >
                Compare
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
});
