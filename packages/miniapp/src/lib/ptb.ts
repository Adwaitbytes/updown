import { Transaction } from "@mysten/sui/transactions";

import { readPublicEnv } from "./env";

export interface BuildOnboardTxArgs {
  /** Sender / zkLogin Sui address */
  sender: string;
  /** Base64-encoded Ed25519 public key for the per-user delegated signer */
  delegatedPubkeyBase64: string;
  /** Daily cap in micros (e.g. 100_000_000 for 100 dUSDC at 6 decimals) */
  dailyCapMicros: bigint;
}

/**
 * Build a single PTB that:
 *   1. Calls `predict::create_manager` → returns the new PredictManager id
 *   2. Mints a zero-valued `Coin<DUSDC>` with `0x2::coin::zero<DUSDC>` to seed
 *      the BettingAccount (we cannot mint dUSDC starter — the TreasuryCap is
 *      held by MystenLabs; users acquire dUSDC through the testnet faucet
 *      instead). `account::new` only requires *a* `Coin<Q>` value, not a
 *      non-empty one.
 *   3. Calls `updown::account::new<DUSDC>(predict_manager, delegated_pubkey,
 *      daily_cap, coin, &Clock, ctx)` which shares the BettingAccount and
 *      transfers the OwnerCap back to `sender`.
 *
 * Sponsored externally by Enoki.
 */
export function buildOnboardTx(args: BuildOnboardTxArgs): Transaction {
  const env = readPublicEnv();
  const tx = new Transaction();
  tx.setSender(args.sender);

  // 1. Create a fresh PredictManager for this user (returns ID).
  const predictManager = tx.moveCall({
    target: `${env.NEXT_PUBLIC_PREDICT_PACKAGE_ID}::predict::create_manager`,
    arguments: [],
  });

  // 2. Zero-valued dUSDC coin: replaces the prior `0x2::coin::mint` which
  //    required a TreasuryCap we don't own. Move-side `account::new` accepts
  //    any `Coin<Q>` (including empty) — see move/sources/account.move.
  const starterCoin = tx.moveCall({
    target: `0x2::coin::zero`,
    typeArguments: [env.NEXT_PUBLIC_DUSDC_TYPE],
    arguments: [],
  });

  // 3. Decode the delegated pubkey base64 into a vector<u8> arg.
  const pubkeyBytes = decodeBase64ToBytes(args.delegatedPubkeyBase64);

  // 4. Create the BettingAccount; transfer-back of OwnerCap and the new
  //    PredictManager is handled inside `updown::account::new`.
  //    The Move signature requires `&Clock` as the second-to-last argument
  //    (before `ctx`); pass the well-known shared Clock at 0x6.
  tx.moveCall({
    target: `${env.NEXT_PUBLIC_UPDOWN_PACKAGE_ID}::account::new`,
    typeArguments: [env.NEXT_PUBLIC_DUSDC_TYPE],
    arguments: [
      predictManager,
      tx.pure.vector("u8", Array.from(pubkeyBytes)),
      tx.pure.u64(args.dailyCapMicros),
      starterCoin,
      tx.object("0x6"),
    ],
  });

  return tx;
}

export interface BuildRevokeTxArgs {
  sender: string;
  ownerCapId: string;
  bettingAccountId: string;
}

export function buildRevokeTx(args: BuildRevokeTxArgs): Transaction {
  const env = readPublicEnv();
  const tx = new Transaction();
  tx.setSender(args.sender);

  tx.moveCall({
    target: `${env.NEXT_PUBLIC_UPDOWN_PACKAGE_ID}::account::revoke`,
    typeArguments: [env.NEXT_PUBLIC_DUSDC_TYPE],
    arguments: [
      tx.object(args.ownerCapId),
      tx.object(args.bettingAccountId),
    ],
  });

  return tx;
}

function decodeBase64ToBytes(b64: string): Uint8Array {
  if (typeof atob === "function") {
    const bin = atob(b64);
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  // Server fallback (Node).
  return new Uint8Array(Buffer.from(b64, "base64"));
}
