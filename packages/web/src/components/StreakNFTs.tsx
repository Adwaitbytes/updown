import * as React from "react";

type Tier = "bronze" | "silver" | "gold";

type StreakTier = {
  readonly id: Tier;
  readonly name: string;
  readonly wins: string;
  readonly caption: string;
  readonly delayMs: number;
};

const TIERS: readonly StreakTier[] = [
  {
    id: "bronze",
    name: "Bronze",
    wins: "3 Wins",
    caption: "Earn your first.",
    delayMs: 0,
  },
  {
    id: "silver",
    name: "Silver",
    wins: "7 Wins",
    caption: "Three more for gold.",
    delayMs: 200,
  },
  {
    id: "gold",
    name: "Gold",
    wins: "30 Wins",
    caption: "Hall of fame material.",
    delayMs: 400,
  },
] as const;

const STREAK_KEYFRAMES = `
@keyframes streak-shimmer {
  0%   { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
@keyframes streak-fade-up {
  from { opacity: 0; transform: translate3d(0, 24px, 0); }
  to   { opacity: 1; transform: translate3d(0, 0, 0); }
}
.streak-fade-up {
  animation: streak-fade-up 0.7s cubic-bezier(0.2, 0.7, 0.2, 1) both;
}
.streak-card {
  transition: transform 320ms cubic-bezier(0.2, 0.7, 0.2, 1);
}
.streak-card:hover {
  transform: translateY(-4px);
}
.streak-art {
  transition: transform 320ms cubic-bezier(0.2, 0.7, 0.2, 1);
  transform-origin: center;
}
.streak-card:hover .streak-art {
  transform: scale(1.04) rotate(-2deg);
}
.streak-shimmer-silver::after,
.streak-shimmer-gold::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(
    115deg,
    transparent 30%,
    rgba(255, 255, 255, 0.55) 50%,
    transparent 70%
  );
  mix-blend-mode: overlay;
  animation: streak-shimmer 4s linear infinite;
}
.streak-shimmer-gold::after {
  background: linear-gradient(
    115deg,
    transparent 25%,
    rgba(255, 255, 255, 0.85) 50%,
    transparent 75%
  );
  animation-duration: 3s;
}
.streak-engrave {
  color: #fff7d6;
  text-shadow:
    0 1px 0 rgba(255, 255, 255, 0.55),
    0 -1px 0 rgba(120, 70, 0, 0.85),
    0 2px 4px rgba(120, 70, 0, 0.55),
    inset 0 0 0 rgba(0, 0, 0, 0);
  -webkit-text-stroke: 1px rgba(120, 70, 0, 0.4);
}
`;

function Laurel({
  side,
  opacity = 0.5,
}: {
  readonly side: "left" | "right";
  readonly opacity?: number;
}): React.JSX.Element {
  const transform = side === "left" ? "scale(-1, 1)" : undefined;
  return (
    <svg
      viewBox="0 0 60 120"
      width="100%"
      height="100%"
      fill="none"
      stroke="white"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ opacity, transform }}
      aria-hidden="true"
    >
      <path d="M30 110 C 18 88, 14 60, 22 18" />
      <ellipse cx="14" cy="92" rx="9" ry="4" transform="rotate(-30 14 92)" />
      <ellipse cx="11" cy="74" rx="9" ry="4" transform="rotate(-25 11 74)" />
      <ellipse cx="11" cy="56" rx="9" ry="4" transform="rotate(-20 11 56)" />
      <ellipse cx="14" cy="38" rx="9" ry="4" transform="rotate(-15 14 38)" />
      <ellipse cx="18" cy="22" rx="8" ry="3.5" transform="rotate(-10 18 22)" />
    </svg>
  );
}

function SixPointStar({
  size,
  color = "white",
  opacity = 0.85,
}: {
  readonly size: number;
  readonly color?: string;
  readonly opacity?: number;
}): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={{ opacity }}
      aria-hidden="true"
    >
      <polygon
        points="50,5 61,38 95,38 67,58 78,92 50,72 22,92 33,58 5,38 39,38"
        fill={color}
      />
    </svg>
  );
}

