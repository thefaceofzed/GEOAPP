import { FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchProfile, login, register } from "../services/authService";
import { useFocusTrap } from "../hooks/useFocusTrap";
import { useSessionStore } from "../store/sessionStore";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

type Mode = "login" | "register";

export function AuthModal({ open, onClose }: AuthModalProps) {
  const { t } = useTranslation();
  const setSession = useSessionStore((state) => state.setSession);
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const trapRef = useFocusTrap(open);

  if (!open) return null;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const session = mode === "login" ? await login(email, password) : await register(email, password);
      const profile = await fetchProfile();
      setSession(session, profile);
      onClose();
    } catch (submissionError: any) {
      setError(submissionError?.response?.data?.message ?? "Unable to complete authentication right now.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 dark:bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div ref={trapRef} role="dialog" aria-modal="true" aria-labelledby="auth-modal-title" className="w-full max-w-md rounded-panel border border-b-default bg-surface-raised p-7 shadow-panel transition-colors animate-panel-enter">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-accent font-mono">{t("auth.secure_access")}</p>
            <h2 id="auth-modal-title" className="mt-1 font-display text-2xl font-semibold text-t-primary italic">
              {mode === "login" ? t("auth.resume_session") : t("auth.create_account")}
            </h2>
          </div>
          <button
            aria-label="Close authentication dialog"
            className="rounded-btn border border-b-subtle px-3 py-1.5 text-xs text-t-tertiary transition hover:text-t-primary hover:border-b-default"
            onClick={onClose}
            type="button"
          >
            {t("common.close")}
          </button>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-1 rounded-btn bg-surface-alt p-1" style={{ boxShadow: "inset 0 1px 3px rgba(0,0,0,0.05)" }}>
          {(["login", "register"] as const).map((value) => (
            <button
              key={value}
              className={`rounded-[0.4rem] px-4 py-2 text-sm font-medium transition ${
                value === mode
                  ? "bg-accent text-white dark:text-[#080b12] shadow-sm"
                  : "text-t-secondary hover:text-t-primary"
              }`}
              onClick={() => setMode(value)}
              type="button"
            >
              {value === "login" ? t("auth.login") : t("auth.register")}
            </button>
          ))}
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-wider text-t-tertiary font-mono">{t("auth.email_label")}</span>
            <input
              className="w-full rounded-card border border-b-default bg-surface-alt px-4 py-3 text-t-primary outline-none transition placeholder:text-t-tertiary focus:border-accent focus:shadow-glow-accent"
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t("auth.email_placeholder")}
              required
              type="email"
              value={email}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-xs uppercase tracking-wider text-t-tertiary font-mono">{t("auth.password_label")}</span>
            <input
              className="w-full rounded-card border border-b-default bg-surface-alt px-4 py-3 text-t-primary outline-none transition placeholder:text-t-tertiary focus:border-accent focus:shadow-glow-accent"
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t("auth.password_placeholder")}
              required
              type="password"
              value={password}
            />
          </label>
          {error && (
            <p role="alert" className="rounded-card border border-red-400/30 bg-red-500/8 px-4 py-3 text-sm text-red-600 dark:text-red-300">
              {error}
            </p>
          )}
          <button
            className="w-full rounded-btn bg-accent px-5 py-3.5 font-semibold text-white dark:text-[#080b12] transition hover:brightness-110 hover:shadow-glow-accent disabled:cursor-not-allowed disabled:opacity-50"
            disabled={submitting}
            type="submit"
          >
            {submitting ? t("auth.authenticating") : mode === "login" ? t("auth.login") : t("auth.create_account")}
          </button>
        </form>
      </div>
    </div>
  );
}
