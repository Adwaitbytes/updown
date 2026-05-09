import { Transaction } from "@mysten/sui/transactions";
import type { UserRow } from "../db.js";
import { getEnv } from "../env.js";
import { strikeToScale } from "./scale.js";

export interface BuildPlaceBetArgs {
  /** The full user row (provides sui_address, account_id, predict_manager_id, etc.). */
  user: UserRow;
  /** Stake amount in dUSDC micros (1e6 scale); becomes the `quantity` in `predict::mint`. */
  amountMicros: bigint;
  /** Strike price in raw USD (e.g. 70000 or 70000.5); we scale to 1e9 internally. */
  strikeUsd: number;
  /** Side of the bet: true = up, false = down. */
  isUp: boolean;
  /** Market expiry as ms since epoch. Must match the strike-matrix bucket. */
  expiryMs: bigint;
  /**
   * The on-chain DeepBook Predict `Oracle<DUSDC>` object id, resolved per tier
   * via the indexer. We refuse to fall back to anything else (e.g. predict_manager_id)
   * because that would silently corrupt the call.
   */
  oracleId: string;
  /** Ed25519 signature over `msg_hash || le_bytes(nonce)` from the per-user delegated key. */
  delegatedSig: Uint8Array;
  /**
   * Off-chain hash of (account_id, market_key, is_up, expiry, strike_scaled, amount).
   * `place_bet` re-derives this on-chain and asserts equality before debiting.
   */
  msgHash: Uint8Array;
}

/**
 * Build a single PTB that does the full place-bet flow against the real
 * DeepBook Predict on testnet:
 *
 *   1. `updown::account::place_bet<DUSDC>` returns a `Coin<DUSDC>` of size
 *      `amountMicros` from the user's locked balance — but only after Move
 *      verifies the Ed25519 signature against the registered delegated pubkey
 *      and asserts the daily cap.
 *   2. `predict::predict_manager::deposit<DUSDC>` parks that coin inside the
 *      user's `PredictManager` (the manager is the funding source for the
 *      Predict pool, NOT the mint argument).
 *   3. `predict::market_key::up|down(oracle_id, expiry_ms, strike_scaled)`
 *      builds the `MarketKey` value the pool keys positions by.
 *   4. `predict::predict::mint<DUSDC>(predict_obj, manager, oracle, key,
 *      quantity, &Clock, ctx)` mints the user's position (debits the manager
 *      balance for the premium and credits exposure).
 *
 * Gas is sponsored externally (Enoki). Caller signs with the per-user delegated
 * key; Move-side `place_bet` enforces that signature.
 */
export function buildPlaceBetTx(args: BuildPlaceBetArgs): Transaction {
  const env = getEnv();

  // Hard guard: refuse to silently fall back to predict_manager_id (the prior
  // bug). We need a real Oracle object id resolved per-tier from the indexer.
  if (
    !args.oracleId ||
    !args.oracleId.startsWith("0x") ||
    args.oracleId === args.user.predict_manager_id
  ) {
    throw new Error(
      `buildPlaceBetTx: refusing placeholder oracleId=${String(args.oracleId)}; ` +
        `resolve a real Oracle<DUSDC> id from the predict indexer first`,
    );
  }

  const tx = new Transaction();
  const strikeScaled = strikeToScale(args.strikeUsd);

  // 1. Debit BettingAccount.balance, get a Coin<DUSDC> back.
  const stakeCoin = tx.moveCall({
    target: `${env.UPDOWN_PACKAGE_ID}::account::place_bet`,
    typeArguments: [env.DUSDC_TYPE],
    arguments: [
      tx.object(args.user.account_id), // &mut BettingAccount<DUSDC>
      tx.object("0x6"), // &Clock
      tx.pure.vector("u8", Array.from(args.delegatedSig)), // ed25519 sig
      tx.pure.vector("u8", Array.from(args.msgHash)), // msg hash
      tx.pure.u64(args.amountMicros), // amount
    ],
  });

  // 2. Park the coin in the user's PredictManager. NOTE: `deposit` takes a
  // `&TxContext` (immutable reference), so we can't `tx.object`-pass ctx here;
  // the @mysten/sui SDK auto-injects it as the trailing TxContext arg.
  tx.moveCall({
    target: `${env.PREDICT_PACKAGE_ID}::predict_manager::deposit`,
    typeArguments: [env.DUSDC_TYPE],
    arguments: [
      tx.object(args.user.predict_manager_id), // &mut PredictManager<DUSDC>
      stakeCoin, // Coin<DUSDC>
    ],
  });

  // 3. Build the MarketKey via market_key::up|down(oracle_id, expiry, strike).
  const marketKey = tx.moveCall({
    target: `${env.PREDICT_PACKAGE_ID}::market_key::${args.isUp ? "up" : "down"}`,
    arguments: [
      tx.pure.id(args.oracleId),
      tx.pure.u64(args.expiryMs),
      tx.pure.u64(strikeScaled),
    ],
  });

  // 4. Mint the position.
  tx.moveCall({
    target: `${env.PREDICT_PACKAGE_ID}::predict::mint`,
    typeArguments: [env.DUSDC_TYPE],
    arguments: [
      tx.object(env.PREDICT_OBJ_ID), // &mut Predict<DUSDC>
      tx.object(args.user.predict_manager_id), // &mut PredictManager<DUSDC>
      tx.object(args.oracleId), // &Oracle<DUSDC> (OracleSVI on-chain)
      marketKey, // MarketKey
      tx.pure.u64(args.amountMicros), // quantity (1e6-scaled, same as stake)
      tx.object("0x6"), // &Clock
    ],
  });

  return tx;
}