function SunRays(): React.JSX.Element {
  const rays = Array.from({ length: 8 }, (_, i) => i);
  return (
    <svg
      viewBox="0 0 200 200"
      width="100%"
      height="100%"
      style={{ position: "absolute", inset: 0 }}
      aria-hidden="true"
    >
      {rays.map((i) => {
        const angle = (i * 360) / 8;
        return (
          <rect
            key={i}
            x="98"
            y="6"
            width="4"
            height="22"
            rx="2"
            fill="rgba(255, 255, 255, 0.55)"
            transform={`rotate(${angle} 100 100)`}
          />
        );
      })}
    </svg>
  );
}

function BronzeArt(): React.JSX.Element {
  return (
    <div
      className="streak-art relative w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #ff9b6e 0%, #d65a3a 100%)",
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 22% 22%, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0) 55%)",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="absolute left-2 top-1/2 -translate-y-1/2 h-[78%] w-[22%]">
          <Laurel side="left" />
        </div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 h-[78%] w-[22%]">
          <Laurel side="right" />
        </div>
        <div
          className="relative flex items-center justify-center rounded-full"
          style={{
            width: "70%",
            height: "70%",
            border: "6px solid rgba(255,255,255,0.4)",
            background:
              "radial-gradient(circle at 30% 25%, #c95a35 0%, #7a2f15 100%)",
            boxShadow:
              "inset 0 4px 10px rgba(255,255,255,0.18), inset 0 -6px 14px rgba(0,0,0,0.35)",
          }}
        >
          <span
            className="font-mono font-extrabold text-white leading-none"
            style={{ fontSize: "clamp(3rem, 9vw, 6rem)" }}
          >
            3
          </span>
        </div>
      </div>
    </div>
  );
}

function SilverArt(): React.JSX.Element {
  return (
    <div
      className="streak-art streak-shimmer-silver relative w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #cdd9e5 0%, #8d9aa8 100%)",
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 25% 22%, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0) 60%)",
        }}
      />
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="absolute"
          style={{ width: "92%", height: "92%" }}
        >
          <div className="absolute left-1/2 top-0 -translate-x-1/2">
            <SixPointStar size={36} opacity={0.75} />
          </div>
          <div className="absolute left-1/2 bottom-0 -translate-x-1/2">
            <SixPointStar size={36} opacity={0.75} />
          </div>
          <div className="absolute left-0 top-1/2 -translate-y-1/2">
            <SixPointStar size={36} opacity={0.75} />
          </div>
          <div className="absolute right-0 top-1/2 -translate-y-1/2">
            <SixPointStar size={36} opacity={0.75} />
          </div>
        </div>
        <div
          className="relative flex items-center justify-center rounded-full"
          style={{
            width: "70%",
            height: "70%",
            border: "6px solid rgba(255,255,255,0.5)",
            background:
              "radial-gradient(circle at 30% 25%, #b8c3d0 0%, #5d6875 100%)",
            boxShadow:
              "inset 0 4px 10px rgba(255,255,255,0.28), inset 0 -6px 14px rgba(0,0,0,0.3)",
          }}
        >
          <span
            className="font-mono font-extrabold text-white leading-none"
            style={{ fontSize: "clamp(3rem, 9vw, 6rem)" }}
          >
            7
          </span>
        </div>
      </div>
    </div>
  );
}

