"use client";

import { useEffect, useState } from "react";

const COLORS = ["var(--color-butter)", "var(--color-tangerine)", "var(--color-cream-bright)", "var(--color-teal)", "var(--color-butter-deep)"];
const PIECES = 46;

// Deterministic "randomness" so server and client agree and every burst looks the same.
function noise(index: number, salt: number) {
  const x = Math.sin(index * 12.9898 + salt * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Paper confetti for the one moment that earns it: a winner, the first time
 * it's seen. Purely decorative (aria-hidden), never rendered under reduced
 * motion by its caller, and cleared from the DOM once it has fallen.
 */
export function Confetti() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDone(true), 3200);
    return () => clearTimeout(timer);
  }, []);
  if (done) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -top-6 z-20 h-[140%] overflow-visible">
      {Array.from({ length: PIECES }, (_, index) => {
        const left = noise(index, 1) * 100;
        const size = 6 + noise(index, 2) * 8;
        const round = noise(index, 3) > 0.7;
        return (
          <span
            key={index}
            className="absolute top-0 block border border-cocoa/40"
            style={
              {
                left: `${left}%`,
                width: `${size}px`,
                height: `${round ? size : size * 0.55}px`,
                borderRadius: round ? "9999px" : "2px",
                backgroundColor: COLORS[index % COLORS.length],
                "--confetti-drift": `${(noise(index, 4) - 0.5) * 160}px`,
                "--confetti-fall": `${260 + noise(index, 5) * 260}px`,
                "--confetti-spin": `${(noise(index, 6) - 0.5) * 1080}deg`,
                animation: `confetti-fall ${1400 + noise(index, 7) * 1200}ms cubic-bezier(0.25, 0.6, 0.4, 1) ${noise(index, 8) * 500}ms both`,
              } as React.CSSProperties
            }
          />
        );
      })}
    </div>
  );
}
