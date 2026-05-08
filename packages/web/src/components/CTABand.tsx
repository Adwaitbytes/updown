import type { JSX } from "react";

const TELEGRAM_URL = "https://t.me/UpDownBetaBot";
const BOT_USERNAME = "@UpDownBetaBot";

export function CTABand(): JSX.Element {
  return (
    <section className="ink-bg w-full">
      <div className="container-page py-24 md:py-32">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left column: copy */}
          <div className="flex flex-col gap-6">
            <span
              className="pill self-start"
              style={{ borderColor: "rgba(247,247,247,0.25)" }}
            >
              READY?
            </span>
            <h2 className="text-display-sm text-white">
              Your next 15 minutes,
              <br />
              verified on-chain.
            </h2>
            <p className="text-lg opacity-70">
              Open the bot, sign in with Google, get free starter dUSDC. Place
              your first /up or /down in under 60 seconds.
            </p>
          </div>

          {/* Right column: dark card */}
          <div className="relative">
            {/* Decorative blob */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute h-60 w-60 rounded-full"
              style={{
                top: "-50px",
                right: "-50px",
                background: "var(--color-flash)",
                opacity: 0.18,
                filter: "blur(80px)",
                zIndex: 0,
              }}
            />

            {/* Card content */}
            <div
              className="relative rounded-3xl border border-white/15 bg-white/5 backdrop-blur p-8 flex flex-col gap-8"
              style={{ zIndex: 1 }}
            >
              <span className="font-mono text-xs uppercase tracking-[0.06em] opacity-70">
                bot username
              </span>

              <span className="font-mono text-2xl md:text-3xl tracking-tight text-white">
                {BOT_USERNAME}
              </span>

              <a
                href={TELEGRAM_URL}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-full items-center justify-center rounded-full py-4 font-mono uppercase font-semibold tracking-[0.04em] transition-transform duration-200 ease-[cubic-bezier(0.2,0.7,0.2,1)] hover:scale-[1.01]"
                style={{
                  background: "var(--color-flash)",
                  color: "var(--color-bg-ink)",
                }}
              >
                Launch in Telegram →
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
