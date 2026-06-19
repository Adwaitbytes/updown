import { EnokiClient } from "@mysten/enoki";
import { NextResponse } from "next/server";
import { z } from "zod";

// Executes the sponsored transaction after the client signs it with the
// zkLogin keypair. Uses the PRIVATE Enoki key (server-side only).
export const runtime = "nodejs";

const BodySchema = z.object({
  digest: z.string().min(1),
  signature: z.string().min(1),
});

export async function POST(req: Request): Promise<NextResponse> {
  let body: z.infer<typeof BodySchema>;
  try {
    body = BodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const apiKey = process.env.ENOKI_API_KEY;
  if (!apiKey || !apiKey.startsWith("enoki_private_")) {
    return NextResponse.json(
      { error: "server_misconfigured", message: "ENOKI_API_KEY must be a private key" },
      { status: 500 },
    );
  }

  try {
    const enoki = new EnokiClient({ apiKey });
    const res = await enoki.executeSponsoredTransaction({
      digest: body.digest,
      signature: body.signature,
    });
    return NextResponse.json({ digest: res.digest });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "execute_failed", message }, { status: 502 });
  }
}
