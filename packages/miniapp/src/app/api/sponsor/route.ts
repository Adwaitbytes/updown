import { EnokiClient } from "@mysten/enoki";
import { NextResponse } from "next/server";
import { z } from "zod";

// Enoki forbids sponsored transactions on PUBLIC keys, so sponsorship must run
// server-side with the PRIVATE key. The client sends the transaction-kind bytes
// + zkLogin sender; we ask Enoki to sponsor gas, restricted to the exact
// move-call targets the onboarding/revoke PTBs use.
export const runtime = "nodejs";

const BodySchema = z.object({
  transactionKindBytes: z.string().min(1),
  sender: z.string().min(1),
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

  const predictPkg = process.env.NEXT_PUBLIC_PREDICT_PACKAGE_ID;
  const updownPkg = process.env.NEXT_PUBLIC_UPDOWN_PACKAGE_ID;
  // Enoki matches move-call targets against the FULL normalized address, so
  // 0x2 must be the 64-char form (short 0x2 fails the allow-list check).
  const COIN_ZERO =
    "0x0000000000000000000000000000000000000000000000000000000000000002::coin::zero";
  const allowedMoveCallTargets = [
    `${predictPkg}::predict::create_manager`,
    COIN_ZERO,
    `${updownPkg}::account::new`,
    `${updownPkg}::account::revoke`,
  ];

  try {
    const enoki = new EnokiClient({ apiKey });
    const sponsored = await enoki.createSponsoredTransaction({
      network: "testnet",
      transactionKindBytes: body.transactionKindBytes,
      sender: body.sender,
      allowedMoveCallTargets,
    });
    return NextResponse.json({ bytes: sponsored.bytes, digest: sponsored.digest });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "sponsor_failed", message }, { status: 502 });
  }
}
