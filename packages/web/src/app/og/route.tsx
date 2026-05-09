import { ImageResponse } from "next/og";

// Edge runtime + Geist Sans bundling fails silently with a 0-byte image in
// Vercel's prod edge. Use nodejs runtime — adds ~100ms but produces a real PNG.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "1200px",
          height: "630px",
          background: "#f7f7f7",
          padding: "80px",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 28,
            color: "#26b863",
          }}
        >
          LIVE ON SUI . DEEPBOOK PREDICT
        </div>
        <div
          style={{
            display: "flex",
            marginTop: "40px",
            fontSize: 110,
            color: "#000f1d",
          }}
        >
          BTC{" "}
          <span style={{ color: "#26b863", marginLeft: "24px" }}>up</span>
        </div>
        <div style={{ display: "flex", fontSize: 110, color: "#000f1d" }}>
          or{" "}
          <span style={{ color: "#e84658", marginLeft: "24px" }}>down</span>.
        </div>
        <div style={{ display: "flex", fontSize: 110, color: "#000f1d" }}>
          15 minutes. On-chain.
        </div>
        <div
          style={{
            display: "flex",
            marginTop: "60px",
            fontSize: 30,
            color: "#46556a",
          }}
        >
          Telegram-native binary options. Self-custodial. DeepBook Predict on Sui.
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
