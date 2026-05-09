import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "#f7f7f7",
          padding: 80,
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontFamily: "monospace",
            fontSize: 28,
            color: "#26b863",
          }}
        >
          LIVE ON SUI · DEEPBOOK PREDICT
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 40,
            fontSize: 110,
            color: "#000f1d",
          }}
        >
          Bet on BTC <span style={{ color: "#26b863", marginLeft: 24 }}>up</span>
        </div>
        <div style={{ display: "flex", fontSize: 110, color: "#000f1d" }}>
          or <span style={{ color: "#e84658", marginLeft: 24 }}>down</span>.
        </div>
        <div style={{ display: "flex", fontSize: 110, color: "#000f1d" }}>
          15 minutes. On-chain.
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 60,
            fontSize: 30,
            color: "#000f1d",
          }}
        >
          Telegram-native binary options · Self-custodial · DeepBook Predict on Sui
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
