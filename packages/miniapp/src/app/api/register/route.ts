import { NextResponse } from "next/server";

// Same-origin proxy to the bot's /miniapp/session webhook. The browser cannot
// POST to the bot directly: it's a different origin (CORS) and outside the
// page CSP connect-src. Proxying server-side (no CORS, no CSP) avoids both, and
// the bot still re-verifies the Telegram initData HMAC + session token itself.
export const runtime = "nodejs";

export async function POST(req: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const botUrl = process.env.NEXT_PUBLIC_BOT_WEBHOOK_URL;
  if (!botUrl) {
    return NextResponse.json(
      { error: "server_misconfigured", message: "NEXT_PUBLIC_BOT_WEBHOOK_URL not set" },
      { status: 500 },
    );
  }

  try {
    const r = await fetch(`${botUrl.replace(/\/$/, "")}/miniapp/session`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const text = await r.text();
    return new NextResponse(text, {
      status: r.status,
      headers: {
        "content-type": r.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "register_failed", message }, { status: 502 });
  }
}
