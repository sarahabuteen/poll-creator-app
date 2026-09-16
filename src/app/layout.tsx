import type { Metadata, Viewport } from "next";
import { Gabarito, Karla } from "next/font/google";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { SITE_DESCRIPTION, SITE_NAME } from "@/lib/seo/site";
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
  // Relative URLs below (canonicals, the Open Graph image) resolve against the deployed site.
  metadataBase: new URL(env().NEXT_PUBLIC_APP_URL),
  title: {
    default: `${SITE_NAME}: settle it in the group chat`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // Times and scores on poll pages aren't phone numbers.
  formatDetection: { telephone: false },
  // The image comes from app/opengraph-image.tsx; pages add their own title and description.
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
  },
  twitter: { card: "summary_large_image" },
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
