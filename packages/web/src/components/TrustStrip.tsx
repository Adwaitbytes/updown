import type { JSX } from "react";

type TrustCell = {
  readonly eyebrow: string;
  readonly number: string;
  readonly description: string;
};

const CELLS: readonly TrustCell[] = [
  {
    eyebrow: "Settlement",
    number: "<400ms",
    description: "Sub-second settlement on Sui via DeepBook Predict",
  },
  {
    eyebrow: "Custody",
    number: "Self · zkLogin",
    description: "Sign in with Google. No seed phrase, no custodian.",
  },
  {
    eyebrow: "Min bet",
    number: "1 dUSDC",
    description: "Try a hand for less than the cost of a coffee.",
  },
  {
    eyebrow: "Window",
    number: "15m / 1h / 1d / 1w",
    description: "Pick the timeframe that matches your conviction.",
  },
] as const;

export function TrustStrip(): JSX.Element {
  return (
    <section
      className="border-t border-b py-12"
      style={{
        borderTopColor: "var(--color-border)",
        borderBottomColor: "var(--color-border)",
      }}
    >
      <div className="container-page">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {CELLS.map((cell) => (
            <div
              key={cell.eyebrow}
              className="group flex flex-col gap-2 transition-transform duration-200 ease-[cubic-bezier(0.2,0.7,0.2,1)] hover:scale-[1.01]"
            >
              <span className="text-eyebrow transition-colors duration-200 group-hover:text-[var(--color-spark)]">
                {cell.eyebrow}
              </span>
              <span className="text-3xl md:text-4xl font-medium tracking-tight text-[var(--color-fg)]">
                {cell.number}
              </span>
              <span className="text-sm text-[var(--color-fg-muted)]">
                {cell.description}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
