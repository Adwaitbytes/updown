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

| Item | Value |
|---|---|
| Predict package | `0xf5ea2b370000000000000000000000000000000000000000000000000000785138` |
| Shared `Predict` object | `0xc873620400000000000000000000000000000000000000000000000000000028a` |
| `dUSDC` type | `0xe9504008000000000000000000000000000000000000000000000000000073e1a::dusdc::DUSDC` |
| Quote decimals | 6 (1 dUSDC = 1_000_000 micros) |
| Strike scale | 9 (strike on-chain = USD * 1_000_000_000) |
| BTC oracle expiries | 15m / 1h / 1d / 1w |

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
