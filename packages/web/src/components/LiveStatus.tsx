"use client";

import { useEffect, useRef, useState, type JSX } from "react";

type EndpointId = "web" | "miniapp" | "bot";
type Status = "checking" | "up" | "down";

type Endpoint = {
  readonly id: EndpointId;
  readonly label: string;
  readonly tag: string;
  readonly url: string;
};

const ENDPOINTS: readonly Endpoint[] = [
  {
    id: "web",
    label: "Marketing site",
    tag: "MARKETING · vercel",
    url: "https://updown-web.vercel.app",
  },
  {
    id: "miniapp",
    label: "Mini App",
    tag: "MINI APP · vercel",
    url: "https://updown-miniapp.vercel.app/onboard?session=demo123demo123demo123demo123",
  },
  {
    id: "bot",
    label: "Bot webhook",
    tag: "BOT · vercel",
    url: "https://updown-bot.vercel.app/healthz",
  },
] as const;

const POLL_INTERVAL_MS = 30_000;
const PING_TIMEOUT_MS = 5_000;
const TICK_INTERVAL_MS = 1_000;

const SCOPED_STYLES = `
  @keyframes ls-pulse-up {
    0%, 100% { transform: scale(1); opacity: 1; }
    50%      { transform: scale(1.35); opacity: 0.55; }
  }
  @keyframes ls-pulse-checking {
    0%, 100% { opacity: 0.45; }
    50%      { opacity: 1; }
  }
  .ls-card {
    position: relative;
    transition:
      transform 200ms cubic-bezier(0.2, 0.7, 0.2, 1),
      box-shadow 200ms cubic-bezier(0.2, 0.7, 0.2, 1),
      border-color 200ms cubic-bezier(0.2, 0.7, 0.2, 1);
  }
  .ls-card:hover {
    transform: translateY(-2px);
    border-color: var(--color-border-strong);
    box-shadow: var(--shadow-elev);
  }
  .ls-card .ls-tooltip {
    opacity: 0;
    transform: translateY(4px);
    transition:
      opacity 160ms cubic-bezier(0.2, 0.7, 0.2, 1),
      transform 160ms cubic-bezier(0.2, 0.7, 0.2, 1);
    pointer-events: none;
  }
  .ls-card:hover .ls-tooltip,
  .ls-card:focus-within .ls-tooltip {
    opacity: 1;
    transform: translateY(0);
  }
  .ls-dot-up::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: 9999px;
    background: var(--color-up);
    animation: ls-pulse-up 1.6s cubic-bezier(0.2, 0.7, 0.2, 1) infinite;
  }
  .ls-dot-checking {
    animation: ls-pulse-checking 1.2s ease-in-out infinite;
  }
`;

function formatAgo(now: number, then: number | null): string {
  if (then === null) {
    return "last checked: —";
  }
  const seconds = Math.max(0, Math.floor((now - then) / 1000));
  if (seconds < 60) {
    return `last checked: ${seconds}s ago`;
  }
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `last checked: ${minutes}m ago`;
  }
  const hours = Math.floor(minutes / 60);
  return `last checked: ${hours}h ago`;
}

async function pingEndpoint(url: string): Promise<Status> {
  const controller = new AbortController();
  const timer = setTimeout(() => {
    controller.abort();
  }, PING_TIMEOUT_MS);
  try {
    // `no-cors` returns an opaque response on success; any non-thrown response
    // here means the host responded. This is a liveness check, not a strict
    // status assertion.
    await fetch(url, {
      method: "GET",
      mode: "no-cors",
      cache: "no-store",
      signal: controller.signal,
    });
    return "up";
  } catch {
    return "down";
  } finally {
    clearTimeout(timer);
  }
}

type StatusEntry = {
  readonly status: Status;
  readonly lastChecked: number | null;
};

type StatusMap = Readonly<Record<EndpointId, StatusEntry>>;

const INITIAL_STATUS: StatusMap = ENDPOINTS.reduce<Record<EndpointId, StatusEntry>>(
  (acc, endpoint) => {
    acc[endpoint.id] = { status: "checking", lastChecked: null };
    return acc;
  },
  {} as Record<EndpointId, StatusEntry>,
);

type DotProps = { readonly status: Status };

