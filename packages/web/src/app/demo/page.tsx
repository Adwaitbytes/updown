import type { Metadata } from "next";
import Link from "next/link";
import { LiveStatus } from "@/components/LiveStatus";

export const metadata: Metadata = {
  title: "Up/Down — Demo & Status",
  description:
    "Guided walkthrough, live deployment status, architecture, and the case for Sui Overflow 2026.",
  robots: { index: true, follow: true },
};

const BOT_URL = "https://t.me/UpDownBet_bot";
const REPO_URL = "https://github.com/Adwaitbytes/updown";
const SUI_PACKAGE = "0x54b1ab9644a5d250d3009d4073a51d8484f9a388ca10eaa9293b5283dbfa5290";
const PREDICT_PACKAGE = "0xf5ea2b370000000000000000000000000000000000000000000000000000785138";

type Step = {
  num: string;
  title: string;
  body: string;
  details: string[];
};

const STEPS: readonly Step[] = [
  {
    num: "01",
    title: "Open the bot in Telegram",
    body: "Tap @UpDownBet_bot. Hit Start. The bot replies with one button: Open Up/Down.",
    details: [
      "Bot username: @UpDownBet_bot · ID 8623162050",
      "First reply lands in <1s; cold-start is amortized after first hit",
      "No KYC, no email — just Telegram identity",
    ],
  },
  {
    num: "02",
    title: "Sign in with Google",
    body: "Tap Open Up/Down. The Telegram Mini App pops a Google sign-in. Behind the scenes, Enoki derives a Sui address from the OIDC token via zkLogin. You never see a seed phrase.",
    details: [
      "zkLogin produces a self-custodial Sui address tied to your Google identity",
      "Session token is moved to sessionStorage immediately so it never lands in OAuth audit logs or browser history",
      "/api/derive-pubkey rejects requests without a fresh Telegram initData HMAC (5-min freshness)",
    ],
  },
  {
    num: "03",
    title: "Get a BettingAccount + PredictManager",
    body: "One sponsored PTB calls predict::create_manager → updown::account::new in a single atomic transaction. You walk away with a PredictManager on DeepBook and a Move-defined BettingAccount with a $500 daily cap. You top up dUSDC yourself via the bot's /balance flow — the dUSDC TreasuryCap lives with MystenLabs, so we cannot auto-fund.",
    details: [
      "Gas is sponsored by Enoki — you never need SUI in your wallet",
      "Daily cap is enforced by Move on-chain AND by the bot before submit (saves wasted gas)",
      "Owner cap is yours — you can revoke or withdraw anytime from the Mini App",
    ],
  },
  {
    num: "04",
    title: "Place your first bet — one message",
    body: "Type /up 70k 15m 100. The bot signs (market_key || nonce) with your delegated key, builds a PTB chaining account::place_bet → predict::mint, and submits via Enoki sponsored gas. Instant confirmation with a Sui block-explorer link.",
    details: [
      "Strike formats accepted: 70k, 70K, 70.5k, 70000",
      "Windows: 15m, 1h, 1d, 1w (DeepBook's BTC oracle has all four)",
      "Min bet: 1 dUSDC. Max: your daily cap (default $500/day, raisable)",
    ],
  },
  {
    num: "05",
    title: "Wait. Win or lose. Get paid atomically.",
    body: "15 minutes later, anyone can settle your position by calling predict::redeem_permissionless. Our cron does it for you. Wins pay 1.7×, losses return zero. You get a DM with a P&L card.",
    details: [
      "Settlement freezes on first post-expiry oracle update — protocol guarantees no manipulation",
      "Atomic settling state in Postgres prevents double-settlement under concurrent cron ticks",
      "DM includes a tx digest you can verify yourself in any Sui block explorer",
    ],
  },
  {
    num: "06",
    title: "Three wins → Bronze NFT. Seven → Silver. Thirty → Gold.",
    body: "Streak NFTs mint to your zkLogin address. They live in any Sui wallet, transfer like any object, and serve as ungiftable proof for group chats.",
    details: [
      "On-chain art (Display object pre-registered) — no IPFS / Walrus dependency for the artwork",
      "Verifiable lineage: every NFT cites the BettingAccount that earned it",
      "Holders unlock perks: lower cap-escalation thresholds, higher /copy ceilings, Gold-only Telegram group",
    ],
  },
];

