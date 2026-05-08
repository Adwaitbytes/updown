import type { JSX } from "react";

type IconName =
  | "arrow-up"
  | "arrow-down"
  | "wallet"
  | "fire"
  | "bar-chart"
  | "users-circle";

const ICONS: Record<IconName, JSX.Element> = {
  "arrow-up": (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 19V5" />
      <path d="M5 12l7-7 7 7" />
    </svg>
  ),
  "arrow-down": (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 5v14" />
      <path d="M19 12l-7 7-7-7" />
    </svg>
  ),
  wallet: (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1" />
      <path d="M3 7v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7H5a2 2 0 0 1-2-2" />
      <circle cx="16.5" cy="13.5" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  ),
  fire: (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2.5c.8 3 3 4.6 4.4 6.6A7 7 0 1 1 5.6 15c.4-2 1.7-3.3 2.9-4.4-.2 1.6.7 2.7 1.9 2.7 1.5 0 1.7-1.6 1.2-3.4-.6-2.2-.5-5 .4-7.4Z" />
    </svg>
  ),
  "bar-chart": (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 20V10" />
      <path d="M10 20V4" />
      <path d="M16 20v-8" />
      <path d="M22 20H2" />
    </svg>
  ),
  "users-circle": (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="10" r="3" />
      <circle cx="16.5" cy="11.5" r="2.25" />
      <path d="M3.5 19c.8-2.6 3-4.2 5.5-4.2s4.7 1.6 5.5 4.2" />
      <path d="M15 19c.5-1.7 1.9-2.8 3.5-2.8s3 1.1 3.5 2.8" />
    </svg>
  ),
};

type Command = {
  readonly icon: IconName;
  readonly badgeBg: string;
  readonly badgeFg: string;
  readonly accent: string;
  readonly command: string;
  readonly slash: string;
  readonly rest: string;
  readonly kicker: string;
  readonly description: string;
};

const COMMANDS: readonly Command[] = [
  {
    icon: "arrow-up",
    badgeBg: "var(--color-up)",
    badgeFg: "#ffffff",
    accent: "var(--color-up)",
    command: "/up <strike> <window> <amount>",
    slash: "/",
    rest: "up <strike> <window> <amount>",
    kicker: "Take the BULL side",
    description:
      "Bet that BTC closes above the strike at expiry. Example: /up 70k 15m 100 — risk 100 dUSDC that BTC > $70,000 in 15 minutes. Win pays 1.7× minus a 0.5% house vig.",
  },
  {
    icon: "arrow-down",
    badgeBg: "var(--color-down)",
    badgeFg: "#ffffff",
    accent: "var(--color-down)",
    command: "/down <strike> <window> <amount>",
    slash: "/",
    rest: "down <strike> <window> <amount>",
    kicker: "Take the BEAR side",
    description:
      "Bet that BTC closes below the strike at expiry. Same windows: 15m, 1h, 1d, 1w. Same payout structure. Settled by the same protocol DeepBook Predict uses for institutional flow.",
  },
  {
    icon: "wallet",
    badgeBg: "var(--color-spark)",
    badgeFg: "#ffffff",
    accent: "var(--color-spark)",
    command: "/balance",
    slash: "/",
    rest: "balance",
    kicker: "Account snapshot",
    description:
      "dUSDC balance, open positions with live P&L, your daily cap remaining, and a one-tap link to top up or withdraw via the Mini App.",
  },
  {
    icon: "fire",
    badgeBg: "var(--color-flash)",
    badgeFg: "var(--color-bg-ink)",
    accent: "var(--color-flash)",
    command: "/streak",
    slash: "/",
    rest: "streak",
    kicker: "Your trophy case",
    description:
      "Your current win streak, your best streak ever, and your minted Bronze (3) / Silver (7) / Gold (30) streak NFTs. Tap any NFT to view it on Sui block explorer.",
  },
  {
    icon: "bar-chart",
    badgeBg: "var(--color-mint)",
    badgeFg: "var(--color-bg-ink)",
    accent: "var(--color-mint)",
    command: "/leader",
    slash: "/",
    rest: "leader",
    kicker: "This week, this group",
    description:
      "Group leaderboard ranked by net profit. Tap any user to mirror their next bet — capped daily so a hot streak from someone else can't drain you.",
  },
  {
    icon: "users-circle",
    badgeBg: "var(--color-bg-ink)",
    badgeFg: "#ffffff",
    accent: "var(--color-bg-ink)",
    command: "/copy <user> <amount>",
    slash: "/",
    rest: "copy <user> <amount>",
    kicker: "Mirror the leader",
    description:
      "For 24h, every bet that user makes also runs at <amount> from your account. Hard ceiling: total /copy spend ≤ 4× <amount> per day. One-tap revoke.",
  },
] as const;

const STAGGER_DELAYS = [
  "[animation-delay:0ms]",
  "[animation-delay:80ms]",
  "[animation-delay:160ms]",
  "[animation-delay:240ms]",
  "[animation-delay:320ms]",
  "[animation-delay:400ms]",
] as const;

function CommandCard({
  cmd,
  delayClass,
}: {
  cmd: Command;
  delayClass: string;
}): JSX.Element {
  return (
    <div
      className={[
        "group card flex flex-col p-7 min-h-[280px]",
        "transition-[transform,box-shadow,border-color] duration-[220ms] ease-[cubic-bezier(0.2,0.7,0.2,1)]",
        "hover:-translate-y-0.5 hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-elev)]",
        "[animation:section-fade-up_0.6s_both]",
        delayClass,
      ].join(" ")}
    >
      {/* Accent badge */}
      <div
        className="flex h-9 w-9 items-center justify-center rounded-xl transition-transform duration-[220ms] ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:rotate-6"
        style={{ background: cmd.badgeBg, color: cmd.badgeFg }}
        aria-hidden="true"
      >
        {ICONS[cmd.icon]}
      </div>

      {/* Command */}
      <div className="mt-6 font-mono text-2xl md:text-3xl font-medium tracking-tight text-[var(--color-fg)] break-words">
        <span style={{ color: cmd.accent }}>{cmd.slash}</span>
        {cmd.rest}
      </div>

      {/* Kicker */}
      <div className="mt-3 text-eyebrow">{cmd.kicker}</div>

      {/* Description (pinned bottom) */}
      <p className="mt-auto pt-6 text-sm leading-relaxed text-[var(--color-fg-muted)]">
        {cmd.description}
      </p>
    </div>
  );
}

export function CommandsGrid(): JSX.Element {
  return (
    <section id="commands" className="fade-up py-32">
      <div className="container-page">
        {/* Header */}
        <div className="mb-16 flex max-w-[720px] flex-col gap-5">
          <div>
            <span className="pill">02 — Commands</span>
          </div>
          <h2 className="text-display-sm text-[var(--color-fg)] whitespace-pre-line">
            {"Six messages.\nOne live trading desk."}
          </h2>
          <p className="max-w-xl text-lg text-[var(--color-fg-muted)]">
            Every command works the same way: type, send, done. The bot signs
            Sui PTBs server-side using a capped delegated key — bounded by a
            Move policy you can revoke at any time.
          </p>
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {COMMANDS.map((cmd, i) => (
            <CommandCard
              key={cmd.command}
              cmd={cmd}
              delayClass={STAGGER_DELAYS[i] ?? ""}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

export default CommandsGrid;
