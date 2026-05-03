import { useTranslation } from "react-i18next";
import { createCheckoutSession } from "../services/billingService";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useSessionStore } from "../store/sessionStore";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
}

export function PaywallModal({ open, onClose, onOpenAuth }: PaywallModalProps) {
  const { t } = useTranslation();
  const profile = useSessionStore((state) => state.profile);
  const trapRef = useFocusTrap(open);

  if (!open) return null;

  async function handleUpgrade() {
    if (!profile || profile.subjectType !== "USER") {
      onOpenAuth();
      return;
    }
    const checkout = await createCheckoutSession();
    window.location.assign(checkout.url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div ref={trapRef} role="dialog" aria-modal="true" aria-labelledby="paywall-modal-title" className="w-full max-w-lg overflow-hidden rounded-panel border border-b-default bg-surface-raised shadow-panel transition-colors animate-panel-enter">
        <div className="bg-gradient-to-r from-accent/15 via-accent/8 to-transparent px-6 py-5">
          <p className="text-[10px] uppercase tracking-[0.3em] text-sig-danger font-mono font-medium">{t("paywall.quota_reached")}</p>
          <h2 id="paywall-modal-title" className="mt-2 font-display text-3xl font-semibold text-t-primary italic">{t("paywall.headline")}</h2>
        </div>
        <div className="space-y-4 px-6 py-6 text-t-secondary">
          <p className="leading-relaxed">{t("paywall.description")}</p>
          <div className="grid gap-3 rounded-card border border-b-subtle bg-surface-alt p-4 shadow-card sm:grid-cols-3">
            {[
              [t("paywall.replays"), t("paywall.replays_desc")],
              [t("paywall.history"), t("paywall.history_desc")],
              [t("paywall.usage"), t("paywall.usage_desc")],
            ].map(([title, desc]) => (
              <div key={title}>
                <p className="text-[10px] uppercase tracking-[0.25em] text-accent font-mono">{title}</p>
                <p className="mt-1.5 text-sm text-t-primary">{desc}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              className="flex-1 rounded-btn bg-accent px-5 py-3 font-semibold text-white dark:text-[#080b12] transition hover:brightness-110 hover:shadow-glow-accent"
              onClick={handleUpgrade}
              type="button"
            >
              {profile?.subjectType === "USER" ? t("paywall.go_pro") : t("paywall.register_continue")}
            </button>
            <button
              aria-label="Close upgrade dialog"
              className="rounded-btn border border-b-default px-5 py-3 text-t-secondary transition hover:text-accent hover:border-accent/40"
              onClick={onClose}
              type="button"
            >
              {t("paywall.maybe_later")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
