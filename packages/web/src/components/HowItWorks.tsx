import type { JSX } from "react";

type Step = {
  readonly number: string;
  readonly title: string;
  readonly description: string;
  readonly delay: string;
};

const STEPS: readonly Step[] = [
  {
    number: "01",
    title: "Sign in with Google.",
    description:
      "Open the Telegram bot, tap once to open the Mini App, sign in with Google. zkLogin gives you a Sui address you fully control — no seed phrase, no custodian. We fund your account with starter dUSDC so you can play immediately.",
    delay: "200ms",
  },
  {
    number: "02",
    title: "Text your direction.",
    description:
      "One message. Pick a strike, pick a window, pick a side. /up or /down. The bot prices it from DeepBook Predict's live BTC volatility surface and locks your position on Sui. Sponsored gas — you never need SUI.",
    delay: "400ms",
  },
  {
    number: "03",
    title: "Win, lose, mint a streak.",
    description:
      "15 minutes later, anyone can settle your position with one call to predict::redeem_permissionless. We do it for you in a cron. Wins pay 1.7×. Three wins in a row mints you a Bronze streak NFT — flexable in any Sui wallet, screenshot-perfect for the group chat.",
    delay: "600ms",
  },
] as const;

const SCOPED_STYLES = `
  @keyframes hiw-ripple {
    0% { transform: scale(0.6); opacity: 0.6; }
    100% { transform: scale(2.4); opacity: 0; }
  }
  @keyframes hiw-typing {
    from { width: 0; }
    to { width: 12.5ch; }
  }
  @keyframes hiw-caret-blink {
    0%, 49% { opacity: 1; }
    50%, 100% { opacity: 0; }
  }
  .hiw-card {
    transition: transform 220ms cubic-bezier(0.2, 0.7, 0.2, 1),
                box-shadow 220ms cubic-bezier(0.2, 0.7, 0.2, 1);
  }
  .hiw-card:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-elev);
  }
  .hiw-tap-core {
    background: var(--color-spark);
    box-shadow: 0 0 32px rgba(77, 162, 255, 0.45);
  }
  .hiw-ripple-ring {
    border: 2px solid var(--color-spark);
    animation: hiw-ripple 2.4s cubic-bezier(0.2, 0.7, 0.2, 1) infinite;
  }
  .hiw-typing-text {
    overflow: hidden;
    white-space: nowrap;
    animation: hiw-typing 1.4s steps(15, end) infinite alternate;
  }
  .hiw-caret {
    animation: hiw-caret-blink 1s step-end infinite;
  }
  .hiw-nft-stack { transition: transform 220ms cubic-bezier(0.2, 0.7, 0.2, 1); }
  .hiw-nft { transition: transform 220ms cubic-bezier(0.2, 0.7, 0.2, 1); }
  .hiw-card:hover .hiw-nft-bronze { transform: translateX(-8px) rotate(-10deg); }
  .hiw-card:hover .hiw-nft-gold { transform: translateX(8px) rotate(10deg); }
`;

function TapIllustration(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-end gap-4">
      <div className="relative flex h-[120px] w-[120px] items-center justify-center">
        <span
          aria-hidden="true"
          className="hiw-ripple-ring absolute inset-0 rounded-full"
          style={{ animationDelay: "0s", opacity: 0.3 }}
        />
        <span
          aria-hidden="true"
          className="hiw-ripple-ring absolute inset-0 rounded-full"
          style={{ animationDelay: "0.6s", opacity: 0.2 }}
        />
        <span
          aria-hidden="true"
          className="hiw-ripple-ring absolute inset-0 rounded-full"
          style={{ animationDelay: "1.2s", opacity: 0.1 }}
        />
        <span
          aria-hidden="true"
          className="hiw-tap-core relative h-[60px] w-[60px] rounded-full"
        />
      </div>
      <span className="font-mono text-[0.6875rem] tracking-wider uppercase text-[var(--color-fg-dim)]">
        ~30s onboarding
      </span>
    </div>
  );
}

function CommandIllustration(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-end gap-4">
      <div
        className="inline-flex items-center rounded-full bg-[var(--color-bg-ink)] px-6 py-3 font-mono text-sm text-[var(--color-fg-on-ink)]"
        style={{ minWidth: "16ch" }}
      >
        <span className="hiw-typing-text" aria-hidden="true">
          /up 70k 15m 100
        </span>
        <span
          aria-hidden="true"
          className="hiw-caret ml-0.5 inline-block h-[1em] w-[2px] align-middle"
          style={{ background: "var(--color-up)" }}
        />
      </div>
      <span className="font-mono text-[0.6875rem] tracking-wider uppercase text-[var(--color-fg-dim)]">
        Sponsored gas · zero SUI
      </span>
    </div>
  );
}

