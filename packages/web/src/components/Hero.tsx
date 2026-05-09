import * as React from "react";

const TELEGRAM_URL = "https://t.me/UpDownBet_bot";
const GITHUB_URL = "https://github.com/Adwaitbytes/updown";

function ArrowRightSmall(): React.JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.25}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M13 5l7 7-7 7" />
    </svg>
  );
}

function CodeIconSmall(): React.JSX.Element {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M16 18l6-6-6-6M8 6l-6 6 6 6" />
    </svg>
  );
}

function PaperPlaneIcon(): React.JSX.Element {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 2L11 13" />
      <path d="M22 2l-7 20-4-9-9-4 20-7z" />
    </svg>
  );
}

type Bubble = {
  side: "in" | "out";
  text: string;
  delay: number;
};

const BUBBLES: readonly Bubble[] = [
  { side: "out", text: "/up 70k 15m 100", delay: 0 },
  {
    side: "in",
    text: "🔒 Locked.\nBTC > $70,000 in 15:00\nWin pays $170 · tx ↗",
    delay: 200,
  },
  { side: "out", text: "/balance", delay: 400 },
  {
    side: "in",
    text: "dUSDC: 245.00\nOpen: 1 position\nWin streak: 5 🔥",
    delay: 600,
  },
] as const;

function ChatBubble({ bubble }: { bubble: Bubble }): React.JSX.Element {
  const isOut = bubble.side === "out";
  return (
    <div
      className={[
        "flex",
        isOut ? "justify-end" : "justify-start",
      ].join(" ")}
      style={{
        animation: "section-fade-up 0.6s both",
        animationDelay: `${bubble.delay}ms`,
      }}
    >
      <div
        className={[
          "max-w-[78%] whitespace-pre-line rounded-2xl px-3.5 py-2 text-[0.8125rem] leading-snug",
          isOut
            ? "bg-[var(--color-bg-elev)] border border-[var(--color-border)] text-[var(--color-fg)] font-mono"
            : "bg-[var(--color-bg-ink)] text-[var(--color-fg-on-ink)]",
        ].join(" ")}
      >
        {bubble.text}
      </div>
    </div>
  );
}

function TelegramMockup(): React.JSX.Element {
  return (
    <div className="relative mx-auto w-full max-w-[360px]">
      {/* Decorative blobs behind card */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute rounded-full"
        style={{
          width: "320px",
          height: "320px",
          background: "var(--color-mint)",
          opacity: 0.3,
          filter: "blur(40px)",
          top: "-60px",
          left: "-80px",
          zIndex: -1,
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute rounded-full"
        style={{
          width: "320px",
          height: "320px",
          background: "var(--color-spark)",
          opacity: 0.3,
          filter: "blur(40px)",
          bottom: "-60px",
          right: "-80px",
          zIndex: -1,
        }}
      />

      {/* Chat card */}
      <div
        className="card rotate-1 p-5"
        style={{ boxShadow: "var(--shadow-elev)" }}
      >
        {/* Status bar pill */}
        <div className="mb-4 flex justify-center">
          <span className="pill h-7 px-3 py-0 text-[0.625rem] leading-none">
            9:41 · UpDownBot
          </span>
        </div>

        {/* Messages */}
        <div className="flex flex-col gap-2.5">
          {BUBBLES.map((b, i) => (
            <ChatBubble key={i} bubble={b} />
          ))}
        </div>

        {/* Input bar */}
        <div className="mt-4 flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-2">
          <span className="font-mono text-[0.75rem] text-[var(--color-fg-dim)]">
            Message
          </span>
          <span className="ml-auto flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-bg-ink)] text-[var(--color-fg-on-ink)]">
            <PaperPlaneIcon />
          </span>
        </div>
      </div>
    </div>
  );
}

export function Hero(): React.JSX.Element {
  return (
    <section
      className="fade-up relative overflow-hidden pt-[calc(var(--size-nav)+5rem)] pb-24"
      style={{ minHeight: "calc(100vh - var(--size-nav))" }}
    >
      <div className="container-page grid grid-cols-1 items-center gap-12 lg:grid-cols-[3fr_2fr] lg:gap-16">
        {/* Left column: copy */}
        <div className="flex flex-col gap-7">
          {/* Eyebrow pill */}
          <div>
            <span className="pill">
              <span
                aria-hidden="true"
                className="inline-block h-[10px] w-[10px] animate-pulse rounded-full bg-[var(--color-up)]"
              />
              LIVE ON SUI · DEEPBOOK PREDICT
            </span>
          </div>

          {/* Display headline */}
          <h1 className="text-display text-[var(--color-fg)] tracking-tight" style={{ wordBreak: "keep-all" }}>
            BTC <span style={{ color: "var(--color-up)" }}>up</span>{" "}
            or <span style={{ color: "var(--color-down)" }}>down</span>.
            <br />
            15&nbsp;minutes.
            <br />
            <span className="text-[var(--color-spark)]">On-chain.</span>
          </h1>

          {/* Subtitle */}
          <p
            className="text-xl text-[var(--color-fg-muted)]"
            style={{ maxWidth: "540px" }}
          >
            One Telegram message places a self-custodial trade on Sui. Win
            1.7×, settled atomically. Streak NFTs you can flex in your group.
          </p>

          {/* CTA row */}
          <div className="flex flex-col flex-wrap gap-3 sm:flex-row">
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--color-cta-bg)] px-6 py-3 font-mono text-sm font-semibold uppercase tracking-wider text-[var(--color-cta-fg)] transition-colors duration-200 hover:bg-[var(--color-cta-bg-hover)] sm:w-auto"
            >
              Open in Telegram
              <ArrowRightSmall />
            </a>
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-[var(--color-border-strong)] px-6 py-3 font-mono text-sm font-semibold uppercase tracking-wider text-[var(--color-fg)] transition-colors duration-200 hover:bg-[var(--color-bg-elev)] sm:w-auto"
            >
              <CodeIconSmall />
              View on GitHub
            </a>
          </div>

          {/* Fine print */}
          <p className="font-mono text-[0.6875rem] tracking-wide text-[var(--color-fg-dim)]">
            Free starter dUSDC · No seed phrase · 18+ where applicable
          </p>
        </div>

        {/* Right column: mockup */}
        <div className="relative">
          <TelegramMockup />
        </div>
      </div>
    </section>
  );
}

export default Hero;
