import { createCheckoutSession } from "../services/billingService";
import { useSessionStore } from "../store/sessionStore";

interface PaywallModalProps {
  open: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
}

export function PaywallModal({
  open,
  onClose,
  onOpenAuth,
}: PaywallModalProps) {
  const profile = useSessionStore((state) => state.profile);

  if (!open) {
    return null;
  }

  async function handleUpgrade() {
    if (!profile || profile.subjectType !== "USER") {
      onOpenAuth();
      return;
    }

    const checkout = await createCheckoutSession();
    window.location.assign(checkout.url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="w-full max-w-lg overflow-hidden rounded-[2rem] border border-white/10 bg-[#09141c] shadow-panel">
        <div className="bg-[linear-gradient(120deg,rgba(255,94,91,0.2),rgba(125,229,255,0.14))] px-6 py-5">
          <p className="text-xs uppercase tracking-[0.35em] text-[#ff9a86]">
            Quota reached
          </p>
          <h2 className="mt-2 font-display text-3xl text-white">
            Keep the planet live
          </h2>
        </div>
        <div className="space-y-4 px-6 py-6 text-white/80">
          <p>
            Guests get 3 lifetime simulations. Registered free users get 3 per
            day. Pro removes the cap and keeps your history available.
          </p>
          <div className="grid gap-3 rounded-[1.5rem] border border-white/10 bg-white/5 p-4 sm:grid-cols-3">
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-signal/80">
                Replays
              </p>
              <p className="mt-2 text-sm text-white">Public links stay sharable</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-signal/80">
                History
              </p>
              <p className="mt-2 text-sm text-white">Keep prior scenarios ready</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-signal/80">
                Usage
              </p>
              <p className="mt-2 text-sm text-white">Unlimited runs with Pro</p>
            </div>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              className="flex-1 rounded-full bg-[linear-gradient(120deg,#7de5ff,#ffe170)] px-5 py-3 font-semibold text-slate-950 transition hover:brightness-105"
              onClick={handleUpgrade}
              type="button"
            >
              {profile?.subjectType === "USER" ? "Go Pro" : "Register To Continue"}
            </button>
            <button
              className="rounded-full border border-white/10 px-5 py-3 text-white transition hover:border-white/30"
              onClick={onClose}
              type="button"
            >
              Maybe later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