function GoldArt(): React.JSX.Element {
  return (
    <div
      className="streak-art streak-shimmer-gold relative w-full max-w-[280px] aspect-square rounded-2xl overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, #ffe27a 0%, #f0a500 60%, #c97900 100%)",
      }}
    >
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 25% 22%, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0) 60%)",
        }}
      />
      <div className="absolute inset-4">
        <SunRays />
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 h-[72%] w-[20%]">
          <Laurel side="left" opacity={0.65} />
        </div>
        <div className="absolute right-3 top-1/2 -translate-y-1/2 h-[72%] w-[20%]">
          <Laurel side="right" opacity={0.65} />
        </div>
        <div className="absolute left-1/2 -translate-x-1/2" style={{ top: "8%" }}>
          <SixPointStar size={28} opacity={0.95} color="#fff7d6" />
        </div>
        <div
          className="relative flex items-center justify-center rounded-full"
          style={{
            width: "68%",
            height: "68%",
            border: "6px solid rgba(255, 245, 200, 0.6)",
            background:
              "radial-gradient(circle at 30% 25%, #ffd768 0%, #a86700 100%)",
            boxShadow:
              "inset 0 4px 12px rgba(255,255,255,0.35), inset 0 -8px 18px rgba(80,40,0,0.55)",
          }}
        >
          <span
            className="streak-engrave font-mono font-extrabold leading-none"
            style={{ fontSize: "clamp(2.5rem, 8vw, 5.25rem)" }}
          >
            30
          </span>
        </div>
      </div>
    </div>
  );
}

function StreakArt({ tier }: { readonly tier: Tier }): React.JSX.Element {
  if (tier === "bronze") return <BronzeArt />;
  if (tier === "silver") return <SilverArt />;
  return <GoldArt />;
}

function StreakCard({ tier }: { readonly tier: StreakTier }): React.JSX.Element {
  const isGold = tier.id === "gold";
  return (
    <div
      className="streak-card streak-fade-up flex aspect-square flex-col items-center justify-center rounded-3xl border border-white/15 p-8"
      style={{ animationDelay: `${tier.delayMs}ms` }}
    >
      <div className="relative flex w-full flex-1 items-center justify-center">
        {isGold ? (
          <span
            className="absolute top-0 z-10 rounded-full border border-white/40 bg-white/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-white animate-pulse"
            style={{ backdropFilter: "blur(2px)" }}
          >
            Gold
          </span>
        ) : null}
        <StreakArt tier={tier.id} />
      </div>
      <div className="mt-6 flex flex-col items-center text-center">
        <span
          className="font-mono uppercase tracking-widest text-sm"
          style={{ color: "var(--color-flash)" }}
        >
          {tier.name}
        </span>
        <span className="mt-2 text-3xl md:text-4xl font-medium tracking-tight text-white">
          {tier.wins}
        </span>
        <span className="mt-2 text-sm text-white/70">{tier.caption}</span>
      </div>
    </div>
  );
}

export function StreakNFTs(): React.JSX.Element {
  return (
    <section
      id="streaks"
      className="py-32 bg-[var(--color-bg-ink)] text-[var(--color-fg-on-ink)]"
    >
      <style>{STREAK_KEYFRAMES}</style>
      <div className="container-page">
        <header className="streak-fade-up mx-auto mb-20 max-w-[720px] text-center">
          <span className="pill border-white/30 text-white">
            03 — On-chain Trophies
          </span>
          <h2 className="text-display-sm mt-6 text-white whitespace-pre-line">
            {"Streaks that survive\nthe screenshot."}
          </h2>
          <p className="mt-6 text-lg text-white/70">
            Three wins in a row earns you a Bronze NFT minted to your zkLogin
            address. Seven wins, Silver. Thirty, Gold. Verifiable on Sui,
            viewable in any wallet, ungiftable to your group chat as proof.
          </p>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {TIERS.map((tier) => (
            <StreakCard key={tier.id} tier={tier} />
          ))}
        </div>

        <div className="mt-16 flex justify-center">
          <span
            className="pill text-white/80"
            style={{ borderColor: "rgba(255,255,255,0.2)" }}
          >
            Each NFT is a Move object on Sui — verifiable, transferable,
            ungiftable to your future self.
          </span>
        </div>
      </div>
    </section>
  );
}
