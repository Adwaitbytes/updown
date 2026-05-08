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
  title: "Up/Down — Bet on BTC. 15 minutes. Settled on Sui.",
  description:
    "Telegram bot for sub-hour BTC up/down predictions. Self-custodial via zkLogin. Settled on-chain via DeepBook Predict on Sui.",
  openGraph: {
    title: "Up/Down — Bet on BTC. 15 minutes. Settled on Sui.",
    description:
      "Telegram-native binary options. Self-custodial. On-chain. 15-minute BTC up/down via DeepBook Predict.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${jetbrainsMono.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
