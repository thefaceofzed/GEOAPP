import { Link } from "react-router-dom";
import type { ReplayHistoryItem } from "../features/planet/types";

interface HistoryListProps {
  items: ReplayHistoryItem[];
}

export function HistoryList({ items }: HistoryListProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-[1.5rem] border border-dashed border-white/15 bg-white/5 p-5 text-sm text-white/60">
        No saved scenarios yet.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          className="flex flex-col gap-3 rounded-[1.5rem] border border-white/10 bg-white/5 p-4 sm:flex-row sm:items-center sm:justify-between"
          key={item.id}
        >
          <div>
            <p className="font-display text-lg text-white">
              {item.countryName} | {item.actionLabel}
            </p>
            <p className="text-sm text-white/60">
              Severity {item.severityScore} | {new Date(item.createdAt).toLocaleString()}
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/38">
              {item.source} | {item.note}
            </p>
          </div>
          <Link
            className="rounded-full border border-cyan-300/30 px-4 py-2 text-center text-sm text-cyan-200 transition hover:border-cyan-200/60 hover:text-white"
            to={item.href}
          >
            Open replay
          </Link>
        </div>
      ))}
    </div>
  );
}
