import { Transaction } from "@mysten/sui/transactions";

import { query, withTx } from "./db.js";
import { loadEnv } from "./env.js";
import { log } from "./log.js";
import { getSettlerSigner, getSuiClient } from "./sui.js";

interface StreakMintJobRow {
  id: string;
  telegram_user_id: string;
  recipient: string;
  tier: number;
  wins: number;
  account_id: string;
  image_url: string;
}

export async function runStreakMintBatch(
  limit: number = 25,
): Promise<{ minted: number; errors: number }> {
  const env = loadEnv();
  let minted = 0;
  let errors = 0;

  const { rows } = await query<StreakMintJobRow>(
    `SELECT id::text AS id, telegram_user_id, recipient, tier, wins,
            account_id, image_url
       FROM streak_mint_jobs
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT $1`,
    [limit],
  );

  if (rows.length === 0) {
    log.debug("no pending streak mints");
    return { minted, errors };
  }

  const client = getSuiClient();
  const signer = getSettlerSigner();

  for (const job of rows) {
    try {
      const tx = new Transaction();
      const imageUrl =
        job.image_url || `${env.STREAK_IMAGE_BASE_URL}/${job.tier}.svg`;
      // Move signature:
      //   mint_for(&MintCap, address, u8 tier, u64 wins, ID for_account,
      //            String image_url, &Clock, &mut TxContext)
      tx.moveCall({
        target: `${env.UPDOWN_PACKAGE_ID}::streak::mint_for`,
        arguments: [
          tx.object(env.STREAK_MINT_CAP_ID),
          tx.pure.address(job.recipient),
          tx.pure.u8(job.tier),
          tx.pure.u64(BigInt(job.wins)),
          tx.pure.id(job.account_id),
          tx.pure.string(imageUrl),
          tx.object("0x6"),
        ],
      });

      const txBytes = await tx.build({ client });
      const result = await client.signAndExecuteTransaction({
        transaction: txBytes,
        signer,
        options: { showEffects: true, showObjectChanges: true },
      });

      const nftId = pickStreakNftId(result, env.UPDOWN_PACKAGE_ID);

      await withTx(async (c) => {
        await c.query(
          `UPDATE streak_mint_jobs
              SET status = 'completed',
                  nft_obj_id = $1,
                  sui_tx_digest = $2,
                  attempts = attempts + 1,
                  updated_at = NOW()
            WHERE id = $3`,
          [nftId, result.digest, job.id],
        );
        // Mirror onto streaks so the bot/miniapp can show the active NFT
        // and gate future mints by tier.
        await c.query(
          `UPDATE streaks
              SET last_tier_minted = $1,
                  nft_obj_id = $2,
                  last_updated = NOW()
            WHERE telegram_user_id = $3`,
          [job.tier, nftId, job.telegram_user_id],
        );
      });

      minted += 1;
      log.info({ jobId: job.id, tier: job.tier, nftId }, "minted streak nft");
    } catch (err) {
      errors += 1;
      log.error({ err, jobId: job.id }, "streak mint failed");
      await query(
        `UPDATE streak_mint_jobs
            SET status = 'failed',
                error = $1,
                attempts = attempts + 1,
                updated_at = NOW()
          WHERE id = $2`,
        [errMsg(err), job.id],
      ).catch(() => undefined);
    }
  }

  return { minted, errors };
}

interface ObjectChange {
  type: string;
  objectType?: string;
  objectId?: string;
}

interface TxRes {
  objectChanges?: ReadonlyArray<ObjectChange> | null;
}

function pickStreakNftId(result: TxRes, updownPkg: string): string | null {
  // Move struct is `StreakNft` (PascalCase, lower-case `ft`); the prior
  // `StreakNFT` matcher always returned null.
  const target = `${updownPkg}::streak::StreakNft`;
  for (const ch of result.objectChanges ?? []) {
    if (
      ch.type === "created" &&
      ch.objectType?.startsWith(target) &&
      ch.objectId
    ) {
      return ch.objectId;
    }
  }
  return null;
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// CLI entrypoint
if (process.argv[1] && process.argv[1].endsWith("streak-nft.ts")) {
  runStreakMintBatch()
    .then((r) => {
      log.info(r, "streak run complete");
      process.exit(0);
    })
    .catch((err) => {
      log.error({ err }, "streak run failed");
      process.exit(1);
    });
}
