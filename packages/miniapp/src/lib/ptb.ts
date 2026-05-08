import { Transaction } from "@mysten/sui/transactions";

import { readPublicEnv } from "./env";

export interface BuildOnboardTxArgs {
  /** Sender / zkLogin Sui address */
  sender: string;
  /** Base64-encoded Ed25519 public key for the per-user delegated signer */
  delegatedPubkeyBase64: string;
  /** Daily cap in micros (e.g. 100_000_000 for 100 dUSDC at 6 decimals) */
  dailyCapMicros: bigint;
  /** Amount of dUSDC starter to mint, in micros (default 25 dUSDC) */
  starterAmountMicros?: bigint;
}

/**
 * Build a single PTB that:
 *   1. Calls predict::create_manager → PredictManager
 *   2. Mints `starterAmountMicros` dUSDC from the dev TreasuryCap
 *   3. Calls updown::account::new<DUSDC>(predict_manager, delegated_pubkey, daily_cap, coin)
 *
 * The transaction is intended to be sponsored by Enoki — the sender pays no gas.
 */
export function buildOnboardTx(args: BuildOnboardTxArgs): Transaction {
  const env = readPublicEnv();
  const tx = new Transaction();
  tx.setSender(args.sender);

  const starter = args.starterAmountMicros ?? 25_000_000n;

  // 1. Create a fresh PredictManager for this user.
  const predictManager = tx.moveCall({
    target: `${env.NEXT_PUBLIC_PREDICT_PACKAGE_ID}::predict::create_manager`,
    arguments: [],
  });

  // 2. Mint dUSDC starter from the dev TreasuryCap (testnet only).
  const starterCoin = tx.moveCall({
    target: `0x2::coin::mint`,
    typeArguments: [env.NEXT_PUBLIC_DUSDC_TYPE],
    arguments: [
      tx.object(env.NEXT_PUBLIC_DUSDC_TREASURY_CAP_ID),
      tx.pure.u64(starter),
    ],
  });

  // 3. Decode the delegated pubkey base64 into a vector<u8> arg.
  const pubkeyBytes = decodeBase64ToBytes(args.delegatedPubkeyBase64);

  // 4. Create the BettingAccount; transfer-back of OwnerCap and the new
  //    PredictManager is handled inside `updown::account::new`.
  tx.moveCall({
    target: `${env.NEXT_PUBLIC_UPDOWN_PACKAGE_ID}::account::new`,
    typeArguments: [env.NEXT_PUBLIC_DUSDC_TYPE],
    arguments: [
      predictManager,
      tx.pure.vector("u8", Array.from(pubkeyBytes)),
      tx.pure.u64(args.dailyCapMicros),
      starterCoin,
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
