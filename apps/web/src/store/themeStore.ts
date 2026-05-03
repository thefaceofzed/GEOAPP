import { create } from "zustand";

type ThemeChoice = "dark" | "light" | "system";

interface ThemeState {
  choice: ThemeChoice;
  resolved: "dark" | "light";
  setChoice: (choice: ThemeChoice) => void;
}

function resolveTheme(choice: ThemeChoice): "dark" | "light" {
  if (choice !== "system") return choice;
  if (typeof window === "undefined") return "dark";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function applyThemeClass(resolved: "dark" | "light") {
  const root = document.documentElement;
  root.classList.toggle("dark", resolved === "dark");
  root.classList.toggle("light", resolved === "light");
}

function loadChoice(): ThemeChoice {
  try {
    const stored = localStorage.getItem("gw-theme");
    if (stored === "dark" || stored === "light" || stored === "system") return stored;
  } catch { /* SSR / privacy */ }
  return "dark";
}

const initial = loadChoice();
const initialResolved = resolveTheme(initial);

if (typeof document !== "undefined") {
  applyThemeClass(initialResolved);
}

export const useThemeStore = create<ThemeState>((set) => ({
  choice: initial,
  resolved: initialResolved,
  setChoice: (choice) => {
    const resolved = resolveTheme(choice);
    applyThemeClass(resolved);
    try { localStorage.setItem("gw-theme", choice); } catch { /* noop */ }
    set({ choice, resolved });
  },
}));

if (typeof window !== "undefined") {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", () => {
    const state = useThemeStore.getState();
    if (state.choice === "system") {
      const resolved = resolveTheme("system");
      applyThemeClass(resolved);
      useThemeStore.setState({ resolved });
    }
  });
}
