import type { Transaction } from "@mysten/sui/transactions";
import type { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { fromB64, toB64 } from "@mysten/sui/utils";
import { getEnv } from "../env.js";

/**
 * Minimal Enoki Sponsored Transactions client.
 *
 * Flow:
 *   1. POST /v1/transaction-blocks/sponsor with the unsigned PTB bytes + sender.
 *      Enoki returns sponsored tx bytes + a sponsor signature.
 *   2. We sign the same digest with the per-user delegated key.
 *   3. POST /v1/transaction-blocks/sponsor/:digest with the user signature to
 *      have Enoki execute it.
 *
 * Ref: https://docs.enoki.mystenlabs.com/
 */

const ENOKI_BASE_URL = "https://api.enoki.mystenlabs.com";

interface SponsorResponse {
  bytes: string;
  digest: string;
}

interface ExecuteResponse {
  digest: string;
}

async function enokiFetch<T>(
  path: string,
  init: RequestInit,
): Promise<T> {
  const env = getEnv();
  const res = await fetch(`${ENOKI_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      Authorization: `Bearer ${env.ENOKI_API_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Enoki ${path} ${res.status}: ${text}`);
  }
  const json = (await res.json()) as { data: T };
  return json.data;
}

export interface SponsorAndExecuteArgs {
  tx: Transaction;
  sender: string;
  signer: Ed25519Keypair;
  /** Optional human-readable allowed targets for tighter Enoki policy. */
  allowedMoveCallTargets?: readonly string[];
}

export async function sponsorAndExecute(
  args: SponsorAndExecuteArgs,
): Promise<{ digest: string }> {
  args.tx.setSender(args.sender);
  // We do NOT setGasPayment here — Enoki injects sponsor gas coins.
  const txBytes = await args.tx.build({ onlyTransactionKind: true });

  const sponsored = await enokiFetch<SponsorResponse>(
    "/v1/transaction-blocks/sponsor",
    {
      method: "POST",
      body: JSON.stringify({
        network: "testnet",
        transactionBlockKindBytes: toB64(txBytes),
        sender: args.sender,
        ...(args.allowedMoveCallTargets
          ? { allowedMoveCallTargets: args.allowedMoveCallTargets }
          : {}),
      }),
    },
  );

  const userSig = await args.signer.signTransaction(fromB64(sponsored.bytes));

  const executed = await enokiFetch<ExecuteResponse>(
    `/v1/transaction-blocks/sponsor/${sponsored.digest}`,
    {
      method: "POST",
      body: JSON.stringify({ signature: userSig.signature }),
    },
  );

  return { digest: executed.digest };
}
