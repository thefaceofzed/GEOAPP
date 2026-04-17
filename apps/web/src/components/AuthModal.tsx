import { FormEvent, useState } from "react";
import { fetchProfile, login, register } from "../services/authService";
import { useSessionStore } from "../store/sessionStore";

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

type Mode = "login" | "register";

export function AuthModal({ open, onClose }: AuthModalProps) {
  const setSession = useSessionStore((state) => state.setSession);
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return null;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const session =
        mode === "login"
          ? await login(email, password)
          : await register(email, password);
      const profile = await fetchProfile();
      setSession(session, profile);
      onClose();
    } catch (submissionError: any) {
      setError(
        submissionError?.response?.data?.message ??
          "Unable to complete authentication right now.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,#0b1622,#060b13)] p-6 shadow-panel">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/80">
              Access
            </p>
            <h2 className="font-display text-2xl text-white">
              {mode === "login" ? "Resume your session" : "Create your operator account"}
            </h2>
          </div>
          <button
            className="rounded-full border border-white/10 px-3 py-1 text-sm text-white/70 transition hover:border-white/30 hover:text-white"
            onClick={onClose}
            type="button"
          >
            Close
          </button>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 rounded-full bg-white/5 p-1">
          {(["login", "register"] as const).map((value) => (
            <button
              key={value}
              className={`rounded-full px-4 py-2 text-sm transition ${
                value === mode
                  ? "bg-white text-slate-950"
                  : "text-white/70 hover:text-white"
              }`}
              onClick={() => setMode(value)}
              type="button"
            >
              {value === "login" ? "Login" : "Register"}
            </button>
          ))}
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-2 block text-sm text-white/80">Email</span>
            <input
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-300/70"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="operator@geoeconwars.app"
              required
              type="email"
              value={email}
            />
          </label>
          <label className="block">
            <span className="mb-2 block text-sm text-white/80">Password</span>
            <input
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-cyan-300/70"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
              required
              type="password"
              value={password}
            />
          </label>
          {error ? (
            <p className="rounded-2xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </p>
          ) : null}
          <button
            className="w-full rounded-full bg-[linear-gradient(120deg,#7de5ff,#ffe170)] px-5 py-3 font-semibold text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting}
            type="submit"
          >
            {submitting
              ? "Submitting..."
              : mode === "login"
                ? "Login"
                : "Create account"}
          </button>
        </form>
      </div>
    </div>
  );
}
