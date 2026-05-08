"use client";

import type { JSX } from "react";

type FaqItem = {
  readonly number: string;
  readonly question: string;
  readonly answer: string;
};

const FAQ_ITEMS: readonly FaqItem[] = [
  {
    number: "01",
    question: "Is Up/Down self-custodial?",
    answer:
      "Yes. When you sign in with Google, zkLogin derives a Sui address that only you control. Your dUSDC sits in a Move-defined BettingAccount with a daily spend cap that you can revoke from the Mini App at any moment. The bot holds a delegated key scoped to one entry function — it cannot move funds outside the betting flow.",
  },
  {
    number: "02",
    question: "What does a 1.7× win actually pay?",
    answer:
      "A correctly-called binary pays 1.7× your stake gross. We charge a 0.5% house vig on settled bets — about half what centralized prediction venues charge — so net is roughly 1.69×. Losing closes return zero. Settlement is atomic via predict::redeem_permissionless on Sui.",
  },
  {
    number: "03",
    question: "Why DeepBook Predict and not a Polymarket-style AMM?",
    answer:
      "DeepBook Predict prices every binary against a live BTC volatility surface (SVI), with sub-hour expiries already wired. AMM-based prediction markets struggle with thin liquidity at short windows. Predict's PLP vault takes the other side of every trade, so liquidity is always present. We get tighter spreads and faster settlement out of the box.",
  },
  {
    number: "04",
    question: "Do I need SUI to play?",
    answer:
      "No. Gas is sponsored via Enoki, so you never need to hold or even know about SUI. You bet in dUSDC, settled in dUSDC, withdrawable to your wallet whenever.",
  },
  {
    number: "05",
    question: "What's the minimum and maximum bet?",
    answer:
      "Minimum is 1 dUSDC. Maximum per bet is governed by your daily cap, which starts at $100/day for new accounts and increases as you build account history. You can lower your cap (or revoke entirely) any time.",
  },
  {
    number: "06",
    question: "What happens if the oracle freezes or misbehaves?",
    answer:
      "Predict has a 5-second pre-expiry blackout window where no new oracle updates land, and settlement freezes on the first post-expiry price. If the oracle stalls beyond a tolerance, positions auto-cancel and stakes return. We surface oracle health to users via /balance.",
  },
  {
    number: "07",
    question: "What's the streak NFT actually worth?",
    answer:
      "It's a Move object on Sui — Bronze (3 wins), Silver (7), Gold (30) — minted to your zkLogin address. Verifiable, transferable, viewable in any Sui wallet. Holders unlock perks: lower daily-cap escalation thresholds, higher /copy ceilings, and access to the private Gold-only Telegram group.",
  },
  {
    number: "08",
    question: "What about regulation?",
    answer:
      "Up/Down geo-blocks restricted jurisdictions (US, UK, France, and others) at onboarding via Telegram country code. Where it's available, the regulatory profile mirrors prediction markets like Polymarket and Kalshi. We are not a registered exchange or sportsbook.",
  },
] as const;

const SCOPED_STYLES = `
  .faq-item {
    transition: border-color 200ms cubic-bezier(0.2, 0.7, 0.2, 1);
  }
  .faq-item:hover {
    border-color: var(--color-border-strong);
  }
  .faq-item > summary {
    list-style: none;
  }
  .faq-item > summary::-webkit-details-marker {
    display: none;
  }
  .faq-item .chev {
    transition: transform 200ms cubic-bezier(0.2, 0.7, 0.2, 1);
  }
`;

function ChevronIcon(): JSX.Element {
  return (
    <svg
      className="chev shrink-0"
      width="20"
      height="20"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function FAQ(): JSX.Element {
  return (
    <section id="faq" className="py-32">
      <style>{SCOPED_STYLES}</style>
      <div className="container-page">
        {/* Header */}
        <div className="mb-16 flex flex-col gap-5" style={{ maxWidth: "720px" }}>
          <span className="pill self-start">05 — Questions</span>
          <h2 className="text-display-sm text-[var(--color-fg)]">
            Common questions,
            <br />
            straight answers.
          </h2>
        </div>

        {/* FAQ list */}
        <div
          className="flex flex-col gap-3"
          style={{ maxWidth: "720px" }}
        >
          {FAQ_ITEMS.map((item) => (
            <details
              key={item.number}
              className="faq-item card group cursor-pointer px-6 py-5 [&[open]_.chev]:rotate-180"
            >
              <summary className="flex items-center gap-4">
                <span className="font-mono text-sm text-[var(--color-fg-dim)] shrink-0">
                  {item.number}
                </span>
                <span className="flex-1 text-lg font-medium text-[var(--color-fg)]">
                  {item.question}
                </span>
                <span className="text-[var(--color-fg-muted)]">
                  <ChevronIcon />
                </span>
              </summary>
              <p className="text-base text-[var(--color-fg-muted)] leading-relaxed pt-3 mt-3 border-t border-[var(--color-border)]">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export default FAQ;
