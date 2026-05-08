import type { Metadata } from "next";
import { Geist, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://updown.bet"),
  title: "Up/Down — Bet on BTC. 15 minutes. Settled on Sui.",
  description:
    "Telegram bot for sub-hour BTC up/down predictions. Self-custodial via zkLogin. Settled on-chain via DeepBook Predict on Sui.",
  openGraph: {
    title: "Up/Down — Bet on BTC. 15 minutes.",
    description:
      "Telegram-native binary options. Self-custodial. On-chain.",
    type: "website",
    images: ["/og"],
  },
  twitter: { card: "summary_large_image", images: ["/og"] },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${jetbrainsMono.variable} antialiased`}>
        <a
          href="#main"
          className="absolute left-4 top-4 -translate-y-32 focus:translate-y-0 transition rounded-full bg-[var(--color-cta-bg)] text-[var(--color-cta-fg)] px-4 py-2 text-sm font-medium z-[100]"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
