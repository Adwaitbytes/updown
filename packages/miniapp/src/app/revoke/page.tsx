"use client";

import { SuiClient } from "@mysten/sui/client";
import { useCallback, useEffect, useState } from "react";

import { buildRevokeTx } from "@/lib/ptb";
import { initTelegram } from "@/lib/telegram";

interface AccountSummary {
  ownerCapId: string;
  bettingAccountId: string;
  dailyCapMicros: string;
}

type State =
  | { kind: "loading" }
  | { kind: "ready"; suiAddress: string; accounts: AccountSummary[] }
  | {
      kind: "revoking";
      suiAddress: string;
      accounts: AccountSummary[];
      targetId: string;
    }
  | { kind: "error"; message: string };

const NETWORK = "testnet" as const;

export default function RevokePage(): React.ReactElement {
  const [state, setState] = useState<State>({ kind: "loading" });

  const load = useCallback(async () => {
    try {
      const enokiMod = await import("@mysten/enoki");
      const flow = new enokiMod.EnokiFlow({
        apiKey: requireEnv("NEXT_PUBLIC_ENOKI_PUBLIC_KEY"),
      });
      const keypair = await flow.getKeypair({ network: NETWORK });
      const suiAddress = keypair.toSuiAddress();

      const client = new SuiClient({
        url: requireEnv("NEXT_PUBLIC_SUI_RPC_URL"),
      });
      const updownPkg = requireEnv("NEXT_PUBLIC_UPDOWN_PACKAGE_ID");
      const owned = await client.getOwnedObjects({
        owner: suiAddress,
        filter: { StructType: `${updownPkg}::account::OwnerCap` },
        options: { showContent: true },
      });

      const accounts: AccountSummary[] = [];
      for (const o of owned.data) {
        const c = o.data?.content;
        if (!c || c.dataType !== "moveObject") continue;
        const fields = c.fields as Record<string, unknown>;
        const ownerCapId = o.data?.objectId;
        const bettingAccountId =
          typeof fields["account_id"] === "string"
            ? (fields["account_id"] as string)
            : undefined;
        const dailyCapMicros =
          typeof fields["daily_cap_micros"] === "string"
            ? (fields["daily_cap_micros"] as string)
            : undefined;
        if (!ownerCapId || !bettingAccountId || !dailyCapMicros) continue;
        accounts.push({ ownerCapId, bettingAccountId, dailyCapMicros });
      }

      setState({ kind: "ready", suiAddress, accounts });
    } catch (err) {
      setState({ kind: "error", message: errMsg(err) });
    }
  }, []);

  useEffect(() => {
    initTelegram();
    void load();
  }, [load]);

  const onRevoke = useCallback(
    async (acct: AccountSummary) => {
      if (state.kind !== "ready") return;
      setState({
        kind: "revoking",
        suiAddress: state.suiAddress,
        accounts: state.accounts,
        targetId: acct.bettingAccountId,
      });
      try {
        const enokiMod = await import("@mysten/enoki");
        const flow = new enokiMod.EnokiFlow({
          apiKey: requireEnv("NEXT_PUBLIC_ENOKI_PUBLIC_KEY"),
        });
        const keypair = await flow.getKeypair({ network: NETWORK });
        const tx = buildRevokeTx({
          sender: state.suiAddress,
          ownerCapId: acct.ownerCapId,
          bettingAccountId: acct.bettingAccountId,
        });
        const sui = new SuiClient({
          url: requireEnv("NEXT_PUBLIC_SUI_RPC_URL"),
        });
        const kindBytes = await tx.build({
          client: sui,
          onlyTransactionKind: true,
        });
        const sponsored = await flow.enokiClient.createSponsoredTransaction({
          network: NETWORK,
          transactionKindBytes: toBase64(kindBytes),
          sender: state.suiAddress,
        });
        const { signature } = await keypair.signTransaction(
          fromBase64(sponsored.bytes),
        );
        await flow.enokiClient.executeSponsoredTransaction({
          digest: sponsored.digest,
          signature,
        });
        await load();
      } catch (err) {
        setState({ kind: "error", message: errMsg(err) });
      }
    },
    [state, load],
  );

  return (
    <main className="container-page py-8">
      <div className="card p-6 flex flex-col gap-4 fade-up">
        <h1 className="text-2xl font-medium tracking-tight">
          Manage delegations
        </h1>

        {state.kind === "loading" && <div>Loading…</div>}

        {(state.kind === "ready" || state.kind === "revoking") && (
          <>
            {state.accounts.length === 0 ? (
              <div className="text-sm text-[var(--color-fg-muted)]">
                No active betting accounts found.
              </div>
            ) : (
              <ul className="flex flex-col gap-3">
                {state.accounts.map((a) => (
                  <li
                    key={a.bettingAccountId}
                    className="flex items-center justify-between gap-3 border border-[var(--color-border)] rounded-2xl p-3"
                  >
                    <div className="text-sm">
                      <div className="font-mono">
                        {short(a.bettingAccountId)}
                      </div>
                      <div className="text-[var(--color-fg-muted)]">
                        Daily cap:{" "}
                        {(Number(a.dailyCapMicros) / 1_000_000).toFixed(2)} dUSDC
                      </div>
                    </div>
                    <button
                      type="button"
                      className="btn-primary"
                      disabled={
                        state.kind === "revoking" &&
                        state.targetId === a.bettingAccountId
                      }
                      onClick={() => void onRevoke(a)}
                    >
                      {state.kind === "revoking" &&
                      state.targetId === a.bettingAccountId
                        ? "Revoking…"
                        : "Revoke"}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {state.kind === "error" && (
          <div className="text-sm" style={{ color: "var(--color-down)" }}>
            Error: {state.message}
          </div>
        )}
      </div>
    </main>
  );
}

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Missing env: ${key}`);
  return v;
}

function short(s: string): string {
  if (s.length <= 12) return s;
  return `${s.slice(0, 6)}…${s.slice(-4)}`;
}

function errMsg(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i++) {
    s += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(s);
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
