// Checks every colour pair the UI uses against WCAG AA, for both themes.
// Run: node scripts/check-contrast.mjs
const light = {
  cream: "#FAF2E3", creamDeep: "#F0E3C9", card: "#FFFBF2", creamBright: "#FFF7EA",
  cocoa: "#38261A", cocoaSoft: "#77614C", cocoaFaint: "#A5937E",
  tangerine: "#E2542C", tangerineDeep: "#B93E1E", accentText: "#B93E1E",
  teal: "#1F7367", tealDeep: "#14544B", tealSoft: "#CBE2D8",
  butter: "#F3C64F", ink: "#38261A",
};
const dark = {
  cream: "#1C130E", creamDeep: "#2C1F17", card: "#261A13", creamBright: "#FFF7EA",
  cocoa: "#F4E7D4", cocoaSoft: "#C9B49C", cocoaFaint: "#6E5A4A",
  tangerine: "#E2542C", tangerineDeep: "#B93E1E", accentText: "#FF9A73",
  teal: "#4DB39E", tealDeep: "#A8E0D0", tealSoft: "#173B34",
  butter: "#F3C64F", ink: "#38261A",
};

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// [foreground, background, minimum, what]
const pairs = [
  ["cocoa", "cream", 4.5, "body text on page"],
  ["cocoa", "card", 4.5, "text on cards"],
  ["cocoa", "creamDeep", 4.5, "text on sunken panels / active pills"],
  ["cocoaSoft", "cream", 4.5, "secondary text on page"],
  ["cocoaSoft", "card", 4.5, "secondary text on cards"],
  ["cocoaSoft", "creamDeep", 4.5, "secondary text on share dock"],
  ["accentText", "cream", 4.5, "race call text"],
  ["creamBright", "tangerineDeep", 4.5, "primary button label"],
  ["creamBright", "tangerine", 3, "large text on leader card"],
  ["cream", "teal", 4.5, "label on teal buttons (Add it, Send)"],
  ["cream", "cocoa", 4.5, "label on cocoa buttons (Copy link)"],
  ["tealDeep", "tealSoft", 4.5, "Voting open pill, selected options"],
  ["cocoa", "tealSoft", 4.5, "option label on selected ballot row"],
  ["ink", "butter", 4.5, "ribbons, waiting badge, guest banner"],
  ["ink", "creamBright", 4.5, "tie button label"],
  ["teal", "creamDeep", 3, "bar fill vs track (non-text)"],
  ["teal", "card", 3, "focus ring on cards (non-text)"],
  ["teal", "cream", 3, "focus ring on page (non-text)"],
  ["cocoa", "cream", 3, "card borders (non-text)"],
  ["butter", "tangerineDeep", 3, "filled vs unfilled ticks (non-text)"],
];

let failures = 0;
for (const [name, theme] of [["light", light], ["dark", dark]]) {
  console.log(`\n${name}`);
  for (const [fg, bg, min, what] of pairs) {
    const r = ratio(theme[fg], theme[bg]);
    const ok = r >= min;
    if (!ok) failures++;
    console.log(`  ${ok ? "ok  " : "FAIL"} ${r.toFixed(2).padStart(5)} (≥${min}) ${fg} on ${bg}: ${what}`);
  }
}
process.exit(failures ? 1 : 0);
