import { Transaction } from "@mysten/sui/transactions";
import { getEnv } from "../env.js";

export interface BuildPlaceBetArgs {
  /** The user's `Account` object id (the per-user delegated account on Updown). */
  accountId: string;
  /** OwnerCap object id authorizing the bet on the user's account. */
  ownerCapId: string;
  /** Pre-existing Predict::Manager id for the user. */
  predictManagerId: string;
  /** Stake amount in dUSDC micros (1e6 scale). */
  amountMicros: bigint;
  /** Market key (BCS-encoded vector<u8>) identifying the binary market. */
  marketKey: Uint8Array;
  /** Side of the bet: true = up, false = down. */
  isUp: boolean;
  /** Expiry as ms since epoch, used to assert market alignment. */
  expiryMs: bigint;
  /** Strike scaled to 1e9. */
  strikeScaled: bigint;
  /** Oracle object id used to resolve the market. */
  oracleId: string;
}

/**
 * Build a PTB that:
 *   1. Calls `updown::account::place_bet` to debit the user's locked balance,
 *      returning a `Coin<DUSDC>` of size = amountMicros.
 *   2. Pipes that coin into `predict::mint` to mint a position NFT for the user.
 *
 * Gas is expected to be sponsored externally (Enoki Sponsored Tx). Caller sets
 * sender + signs with the per-user delegated key; the policy in `place_bet`
 * gates that the signer matches the registered delegated pubkey.
 */
export function buildPlaceBetTx(args: BuildPlaceBetArgs): Transaction {
  const env = getEnv();
  const tx = new Transaction();

  // Step 1: place_bet returns a Coin<DUSDC> we can plug into predict::mint.
  const stakeCoin = tx.moveCall({
    target: `${env.UPDOWN_PACKAGE_ID}::account::place_bet`,
    typeArguments: [env.DUSDC_TYPE],
    arguments: [
      tx.object(args.accountId),
      tx.object(args.ownerCapId),
      tx.pure.u64(args.amountMicros),
      tx.pure.vector("u8", Array.from(args.marketKey)),
      tx.pure.bool(args.isUp),
      tx.pure.u64(args.expiryMs),
      tx.pure.u128(args.strikeScaled),
    ],
  });

  // Step 2: mint a Predict position from the staked coin.
  tx.moveCall({
    target: `${env.PREDICT_PACKAGE_ID}::predict::mint`,
    typeArguments: [env.DUSDC_TYPE],
    arguments: [
      tx.object(env.PREDICT_OBJ_ID),
      tx.object(args.predictManagerId),
      tx.object(args.oracleId),
      tx.pure.vector("u8", Array.from(args.marketKey)),
      tx.pure.bool(args.isUp),
      stakeCoin,
      tx.object("0x6"), // Clock
    ],
  });

  return tx;
}
