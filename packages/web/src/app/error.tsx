"use client";
import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="container-page flex min-h-[80vh] flex-col items-center justify-center text-center">
      <p className="text-eyebrow mb-6">Error</p>
      <h1 className="text-display-sm">Something tilted.</h1>
      <p className="mt-6 max-w-md text-lg text-[var(--color-fg-muted)]">
        Refresh, or head back to the bot. We&apos;ve logged this.
      </p>
      <div className="mt-10 flex gap-3">
        <button onClick={reset} className="pill h-11 bg-[var(--color-cta-bg)] text-[var(--color-cta-fg)] hover:bg-[var(--color-cta-bg-hover)] border-transparent">
          Try again
        </button>
        <Link href="/" className="pill h-11 border-[var(--color-border-strong)]">
          Home
        </Link>
      </div>
    </main>
  );
}
