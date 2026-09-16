import type { Metadata, Viewport } from "next";
import { Gabarito, Karla } from "next/font/google";
import { cookies } from "next/headers";
import { parseThemeCookie, THEME_COOKIE } from "@/lib/theme";
import "./globals.css";

const gabarito = Gabarito({
  variable: "--font-gabarito",
  subsets: ["latin"],
});

const karla = Karla({
  variable: "--font-karla",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Tiebreak",
    template: "%s · Tiebreak",
  },
  description: "Settle it in the group chat. Make a poll, share the link, reveal the winner.",
};

export const viewport: Viewport = {
  // Browser chrome matches the page: cream by day, deep cocoa at night.
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FAF2E3" },
    { media: "(prefers-color-scheme: dark)", color: "#1C130E" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const theme = parseThemeCookie((await cookies()).get(THEME_COOKIE)?.value);
  return (
    <html
      lang="en"
      className={`${gabarito.variable} ${karla.variable} h-full antialiased`}
      // An explicit theme choice is rendered by the server, so the first paint is already right.
      data-theme={theme}
      // The theme toggle changes data-theme after hydration.
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <a
          href="#main"
          className="sr-only rounded-full bg-cocoa px-5 py-3 font-display font-bold text-cream focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
        >
          Skip to main content
        </a>
        {children}
        <div aria-hidden="true" className="paper-grain" />
      </body>
    </html>
  );
}
