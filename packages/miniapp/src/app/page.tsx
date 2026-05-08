export default function Home(): React.ReactElement {
  return (
    <main className="container-page py-10">
      <div className="card p-6">
        <h1 className="text-xl font-medium">Up/Down Mini App</h1>
        <p className="mt-2 text-sm text-[var(--color-fg-muted)]">
          Open from Telegram via the bot to onboard or manage delegations.
        </p>
      </div>
    </main>
  );
}
