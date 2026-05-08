/**
 * Render a P&L share card as SVG. Returns a Buffer suitable for
 * `bot.api.sendDocument` or `bot.api.sendPhoto` (with a .svg filename).
 */

export interface PnlCardInput {
  outcome: "won" | "lost";
  pnlDusdc: number;
  side: "up" | "down";
  strikeUsd: number;
  windowLabel: string;
  winStreak: number;
  txDigest: string;
}

const W = 1200;
const H = 630;

function escapeXml(s: string): string {
  return s.replace(/[<>&"']/gu, (ch) => {
    switch (ch) {
      case "<":
        return "&lt;";
      case ">":
        return "&gt;";
      case "&":
        return "&amp;";
      case '"':
        return "&quot;";
      case "'":
        return "&apos;";
      default:
        return ch;
    }
  });
}

export function renderPnlCardSvg(input: PnlCardInput): Buffer {
  const winColor = "#22c55e";
  const lossColor = "#ef4444";
  const accent = input.outcome === "won" ? winColor : lossColor;
  const headline = input.outcome === "won" ? "WON" : "LOST";
  const sign = input.pnlDusdc >= 0 ? "+" : "";
  const pnl = `${sign}${input.pnlDusdc.toFixed(2)} dUSDC`;
  const sub = `BTC ${input.side.toUpperCase()} · $${input.strikeUsd.toLocaleString("en-US")} · ${input.windowLabel}`;
  const txShort = `${input.txDigest.slice(0, 6)}…${input.txDigest.slice(-6)}`;

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#0b0f17"/>
      <stop offset="100%" stop-color="#111827"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="40" y="40" width="${W - 80}" height="${H - 80}" rx="32" ry="32"
        fill="#0f172a" stroke="${accent}" stroke-width="4"/>
  <text x="80" y="160" font-family="Inter, ui-sans-serif" font-size="56" font-weight="800" fill="#94a3b8">UP/DOWN</text>
  <text x="80" y="280" font-family="Inter, ui-sans-serif" font-size="120" font-weight="900" fill="${accent}">${escapeXml(headline)}</text>
  <text x="80" y="380" font-family="Inter, ui-sans-serif" font-size="80" font-weight="800" fill="#f8fafc">${escapeXml(pnl)}</text>
  <text x="80" y="450" font-family="Inter, ui-sans-serif" font-size="36" font-weight="500" fill="#cbd5e1">${escapeXml(sub)}</text>
  <text x="80" y="530" font-family="Inter, ui-sans-serif" font-size="28" font-weight="600" fill="#94a3b8">Streak: ${input.winStreak} · Tx: ${escapeXml(txShort)}</text>
</svg>`;
  return Buffer.from(svg, "utf-8");
}
