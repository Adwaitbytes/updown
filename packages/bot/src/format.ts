import type { BetIntent } from "./parsing.js";

export function formatStrike(usd: number): string {
  if (usd >= 1_000) {
    const k = usd / 1_000;
    return Number.isInteger(k) ? `$${k}k` : `$${k.toFixed(1)}k`;
  }
  return `$${usd.toLocaleString("en-US")}`;
}

export function formatWindow(label: BetIntent["windowLabel"]): string {
  switch (label) {
    case "15m":
      return "15:00";
    case "30m":
      return "30:00";
    case "1h":
      return "1:00:00";
    case "4h":
      return "4:00:00";
    case "1d":
      return "24:00:00";
    case "1w":
      return "7d";
  }
}

export function formatLockedMessage(opts: {
  intent: BetIntent;
  potentialPayoutDusdc: number;
  txDigest: string;
  network?: "testnet" | "mainnet";
}): string {
  const net = opts.network ?? "testnet";
  const sideWord = opts.intent.side === "up" ? "up" : "down";
  return [
    "Locked.",
    `BTC ${sideWord} ${formatStrike(opts.intent.strikeUsd)} in ${formatWindow(opts.intent.windowLabel)}`,
    `Stake: ${opts.intent.amountDusdc} dUSDC · Win: ${opts.potentialPayoutDusdc} dUSDC`,
    `Tx: https://suiscan.xyz/${net}/tx/${opts.txDigest}`,
  ].join("\n");
}
