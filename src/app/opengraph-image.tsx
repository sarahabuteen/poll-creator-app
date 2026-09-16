import { ImageResponse } from "next/og";

export const alt = "Tiebreak: settle it in the group chat. A poll card showing the leading option with its tally.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Brand-kit colours; the image is rendered outside the page, so tokens.css doesn't apply.
const cream = "#FAF2E3";
const card = "#FFFBF2";
const cocoa = "#38261A";
const cocoaSoft = "#77614C";
const tangerine = "#E2542C";
const creamBright = "#FFF7EA";
const butter = "#F3C64F";
const tickOff = "#B93E1E";

/**
 * Gabarito, subset to just this image's text. Google Fonts serves TTF (which the
 * image renderer needs) to a client that doesn't ask for WOFF2. If the fetch
 * fails, the image still renders in the default font.
 */
async function loadFont(weight: number, text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=Gabarito:wght@${weight}&text=${encodeURIComponent(text)}`)).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:truetype|opentype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

const TEXT = "tiebreakSettle it in the group chat.Make a poll, share the link, reveal the winner. No account to vote.IN THE LEADDetroit-style from Emmy’s45%5 of 11 votesPepperoni27% · 3 votes";

/** The link preview for the whole site: what a pasted Tiebreak link looks like in a chat. */
export default async function OpenGraphImage() {
  const [bold, extraBold] = await Promise.all([loadFont(600, TEXT), loadFont(800, TEXT)]);
  const fonts = [
    ...(bold ? [{ name: "Gabarito", data: bold, weight: 600 as const }] : []),
    ...(extraBold ? [{ name: "Gabarito", data: extraBold, weight: 800 as const }] : []),
  ];
  const ticks = Array.from({ length: 11 }, (_, index) => index < 5);
  return new ImageResponse(
    (
      <div style={{ display: "flex", width: "100%", height: "100%", background: cream, padding: 64, gap: 56, alignItems: "center", color: cocoa, fontFamily: "Gabarito" }}>
        <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 28 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 48, fontWeight: 800, letterSpacing: -1 }}>
            <svg width="56" height="56" viewBox="0 0 26 26">
              <circle cx="13" cy="13" r="11.3" fill={tangerine} stroke={cocoa} strokeWidth="2.4" />
              <path d="m8 13.4 3.3 3.3L18.2 9.6" fill="none" stroke={creamBright} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            tiebreak
          </div>
          <div style={{ display: "flex", fontSize: 76, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2 }}>Settle it in the group chat.</div>
          <div style={{ display: "flex", fontSize: 30, fontWeight: 600, color: cocoaSoft, lineHeight: 1.3 }}>Make a poll, share the link, reveal the winner. No account to vote.</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", width: 440, gap: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 20, background: tangerine, border: `5px solid ${cocoa}`, borderRadius: 28, padding: 32, color: creamBright }}>
            <div style={{ display: "flex", alignSelf: "flex-start", background: butter, color: cocoa, borderRadius: 999, padding: "6px 18px", fontSize: 22, fontWeight: 800, letterSpacing: 1 }}>
              IN THE LEAD
            </div>
            <div style={{ display: "flex", fontSize: 36, fontWeight: 800, lineHeight: 1.1 }}>Detroit-style from Emmy’s</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
              <div style={{ display: "flex", fontSize: 88, fontWeight: 800, lineHeight: 1 }}>45%</div>
              <div style={{ display: "flex", fontSize: 26, fontWeight: 600 }}>5 of 11 votes</div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {ticks.map((on, index) => (
                <div key={index} style={{ display: "flex", flex: 1, height: 16, borderRadius: 4, background: on ? butter : tickOff }} />
              ))}
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", background: card, border: `5px solid ${cocoa}`, borderRadius: 24, padding: "20px 28px", fontSize: 28, fontWeight: 600 }}>
            <span>Pepperoni</span>
            <span>27% · 3 votes</span>
          </div>
        </div>
      </div>
    ),
    { ...size, fonts },
  );
}
