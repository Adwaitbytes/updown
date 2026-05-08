import Link from "next/link";

export default function NotFound() {
  return (
    <main className="container-page flex min-h-[80vh] flex-col items-center justify-center text-center">
      <p className="text-eyebrow mb-6">404</p>
      <h1 className="text-display-sm">Lost in a 15-minute window.</h1>
      <p className="mt-6 max-w-md text-lg text-[var(--color-fg-muted)]">
        That page doesn&apos;t exist. Maybe BTC moved.
      </p>
      <Link href="/" className="pill mt-10 h-11 bg-[var(--color-cta-bg)] text-[var(--color-cta-fg)] hover:bg-[var(--color-cta-bg-hover)] border-transparent">
        Back to the bot
      </Link>
    </main>
  );
}