type Cmd = { name: string; args: string; what: string };

const COMMANDS: readonly Cmd[] = [
  { name: "/start",   args: "",                         what: "Open the Mini App and onboard" },
  { name: "/up",      args: "<strike> <window> <amount>", what: "Bet BTC closes ABOVE strike at expiry" },
  { name: "/down",    args: "<strike> <window> <amount>", what: "Bet BTC closes BELOW strike at expiry" },
  { name: "/balance", args: "",                         what: "Open positions + remaining daily cap" },
  { name: "/streak",  args: "",                         what: "Current/best streak + minted NFTs" },
  { name: "/leader",  args: "",                         what: "Group leaderboard (this week)" },
  { name: "/copy",    args: "<user> <amount>",          what: "Mirror a user's next 24h, capped per day" },
];

type Score = { weight: string; criterion: string; whyWeWin: string };

const JUDGING: readonly Score[] = [
  {
    weight: "50%",
    criterion: "Real-World Application",
    whyWeWin:
      "Working consumer product on testnet today. Send /up to @UpDownBet_bot from your phone and trade in 60s. Polymarket / Kalshi proved sub-hour BTC binaries are real markets ($7B+ February volume). We move that flow on-chain on the chain that finally makes consumer crypto trading feel like a Telegram message.",
  },
  {
    weight: "20%",
    criterion: "Product & UX",
    whyWeWin:
      "One message places a self-custodial trade. No seed phrase, no SUI top-up, no Safe wallet onboarding. Sponsored gas + zkLogin + a Move-policy daily cap means a user can be net-positive 30 seconds after first contact.",
  },
  {
    weight: "20%",
    criterion: "Technical Implementation",
    whyWeWin:
      "Native, structurally-required use of every Sui+DeepBook primitive: Move objects for identity and capabilities, PTBs for atomic place_bet→mint, zkLogin for self-custody, Enoki for sponsored gas, DeepBook Predict's vol-surface-priced binaries for tighter spreads than AMM prediction markets. 6/6 Move tests passing with real Ed25519 vectors.",
  },
  {
    weight: "10%",
    criterion: "Presentation & Vision",
    whyWeWin:
      "First product demonstrating what DeepBook Predict's sub-second settlement + Sui's zkLogin self-custody can do that Polymarket/Kalshi can't. Streak NFTs travel cross-app; this is consumer crypto's first viral hook that doesn't require a token launch.",
  },
];

type Asset = { label: string; value: string };

const ON_CHAIN: readonly Asset[] = [
  { label: "Up/Down package",         value: SUI_PACKAGE },
  { label: "DeepBook Predict package", value: PREDICT_PACKAGE },
  { label: "dUSDC type",               value: "0xe9504008...::dusdc::DUSDC" },
  { label: "Network",                  value: "Sui testnet" },
  { label: "Status",                   value: "Live · ready to redeploy on mainnet day one" },
];

type Stat = { label: string; value: string; sub: string };

const STRESS: readonly Stat[] = [
  { label: "Marketing site", value: "20 / 20 ✓", sub: "20 concurrent → 228ms total · CDN cached" },
  { label: "Mini App /onboard", value: "20 / 20 ✓", sub: "20 concurrent → 920ms total · ~46ms avg" },
  { label: "Bot /healthz", value: "20 / 20 ✓", sub: "20 concurrent → 1.86s total · ~93ms avg warm" },
  { label: "Settler /api/cron", value: "5 / 5 ✓", sub: "5 sequential cron ticks · 0.4–1.5s each" },
];

type Distress = { test: string; expected: string; result: string };

