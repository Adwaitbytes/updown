# Deployments

## Sui testnet

| Item | Value |
|---|---|
| `updown` package | `0x54b1ab9644a5d250d3009d4073a51d8484f9a388ca10eaa9293b5283dbfa5290` |
| Package version | 1 |
| `updown::streak::MintCap` | `0x614e09c362c14ee5c599d042de0df8cf73a7f36da9623144d3831f9cfa2e4464` |
| `Display<updown::streak::StreakNft>` | `0xbb9e32df8bc4db4af760495b746da1b3f9d3bad56c40d84078a2b026b80af80e` |
| `Publisher` | `0x3f42c5052be7b2bad00183815d6c09b86bc19379bf3dcbe6a2c332142f61258c` |
| `UpgradeCap` | `0x131e22547d8a2c9a6057a9839fd6a9db35690014fe4173fd3cd123baaa7f797e` |
| Deployer | `0x693c68be7d8de1c4eb3f1278698c97f27d3dc4de86409a382e60889e978d4325` |
| Publish digest | `2uuDpY5T2NWioexSgRQAhjXja1fa9HtTegGiAMa3wZT3` |

## DeepBook Predict on testnet (consumed)

Source of truth: `MystenLabs/deepbookv3` branch `predict-testnet-4-16`,
file `scripts/config/constants.ts`. Verified via `sui_getObject` against
`https://fullnode.testnet.sui.io:443` on 2026-05-09.

| Item | Value |
|---|---|
| Predict package | `0xf5ea2b3749c65d6e56507cc35388719aadb28f9cab873696a2f8687f5c785138` |
| Shared `Predict<DUSDC>` object | `0xc8736204d12f0a7277c86388a68bf8a194b0a14c5538ad13f22cbd8e2a38028a` |
| Predict `Registry` (shared) | `0x43af14fed5480c20ff77e2263d5f794c35b9fab7e2212903127062f4fe2a6e64` |
| Predict admin cap | `0x9faa4d2c0f4aaf7c9a50d3278490ffdf31f9ca1ffd1c41063578dcf3e29c2a6b` (held by MystenLabs) |
| `dUSDC` package | `0xe95040085976bfd54a1a07225cd46c8a2b4e8e2b6732f140a0fc49850ba73e1a` |
| `dUSDC` type | `0xe95040085976bfd54a1a07225cd46c8a2b4e8e2b6732f140a0fc49850ba73e1a::dusdc::DUSDC` |
| `dUSDC` `CoinMetadata` | `0xf3000dff421833d4bb8ed58fac146d691a3aaba2785aa1989af65a7089ca3e9c` |
| `dUSDC` `TreasuryCap` | `0x64f8a47a0af0a3b14db3a7ce89aa206ff77a9c6b5ac0eaef6db2ea46da3ced94` |
| `dUSDC` cap owner (must sign mints) | `0xcca26f7ae2e40604498294e95bacccc4652cc8cb2aa074d7ee608c7e7bdf0c29` |
| Predict indexer / API | `https://predict-server.testnet.mystenlabs.com` |
| Quote decimals | 6 (1 dUSDC = 1_000_000 micros) |
| Strike scale | 9 (strike on-chain = USD * 1_000_000_000) |
| BTC oracle tiers | 15m / 1h / 1d / 1w (BlockScholes-fed) |
| BTC oracle min strike | `50_000 * 1e9` |
| BTC oracle tick size | `1_000 * 1e6` (i.e. $1,000 increments) |
| BTC oracle ladder source | `oracle_feed/expiry.ts` — next 4 expiries per tier rotated by manager |

### dUSDC mint policy (action item)

`dUSDC::TreasuryCap` is **AddressOwner**'d to MystenLabs's deployer
`0xcca26f7ae2e40604498294e95bacccc4652cc8cb2aa074d7ee608c7e7bdf0c29`. It is **not**
public-mintable. To fund testnet users, our team must request mints from MystenLabs
(Sui Discord #deepbook-builders / `https://go.sui.io/ofw-deepbook-tg`) or set up a
sponsored faucet route on our side that calls into their service. The on-chain
`dusdcMint.ts` script signs with the cap owner's key, which we don't have.

### BTC oracles per tier (snapshot 2026-05-09 ~10:40 UTC)

Active oracles rotate continuously. The bot must call
`GET https://predict-server.testnet.mystenlabs.com/oracles?status=active` and
filter by `underlying_asset=BTC` + tier inferred from `expiry` minute/hour
(see `oracle_feed/expiry.ts::inferTier`). At any moment ~4–6 oracles are
active per tier. Snapshot of next active oracle per tier:

| Tier | Oracle ID | Expiry (UTC) |
|------|-----------|--------------|
| 15m | `0xda329cbf698289abb324e46ce3457f94dd7e2b3925e2e1448b7e4658781890b9` | 2026-05-09 10:45 |
| 1h  | `0xd17789c907c4ca7b1480bcee8a423913bf5cb32c1596ded45ac55cd9705e7ade` | 2026-05-09 11:00 |
| 1d  | `0x9afd3adc2e050d4c5496be94b6350465bbc357296558e3375b4cc4a0a1fd746b` | 2026-05-10 08:00 |
| 1w  | `0xce6e5b033958e53e54862ecc8fab274e936fb480b394ec0783b23441c877ab01` | 2026-05-15 08:00 (Fri) |

These are SNAPSHOT values, not stable env vars — the bot must look up the
current next-rolling oracle per tier on every market view / mint.

## Telegram

| Item | Value |
|---|---|
| Bot username | `@UpDownBet_bot` |
| Bot ID | 8623162050 |
| Display name | UpDownBet |

## Mainnet

Pending DeepBook Predict's mainnet launch. Day-one redeploy planned. Update this document with the new addresses on the day.

## Upgrade plan

`UpgradeCap` is held by the deployer's EOA. Before any production launch, transfer to a multisig or burn (`0x2::package::make_immutable`) per the on-chain custody decision in `move/sources/account.move` review notes.
