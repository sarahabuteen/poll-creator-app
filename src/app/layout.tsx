import type { Metadata } from "next";
import { Gabarito, Karla } from "next/font/google";
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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${gabarito.variable} ${karla.variable} h-full antialiased`}
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
