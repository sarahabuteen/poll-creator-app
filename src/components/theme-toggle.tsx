"use client";

import { useSyncExternalStore } from "react";
import { applyTheme, NEXT_THEME, readThemePreference, type ThemePreference } from "@/lib/theme";

const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    media.removeEventListener("change", listener);
    window.removeEventListener("storage", listener);
  };
}

const LABELS: Record<ThemePreference, string> = { system: "System", light: "Light", dark: "Dark" };

function Icon({ preference }: { preference: ThemePreference }) {
  const common = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (preference === "light") {
    return (
      <svg {...common}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    );
  }
  if (preference === "dark") {
    return (
      <svg {...common}>
        <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  );
}

/** Cycles System → Light → Dark. Remembered in this browser. */
export function ThemeToggle() {
  // null during server render: the choice lives in the browser.
  const preference = useSyncExternalStore<ThemePreference | null>(subscribe, readThemePreference, () => null);
  const current = preference ?? "system";
  const next = NEXT_THEME[current];

  return (
    <button
      type="button"
      onClick={() => {
        applyTheme(next);
        listeners.forEach((notify) => notify());
      }}
      aria-label={`Theme: ${LABELS[current]}. Switch to ${LABELS[next]}`}
      title={`Theme: ${LABELS[current]}`}
      className="flex size-11 shrink-0 items-center justify-center rounded-full text-cocoa hover:bg-cream-deep"
    >
      {/* Hidden until the browser knows the choice, so the icon never flips after load. */}
      <span className={preference === null ? "invisible" : ""}>
        <Icon preference={current} />
      </span>
    </button>
  );
}
