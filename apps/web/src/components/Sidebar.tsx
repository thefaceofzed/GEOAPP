import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AnimatePresence, motion } from "framer-motion";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useSessionStore } from "../store/sessionStore";
import { usePlanetStore } from "../store/planetStore";
import { useSidebarStore } from "../store/sidebarStore";

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  badge?: () => number | null;
}

export function Sidebar() {
  const collapsed = useSidebarStore((s) => s.collapsed);
  const toggleCollapsed = useSidebarStore((s) => s.toggle);
  const location = useLocation();
  const profile = useSessionStore((s) => s.profile);
  const { t } = useTranslation();

  const navItems: NavItem[] = [
    { path: "/app", label: t("nav.simulator"), icon: GlobeIcon },
    { path: "/intelligence", label: t("nav.intelligence"), icon: RadarIcon },
    { path: "/briefings", label: t("nav.briefings"), icon: FileTextIcon },
    { path: "/compare", label: t("nav.compare"), icon: ColumnsIcon, badge: () => usePlanetStore.getState().comparisonItems.length || null },
    { path: "/account", label: t("nav.account"), icon: UserIcon },
  ];

  return (
    <>
      {/* Desktop sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 68 : 240 }}
        transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="hidden lg:flex flex-col fixed top-0 bottom-0 z-40"
        style={{
          insetInlineStart: 0,
          background: "var(--sidebar-bg)",
          WebkitBackdropFilter: "blur(24px)",
          backdropFilter: "blur(24px)",
          boxShadow: "1px 0 0 var(--border-subtle), 4px 0 24px rgba(0,0,0,0.06)",
        }}
      >
        <div className={`flex items-center gap-3 px-4 pt-5 pb-4 ${collapsed ? "justify-center" : ""}`}>
          <Link to="/" className="flex items-center gap-3 min-w-0">
            <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-lg bg-accent text-sm font-bold text-white dark:text-[#080b12]"
              style={{ fontFamily: "'Cormorant Garamond', Georgia, serif", fontSize: "18px", fontWeight: 700 }}
            >
              G
            </div>
            <AnimatePresence>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  className="overflow-hidden whitespace-nowrap"
                >
                  <p className="font-display text-base font-semibold text-t-primary tracking-wide">
                    GeoEcon Wars
                  </p>
                  <p className="text-[10px] uppercase tracking-[0.3em] text-t-tertiary font-mono">
                    Intelligence platform
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </Link>
        </div>

        <nav className="flex-1 px-3 py-2 space-y-1" aria-label="Main navigation">
          {navItems.map((item) => {
            const active = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
            const Icon = item.icon;
            const badgeCount = item.badge?.();

            return (
              <Link
                key={item.path}
                to={item.path}
                className={`group flex items-center gap-3 rounded-card px-3 py-2.5 text-sm font-medium transition-all duration-200 relative
                  ${active
                    ? "bg-accent-soft text-accent"
                    : "text-t-secondary hover:text-t-primary hover:bg-surface-alt"
                  }
                  ${collapsed ? "justify-center" : ""}
                `}
              >
                <Icon size={20} />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      className="overflow-hidden whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {badgeCount != null && badgeCount > 0 && (
                  <span className={`flex h-5 min-w-[20px] items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white ${collapsed ? "absolute -top-1 -right-1" : "ml-auto"}`}>
                    {badgeCount}
                  </span>
                )}
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute top-1/2 -translate-y-1/2 w-[3px] h-5 bg-accent"
                    style={{ insetInlineStart: 0, borderStartEndRadius: "9999px", borderEndEndRadius: "9999px" }}
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className={`px-3 pb-4 space-y-3 ${collapsed ? "items-center" : ""}`}>
          <LanguageSwitcher collapsed={collapsed} />
          <ThemeToggle collapsed={collapsed} />

          {profile && !collapsed && (
            <div className="rounded-card border border-b-subtle bg-surface-alt px-3 py-2.5 shadow-raised">
              <p className="text-[11px] text-t-tertiary truncate font-mono">{profile.email ?? "Guest"}</p>
              <p className="text-[10px] uppercase tracking-[0.2em] font-mono font-medium text-accent mt-0.5">{profile.planTier}</p>
            </div>
          )}

          <button
            onClick={toggleCollapsed}
            className="w-full flex items-center justify-center gap-2 rounded-btn py-2 text-xs text-t-tertiary hover:text-t-secondary hover:bg-surface-alt transition-colors"
            type="button"
            aria-label={collapsed ? t("nav.expand") : t("nav.collapse")}
          >
            <ChevronIcon collapsed={collapsed} size={16} />
            {!collapsed && <span>{t("nav.collapse")}</span>}
          </button>
        </div>
      </motion.aside>

      {/* Mobile bottom nav */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around py-2 px-1"
        style={{
          background: "var(--sidebar-bg)",
          WebkitBackdropFilter: "blur(24px)",
          backdropFilter: "blur(24px)",
          boxShadow: "0 -1px 0 var(--border-subtle), 0 -4px 20px rgba(0,0,0,0.06)",
        }}
      >
        {navItems.map((item) => {
          const active = location.pathname === item.path || location.pathname.startsWith(item.path + "/");
          const Icon = item.icon;
          const badgeCount = item.badge?.();

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`relative flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg text-[10px] font-medium transition-colors
                ${active ? "text-accent" : "text-t-tertiary"}
              `}
            >
              <Icon size={20} />
              <span>{item.label}</span>
              {badgeCount != null && badgeCount > 0 && (
                <span className="absolute -top-0.5 right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-accent text-[9px] font-bold text-white">
                  {badgeCount}
                </span>
              )}
            </Link>
          );
        })}
      </nav>
    </>
  );
}

function GlobeIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function RadarIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19.07 4.93A10 10 0 0 0 6.99 3.34" />
      <path d="M4 6h.01" />
      <path d="M2.29 9.62A10 10 0 1 0 21.31 8.35" />
      <path d="M16.24 7.76A6 6 0 1 0 8.23 16.67" />
      <path d="M12 18h.01" />
      <path d="M17.99 11.66A6 6 0 0 1 15.77 16.67" />
      <circle cx="12" cy="12" r="2" />
      <path d="m13.41 10.59 5.66-5.66" />
    </svg>
  );
}

function FileTextIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function ColumnsIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="18" rx="1.5" />
      <rect x="14" y="3" width="7" height="18" rx="1.5" />
    </svg>
  );
}

function UserIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function ChevronIcon({ collapsed, size = 16 }: { collapsed: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      style={{ transform: collapsed ? "rotate(180deg)" : "none", transition: "transform 0.25s ease" }}
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