type NftChip = {
  readonly key: string;
  readonly label: string;
  readonly gradient: string;
  readonly className: string;
  readonly z: number;
  readonly rotate: number;
  readonly translateX: number;
  readonly shadow?: string;
  readonly fg: string;
};

const NFTS: readonly NftChip[] = [
  {
    key: "bronze",
    label: "BRONZE 3",
    gradient: "linear-gradient(135deg, rgb(255, 153, 64), rgb(232, 70, 88))",
    className: "hiw-nft-bronze",
    z: 1,
    rotate: -6,
    translateX: -28,
    fg: "rgba(255, 255, 255, 0.95)",
  },
  {
    key: "silver",
    label: "SILVER 7",
    gradient: "linear-gradient(135deg, rgb(77, 162, 255), rgb(120, 220, 232))",
    className: "hiw-nft-silver",
    z: 2,
    rotate: 0,
    translateX: 0,
    fg: "rgba(255, 255, 255, 0.95)",
  },
  {
    key: "gold",
    label: "GOLD 30",
    gradient: "linear-gradient(135deg, rgb(255, 215, 49), rgb(255, 153, 64))",
    className: "hiw-nft-gold",
    z: 3,
    rotate: 6,
    translateX: 28,
    shadow: "0 12px 28px rgba(0, 15, 29, 0.18)",
    fg: "rgba(0, 15, 29, 0.85)",
  },
];

function StreakIllustration(): JSX.Element {
  return (
    <div className="flex flex-col items-center justify-end gap-4">
      <div className="relative flex h-[100px] w-full items-center justify-center">
        {NFTS.map((nft) => (
          <div
            key={nft.key}
            className={`hiw-nft absolute h-[80px] w-[80px] rounded-2xl flex items-end p-2 ${nft.className}`}
            style={{
              background: nft.gradient,
              transform: `translateX(${nft.translateX}px) rotate(${nft.rotate}deg)`,
              zIndex: nft.z,
              boxShadow: nft.shadow ?? "0 4px 12px rgba(0, 15, 29, 0.08)",
            }}
            aria-hidden="true"
          >
            <span
              className="font-mono text-[0.5625rem] tracking-wider uppercase font-semibold"
              style={{ color: nft.fg }}
            >
              {nft.label}
            </span>
          </div>
        ))}
      </div>
      <span className="font-mono text-[0.6875rem] tracking-wider uppercase text-[var(--color-fg-dim)]">
        Mintable streak NFTs
      </span>
    </div>
  );
}

function StepIllustration({ index }: { index: number }): JSX.Element {
  if (index === 0) return <TapIllustration />;
  if (index === 1) return <CommandIllustration />;
  return <StreakIllustration />;
}

export function HowItWorks(): JSX.Element {
  return (
    <section id="how-it-works" className="fade-up py-32">
      <style>{SCOPED_STYLES}</style>
      <div className="container-page">
        {/* Header block */}
        <div
          className="mb-20 flex flex-col items-center gap-5 text-center"
          style={{ maxWidth: "720px", marginInline: "auto" }}
        >
          <span className="pill">01 — How It Works</span>
          <h2 className="text-display-sm text-[var(--color-fg)]">
            Three taps. Fifteen minutes.
            <br />
            On-chain settlement.
          </h2>
          <p className="text-lg text-[var(--color-fg-muted)]">
            Up/Down strips trading down to its essence. No charts, no spreads,
            no orderbook. Just direction and time.
          </p>
        </div>

        {/* 3-step grid */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((step, i) => (
            <article
              key={step.number}
              className="hiw-card card flex flex-col p-8"
              style={{
                minHeight: "440px",
                animation: "section-fade-up 0.6s both",
                animationDelay: step.delay,
              }}
            >
              <span
                className="font-mono text-sm uppercase text-[var(--color-fg-dim)]"
                style={{ letterSpacing: "0.06em" }}
              >
                {step.number}
              </span>
              <h3 className="mt-5 text-2xl font-medium tracking-tight text-[var(--color-fg)]">
                {step.title}
              </h3>
              <p className="mt-3 text-base leading-relaxed text-[var(--color-fg-muted)]">
                {step.description}
              </p>
              <div className="mt-auto pt-8">
                <StepIllustration index={i} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default HowItWorks;
