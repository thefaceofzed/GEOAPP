import { useEffect, useRef } from "react";

export function useFocusTrap(active: boolean) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const container = containerRef.current;
    const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab") return;
      const focusable = container.querySelectorAll<HTMLElement>(focusableSelector);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        const closeBtn = container.querySelector<HTMLElement>('button[aria-label*="close" i], button[aria-label*="Close" i]');
        closeBtn?.click();
      }
    }

    container.addEventListener("keydown", handleKeyDown);
    container.addEventListener("keydown", handleEscape);

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const firstFocusable = container.querySelector<HTMLElement>(focusableSelector);
    firstFocusable?.focus();

    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      container.removeEventListener("keydown", handleEscape);
      previouslyFocused?.focus();
    };
  }, [active]);

  return containerRef;
}
