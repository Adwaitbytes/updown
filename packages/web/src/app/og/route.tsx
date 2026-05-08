import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "#f7f7f7", padding: 80, fontFamily: "sans-serif" }}>
        <div style={{ fontFamily: "monospace", fontSize: 28, color: "#26b863", textTransform: "uppercase", letterSpacing: "0.06em" }}>● Live on Sui · DeepBook Predict</div>
        <div style={{ marginTop: 40, fontSize: 120, lineHeight: 0.95, fontWeight: 500, letterSpacing: "-0.045em", color: "#000f1d" }}>Bet on BTC <span style={{ color: "#26b863" }}>up</span></div>
        <div style={{ fontSize: 120, lineHeight: 0.95, fontWeight: 500, letterSpacing: "-0.045em", color: "#000f1d" }}>or <span style={{ color: "#e84658" }}>down</span>.</div>
        <div style={{ fontSize: 120, lineHeight: 0.95, fontWeight: 500, letterSpacing: "-0.045em", color: "#000f1d" }}>15 minutes. On-chain.</div>
        <div style={{ marginTop: 60, fontSize: 30, color: "#000f1da6" }}>Telegram-native binary options · Self-custodial · DeepBook Predict on Sui</div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
