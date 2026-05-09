import type { JSX } from "react";

type Outcome = "win" | "loss";
type Direction = "up" | "down";

type Win = {
  readonly user: string;
  readonly outcome: Outcome;
  readonly pnl: number;
  readonly dir: Direction;
  readonly strike: number;
  readonly window: string;
  readonly stake: number;
  readonly ago: string;
};

const wins: readonly Win[] = [
  { user: "@miguel_btc", outcome: "win", pnl: 170.0, dir: "up", strike: 70000, window: "15m", stake: 100, ago: "2m ago" },
  { user: "@kaori.sui", outcome: "win", pnl: 425.5, dir: "down", strike: 68500, window: "15m", stake: 250, ago: "8m ago" },
  { user: "@degen_sam", outcome: "loss", pnl: -100.0, dir: "up", strike: 71000, window: "15m", stake: 100, ago: "12m ago" },
  { user: "@anna_v", outcome: "win", pnl: 850.0, dir: "up", strike: 69000, window: "1h", stake: 500, ago: "21m ago" },
  { user: "@yatharth", outcome: "win", pnl: 1700.0, dir: "down", strike: 72000, window: "15m", stake: 1000, ago: "34m ago" },
  { user: "@priya.eth", outcome: "loss", pnl: -50.0, dir: "down", strike: 70500, window: "15m", stake: 50, ago: "47m ago" },
  { user: "@rohan_8", outcome: "win", pnl: 340.0, dir: "up", strike: 69500, window: "1h", stake: 200, ago: "55m ago" },
  { user: "@shadowflux", outcome: "win", pnl: 595.0, dir: "down", strike: 71500, window: "1d", stake: 350, ago: "1h ago" },
] as const;

const AVATAR_GRADIENTS: readonly string[] = [
  "from-emerald-400 to-cyan-400",
  "from-rose-400 to-orange-400",
  "from-violet-400 to-blue-400",
  "from-amber-300 to-pink-400",
  "from-lime-300 to-emerald-500",
] as const;

function avatarGradient(user: string): string {
  // Strip leading "@" so the hash is based on the first letter of the handle.
  const firstChar = user.replace(/^@/, "").charAt(0);
  const idx = firstChar.charCodeAt(0) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[idx] ?? AVATAR_GRADIENTS[0]!;
}

function formatPnl(pnl: number): string {
  const sign = pnl >= 0 ? "+" : "-";
  const abs = Math.abs(pnl).toFixed(2);
  return `${sign}$${abs}`;
}

function formatStrike(strike: number): string {
  return `$${strike.toLocaleString("en-US")}`;
}

function TxnArrowIcon(): JSX.Element {
  return (
    <svg
      aria-hidden="true"
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2.5 7.5L7.5 2.5" />
      <path d="M3.5 2.5H7.5V6.5" />
    </svg>
  );
}

function Dot(): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-1 w-1 rounded-full bg-[var(--color-fg-dim)]"
    />
  );
}

function PnlCard({ win }: { win: Win }): JSX.Element {
  const isWin = win.outcome === "win";
  const isUp = win.dir === "up";
  const pnlColor = isWin ? "var(--color-up)" : "var(--color-down)";
  const dirColor = isUp ? "var(--color-up)" : "var(--color-down)";
  const dirSoft = isUp ? "var(--color-up-soft)" : "var(--color-down-soft)";
  const statusColor = isWin ? "var(--color-up)" : "var(--color-down)";
  const statusSoft = isWin ? "var(--color-up-soft)" : "var(--color-down-soft)";

  return (
    <article
      className="card flex shrink-0 flex-col gap-3 p-5"
      style={{ width: "320px" }}
    >
      {/* Top row: avatar, handle, status */}
      <div className="flex items-center gap-3">
        <div
          aria-hidden="true"
          className={`h-10 w-10 shrink-0 rounded-full bg-gradient-to-br ${avatarGradient(
            win.user,
          )}`}
        />
        <span className="flex-1 truncate font-mono text-sm font-semibold text-[var(--color-fg)]">
          {win.user}
        </span>
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 font-mono text-[0.625rem] font-semibold tracking-wider uppercase"
          style={{
            background: statusSoft,
            color: statusColor,
          }}
        >
          {isWin ? "WIN" : "LOSS"}
        </span>
      </div>

      {/* Middle: huge P&L number */}
      <div
        className="font-mono text-3xl font-medium tracking-tight"
        style={{ color: pnlColor }}
      >
        {formatPnl(win.pnl)}
      </div>

      {/* Detail row: direction badge + strike + window + stake */}
      <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-[var(--color-fg-muted)]">
        <span
          className="inline-flex items-center rounded-full px-2 py-0.5 font-semibold tracking-wider uppercase"
          style={{
            background: dirSoft,
            color: dirColor,
          }}
        >
          {isUp ? "UP" : "DOWN"}
        </span>
        <Dot />
        <span>{formatStrike(win.strike)}</span>
        <Dot />
        <span>{win.window}</span>
        <Dot />
        <span>{win.stake} dUSDC</span>
      </div>

      {/* Bottom row: timestamp + tx link */}
      <div className="mt-1 flex items-center justify-between border-t border-[var(--color-border)] pt-3">
        <span className="font-mono text-xs text-[var(--color-fg-dim)]">
          {win.ago}
        </span>
        <a
          href="#"
          className="inline-flex items-center gap-1 font-mono text-xs text-[var(--color-fg-muted)] underline decoration-[var(--color-border-strong)] underline-offset-4 transition-colors hover:text-[var(--color-fg)]"
        >
          tx
          <TxnArrowIcon />
        </a>
      </div>
    </article>
  );
}

export function HallOfFame(): JSX.Element {
  const loop: readonly Win[] = [...wins, ...wins];

  return (
    <section id="hall-of-fame" className="fade-up py-32">
      <div className="container-page">
        {/* Header */}
        <div className="mb-12 flex flex-col items-start gap-5">
          <span className="pill">04 — Hall of Fame</span>
          <h2 className="text-display-sm text-[var(--color-fg)]">
            Real wins.
            <br />
            Real Sui txns.
          </h2>
          <p className="max-w-xl text-lg text-[var(--color-fg-muted)]">
            Auto-posted to a public Telegram channel every time someone clears
            $100+. Click any txn link to verify settlement on the Sui block
            explorer.
          </p>
        </div>
      </div>

      {/* Marquee strip — full bleed */}
      <div
        className="group relative w-screen overflow-hidden"
        style={{
          maskImage:
            "linear-gradient(to right, transparent 0, black 5%, black 95%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0, black 5%, black 95%, transparent 100%)",
        }}
      >
        <div
          className="flex w-max gap-5 animate-[marquee_40s_linear_infinite] group-hover:[animation-play-state:paused]"
        >
          {loop.map((win, i) => (
            <PnlCard key={`${win.user}-${i}`} win={win} />
          ))}
        </div>
      </div>

      <div className="container-page">
        {/* Footer link */}
        <div className="mt-12 text-center font-mono text-sm text-[var(--color-fg-muted)]">
          Subscribe to the public channel{" "}
          <span aria-hidden="true">→</span>{" "}
          <a
            href="https://t.me/UpDownHallOfFame"
            target="_blank"
            rel="noreferrer"
            className="text-[var(--color-fg)] underline decoration-[var(--color-border-strong)] underline-offset-4 transition-colors hover:decoration-[var(--color-fg)]"
          >
            @UpDownHallOfFame
          </a>
        </div>
      </div>
    </section>
  );
}

export default HallOfFame;