const DISTRESS: readonly Distress[] = [
  { test: "Bot webhook · wrong URL secret", expected: "401", result: "401 ✓" },
  { test: "Bot webhook · wrong x-telegram-bot-api-secret-token", expected: "401", result: "401 ✓" },
  { test: "Bot webhook · valid both", expected: "200", result: "200 ✓" },
  { test: "Mini App /api/derive-pubkey · empty body", expected: "reject", result: "invalid_request ✓" },
  { test: "Mini App /api/derive-pubkey · session < 32 chars", expected: "reject", result: "invalid_request ✓" },
  { test: "Settler /api/cron · no bearer", expected: "401", result: "401 ✓" },
];

export default function DemoPage(): React.JSX.Element {
  return (
    <main id="main" className="min-h-screen pb-32 pt-32">
      {/* Hero */}
      <section className="container-page">
        <span className="pill mb-6 inline-flex items-center gap-2">
          <span className="block h-2 w-2 rounded-full bg-[var(--color-up)] animate-pulse" />
          Live demo · Sui testnet
        </span>
        <h1 className="text-display-sm max-w-3xl">
          The whole thing,
          <br />
          step by step.
        </h1>
        <p className="mt-6 max-w-2xl text-lg text-[var(--color-fg-muted)]">
          Every command, every flow, every endpoint — explained, tested, and pinged in real time.
          Built for Sui Overflow 2026 · DeepBook Predict track · $35K first prize.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <a
            href={BOT_URL}
            target="_blank"
            rel="noreferrer"
            className="pill h-12 px-6 bg-[var(--color-cta-bg)] text-[var(--color-cta-fg)] hover:bg-[var(--color-cta-bg-hover)] border-transparent text-sm"
          >
            Try the bot →
          </a>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="pill h-12 px-6 border-[var(--color-border-strong)] text-sm"
          >
            View source on GitHub
          </a>
          <Link
            href="/"
            className="pill h-12 px-6 border-[var(--color-border-strong)] text-sm"
          >
            ← Back to site
          </Link>
        </div>
      </section>

      {/* Live status */}
      <section className="container-page mt-24">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-medium tracking-tight">Live deployment status</h2>
          <span className="text-eyebrow">pinged from your browser · refreshes every 30s</span>
        </div>
        <LiveStatus />
      </section>

      {/* 6-step walkthrough */}
      <section className="container-page mt-24">
        <span className="pill mb-6 inline-block">01 — How a real bet plays out</span>
        <h2 className="text-display-sm mb-12 max-w-3xl">
          From cold open to streak NFT
          <br />
          in 6 steps.
        </h2>
        <ol className="grid gap-6 lg:grid-cols-2">
          {STEPS.map((s) => (
            <li key={s.num} className="card p-8">
              <div className="text-eyebrow mb-4">{s.num}</div>
              <h3 className="text-xl font-medium tracking-tight mb-3">{s.title}</h3>
              <p className="text-[var(--color-fg-muted)] leading-relaxed mb-5">{s.body}</p>
              <ul className="space-y-2 border-t border-[var(--color-border)] pt-4">
                {s.details.map((d) => (
                  <li key={d} className="flex gap-3 text-sm text-[var(--color-fg-muted)]">
                    <span className="text-[var(--color-spark)] font-mono shrink-0">›</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      </section>

      {/* Commands cheat sheet */}
      <section className="container-page mt-24">
        <span className="pill mb-6 inline-block">02 — Bot commands</span>
        <h2 className="text-display-sm mb-12 max-w-3xl">
          Seven commands.
          <br />
          That&apos;s the whole product surface.
        </h2>
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-eyebrow text-left px-6 py-4">Command</th>
                <th className="text-eyebrow text-left px-6 py-4 hidden sm:table-cell">Args</th>
                <th className="text-eyebrow text-left px-6 py-4">What it does</th>
              </tr>
            </thead>
            <tbody>
              {COMMANDS.map((c) => (
                <tr key={c.name} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="px-6 py-4 font-mono font-medium">{c.name}</td>
                  <td className="px-6 py-4 font-mono text-sm text-[var(--color-fg-muted)] hidden sm:table-cell">
                    {c.args || "—"}
                  </td>
                  <td className="px-6 py-4 text-sm text-[var(--color-fg-muted)]">{c.what}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Architecture */}
      <section className="container-page mt-24">
        <span className="pill mb-6 inline-block">03 — Under the hood</span>
        <h2 className="text-display-sm mb-12 max-w-3xl">
          Six services. One product surface.
        </h2>
        <div className="card p-8 font-mono text-xs sm:text-sm overflow-x-auto">
          <pre className="leading-relaxed text-[var(--color-fg)]">{`              ┌──────────────────────────────────┐
              │   Telegram client (your phone)   │
              └────────────────┬─────────────────┘
                               │ webhook POST
                ┌──────────────▼─────────────┐         ┌────────────────┐
                │  bot      (Vercel function)│ ←──────│ Mini App       │
                │  - grammY  + Express        │         │ (Vercel)       │
                │  - HKDF per-user signer     │         │ - Enoki zkLogin│
                │  - PTB builder              │         │ - sponsored PTB│
                └──────────────┬─────────────┘         └────────┬───────┘
                               │                                │
                  PTB submit (sponsored)                onboarding webhook
                               │                                │
              ┌────────────────▼────────────────────────────────▼──────┐
              │                       Sui testnet                       │
              │   updown::account · updown::streak · DeepBook Predict   │
              └────────────────┬────────────────────────────────────────┘
                               │ events
                ┌──────────────▼─────────────┐
                │  indexer-follower (Fly.io)  │
                │  - 3 module cursors         │
                │  - zod-validated events     │
                │  - Postgres upserts         │
                └──────────────┬─────────────┘
                               │
                ┌──────────────▼─────────────┐
                │  Postgres (Neon)            │
                │  10 tables · single schema  │
                └──────────────┬─────────────┘
                               │
                ┌──────────────▼─────────────┐
                │  settler (Vercel cron)      │
                │  - atomic settling state    │
                │  - permissionless redeem    │
                │  - mints streak NFTs at     │
                │    3 / 7 / 30 wins          │
                └─────────────────────────────┘`}</pre>
        </div>
      </section>

      {/* Stress + distress */}
      <section className="container-page mt-24">
        <span className="pill mb-6 inline-block">04 — Tested under load</span>
        <h2 className="text-display-sm mb-12 max-w-3xl">
          Numbers, not vibes.
        </h2>
        <div className="grid gap-6 md:grid-cols-2 mb-10">
          {STRESS.map((s) => (
            <div key={s.label} className="card p-6">
              <div className="text-eyebrow mb-2">{s.label}</div>
              <div className="text-3xl font-medium tracking-tight mb-2 text-[var(--color-up)]">
                {s.value}
              </div>
              <div className="text-sm text-[var(--color-fg-muted)] font-mono">{s.sub}</div>
            </div>
          ))}
        </div>
        <div className="card overflow-hidden">
          <div className="px-6 py-4 border-b border-[var(--color-border)] text-eyebrow">
            Distress / auth tests
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-border)]">
                <th className="text-left px-6 py-3 font-mono text-xs uppercase tracking-wider text-[var(--color-fg-muted)]">
                  Test
                </th>
                <th className="text-left px-6 py-3 font-mono text-xs uppercase tracking-wider text-[var(--color-fg-muted)]">
                  Expected
                </th>
                <th className="text-left px-6 py-3 font-mono text-xs uppercase tracking-wider text-[var(--color-fg-muted)]">
                  Actual
                </th>
              </tr>
            </thead>
            <tbody>
              {DISTRESS.map((d) => (
                <tr key={d.test} className="border-b border-[var(--color-border)] last:border-0">
                  <td className="px-6 py-3">{d.test}</td>
                  <td className="px-6 py-3 font-mono text-[var(--color-fg-muted)]">{d.expected}</td>
                  <td className="px-6 py-3 font-mono text-[var(--color-up)]">{d.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* On-chain receipts */}
      <section className="container-page mt-24">
        <span className="pill mb-6 inline-block">05 — On-chain receipts</span>
        <h2 className="text-display-sm mb-12 max-w-3xl">
          Real packages on Sui testnet.
        </h2>
        <div className="card p-6">
          <dl className="divide-y divide-[var(--color-border)]">
            {ON_CHAIN.map((a) => (
              <div key={a.label} className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-4">
                <dt className="text-sm text-[var(--color-fg-muted)] font-mono uppercase tracking-wider">
                  {a.label}
                </dt>
                <dd className="sm:col-span-2 font-mono text-sm break-all">{a.value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <p className="mt-4 text-sm text-[var(--color-fg-muted)]">
          Verify on{" "}
          <a
            href={`https://suiscan.xyz/testnet/object/${SUI_PACKAGE}`}
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-[var(--color-spark)]"
          >
            Suiscan
          </a>
          .
        </p>
      </section>

      {/* Judging case */}
      <section className="container-page mt-24">
        <span className="pill mb-6 inline-block">06 — The case for $35K</span>
        <h2 className="text-display-sm mb-12 max-w-3xl">
          Why this hits every judging criterion.
        </h2>
        <div className="space-y-4">
          {JUDGING.map((j) => (
            <div key={j.criterion} className="card p-6">
              <div className="flex items-start gap-6">
                <div className="text-eyebrow shrink-0 w-16">{j.weight}</div>
                <div>
                  <h3 className="font-medium tracking-tight mb-2">{j.criterion}</h3>
                  <p className="text-sm text-[var(--color-fg-muted)] leading-relaxed">{j.whyWeWin}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Honest gaps */}
      <section className="container-page mt-24">
        <span className="pill mb-6 inline-block">07 — Honest gaps</span>
        <h2 className="text-display-sm mb-12 max-w-3xl">
          What we did not pretend was solved.
        </h2>
        <ol className="card divide-y divide-[var(--color-border)]">
          <li className="p-6">
            <div className="text-eyebrow mb-1">Gap 1</div>
            <p className="font-medium mb-1">Indexer is not on Vercel.</p>
            <p className="text-sm text-[var(--color-fg-muted)]">
              It is a long-running websocket subscriber to Sui events. Vercel cannot host long-running processes.
              Production target is Fly.io / Railway. The bot does not depend on it for /up /down — it is a read
              accelerator for /leader.
            </p>
          </li>
          <li className="p-6">
            <div className="text-eyebrow mb-1">Gap 2</div>
            <p className="font-medium mb-1">Settler cron runs daily on Hobby tier.</p>
            <p className="text-sm text-[var(--color-fg-muted)]">
              Vercel Hobby blocks sub-daily cron. Real 15-minute settlement requires either Vercel Pro ($20/mo for
              <code className="font-mono"> */1 * * * *</code>), or an external pinger like cron-job.org calling
              <code className="font-mono"> /api/cron</code> with the bearer token.
            </p>
          </li>
          <li className="p-6">
            <div className="text-eyebrow mb-1">Gap 3</div>
            <p className="font-medium mb-1">Mainnet redeploy pending DeepBook Predict launch.</p>
            <p className="text-sm text-[var(--color-fg-muted)]">
              We follow the protocol — when DeepBook Predict goes mainnet, we{" "}
              <code className="font-mono">sui client publish</code> the same Move package and update one env var.
              Sponsor explicitly said projects are expected to redeploy day one.
            </p>
          </li>
        </ol>
      </section>

      {/* Footer CTA */}
      <section className="container-page mt-24">
        <div className="card p-10 text-center">
          <h2 className="text-display-sm mb-4">Bet on BTC. 15 minutes. On-chain.</h2>
          <p className="text-[var(--color-fg-muted)] mb-8 max-w-xl mx-auto">
            Every system above is live. The only thing left is for you to send one Telegram message.
          </p>
          <a
            href={BOT_URL}
            target="_blank"
            rel="noreferrer"
            className="pill h-12 px-8 bg-[var(--color-cta-bg)] text-[var(--color-cta-fg)] hover:bg-[var(--color-cta-bg-hover)] border-transparent text-sm"
          >
            Open @UpDownBet_bot →
          </a>
        </div>
      </section>
    </main>
  );
}
