import { useThemeStore } from "../store/themeStore";

const choices = [
  { key: "light" as const, label: "Brief", icon: SunIcon },
  { key: "dark" as const, label: "War Room", icon: MoonIcon },
  { key: "system" as const, label: "Auto", icon: MonitorIcon },
];

export function ThemeToggle({ collapsed = false }: { collapsed?: boolean }) {
  const choice = useThemeStore((s) => s.choice);
  const setChoice = useThemeStore((s) => s.setChoice);

  return (
    <div role="radiogroup" aria-label="Theme selection" className={`flex ${collapsed ? "flex-col gap-1" : "gap-0.5"} rounded-btn p-0.5 bg-surface-alt`}
      style={{ boxShadow: "inset 0 1px 2px rgba(0,0,0,0.06)" }}
    >
      {choices.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          role="radio"
          aria-checked={choice === key}
          aria-label={`${label} theme`}
          onClick={() => setChoice(key)}
          className={`flex items-center justify-center gap-1.5 rounded-[0.4rem] px-2.5 py-1.5 text-[11px] font-medium transition-all duration-200
            ${choice === key
              ? "bg-accent text-white dark:text-[#080b12] shadow-sm"
              : "text-t-tertiary hover:text-t-secondary"
            }
            ${collapsed ? "w-full" : ""}
          `}
          title={label}
          type="button"
        >
          <Icon size={12} />
          {!collapsed && <span className="font-mono">{label}</span>}
        </button>
      ))}
    </div>
  );
}

function SunIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function MoonIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function MonitorIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}
