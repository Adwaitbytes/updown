import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://updown-miniapp.vercel.app"),
  title: "Up/Down — Onboard",
  description: "Sign in with Google to onboard. Self-custodial trading on Sui via DeepBook Predict.",
  robots: { index: false, follow: false },
  openGraph: {
    title: "Up/Down — Onboard",
    description: "Self-custodial onboarding for Up/Down on Sui.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <script src="https://telegram.org/js/telegram-web-app.js" async />
      </head>
      <body>{children}</body>
    </html>
  );
}