function StatusDot({ status }: DotProps): JSX.Element {
  if (status === "up") {
    return (
      <span
        aria-hidden="true"
        className="ls-dot-up relative inline-block h-2.5 w-2.5 rounded-full"
        style={{ background: "var(--color-up)" }}
      />
    );
  }
  if (status === "down") {
    return (
      <span
        aria-hidden="true"
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{ background: "var(--color-down)" }}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className="ls-dot-checking inline-block h-2.5 w-2.5 rounded-full"
      style={{ background: "var(--color-fg-dim)" }}
    />
  );
}

function statusCopy(status: Status): string {
  if (status === "up") return "Live";
  if (status === "down") return "Down";
  return "Checking…";
}

function statusColor(status: Status): string {
  if (status === "up") return "var(--color-up)";
  if (status === "down") return "var(--color-down)";
  return "var(--color-fg-muted)";
}

function statusBg(status: Status): string {
  if (status === "up") return "var(--color-up-soft)";
  if (status === "down") return "var(--color-down-soft)";
  return "rgba(0, 15, 29, 0.06)";
}

export function LiveStatus(): JSX.Element {
  const [statuses, setStatuses] = useState<StatusMap>(INITIAL_STATUS);
  const [now, setNow] = useState<number>(() => Date.now());
  const mountedRef = useRef<boolean>(true);

  useEffect(() => {
    mountedRef.current = true;

    const runChecks = (): void => {
      for (const endpoint of ENDPOINTS) {
        // Mark as checking before the request fires so the UI reflects the
        // in-flight state for this specific endpoint without blocking others.
        setStatuses((prev) => ({
          ...prev,
          [endpoint.id]: {
            status: "checking",
            lastChecked: prev[endpoint.id].lastChecked,
          },
        }));
        void pingEndpoint(endpoint.url).then((status) => {
          if (!mountedRef.current) return;
          setStatuses((prev) => ({
            ...prev,
            [endpoint.id]: { status, lastChecked: Date.now() },
          }));
        });
      }
    };

    runChecks();
    const pollId = window.setInterval(runChecks, POLL_INTERVAL_MS);
    const tickId = window.setInterval(() => {
      setNow(Date.now());
    }, TICK_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      window.clearInterval(pollId);
      window.clearInterval(tickId);
    };
  }, []);

  return (
    <section
      aria-label="Live service status"
      className="fade-up py-12"
    >
      <style>{SCOPED_STYLES}</style>
      <div className="container-page">
        <div className="mb-6 flex items-baseline justify-between gap-4">
          <span className="text-eyebrow">Live status · pings every 30s</span>
          <span className="font-mono text-xs text-[var(--color-fg-dim)]">
            {ENDPOINTS.length} services
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {ENDPOINTS.map((endpoint) => {
            const entry = statuses[endpoint.id];
            const color = statusColor(entry.status);
            const bg = statusBg(entry.status);

            return (
              <article
                key={endpoint.id}
                className="ls-card card flex flex-col gap-4 p-5"
                tabIndex={0}
                aria-label={`${endpoint.label}: ${statusCopy(entry.status)}`}
              >
                <span className="text-eyebrow truncate">{endpoint.tag}</span>

                <div
                  className="inline-flex items-center gap-2.5 self-start rounded-full px-3 py-1.5"
                  style={{ background: bg }}
                >
                  <StatusDot status={entry.status} />
                  <span
                    className="font-mono text-xs font-semibold tracking-wide uppercase"
                    style={{ color }}
                  >
                    {statusCopy(entry.status)}
                  </span>
                </div>

                <span className="font-mono text-xs text-[var(--color-fg-dim)]">
                  {formatAgo(now, entry.lastChecked)}
                </span>

                <span
                  role="tooltip"
                  className="ls-tooltip absolute left-5 right-5 -bottom-2 z-10 translate-y-full rounded-lg border px-3 py-2 font-mono text-xs break-all"
                  style={{
                    background: "var(--color-bg-ink)",
                    color: "var(--color-fg-on-ink)",
                    borderColor: "var(--color-border-strong)",
                    boxShadow: "var(--shadow-elev)",
                  }}
                >
                  {endpoint.url}
                </span>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default LiveStatus;
