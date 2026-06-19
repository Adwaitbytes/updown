"use client";

import { SuiClient, type SuiObjectChange } from "@mysten/sui/client";
import { useCallback, useEffect, useState } from "react";

import { buildOnboardTx } from "@/lib/ptb";
import { closeWebApp, getInitData, initTelegram } from "@/lib/telegram";

type Step =
  | { kind: "loading" }
  | { kind: "needs-google" }
  | { kind: "signing" }
  | { kind: "submitting" }
  | { kind: "success"; suiAddress: string; digest: string }
  | { kind: "error"; message: string };

interface DerivedKey {
  delegatedPubkeyBase64: string;
}

const NETWORK = "testnet" as const;
const SESSION_STORAGE_KEY = "updown:session";
const BUILD_REV = "20260618-cachebust-3";

export default function OnboardPage(): React.ReactElement {
  const [step, setStep] = useState<Step>({ kind: "loading" });
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    console.log("[updown/onboard] build", BUILD_REV);

    if (typeof window === "undefined") return;

    // If this page is the OAuth popup we opened from the mini app (Enoki
    // redirects back here with #id_token=...), post the hash to the opener and
    // close. The real onboarding continues in the opener, which still holds the
    // Telegram initData + zkLogin session state. (Telegram Web hosts the mini
    // app in a sandboxed iframe where Google OAuth itself is blocked, so we run
    // the OAuth in a top-level popup instead.)
    if (window.opener && window.opener !== window) {
      const popupHash = window.location.hash;
      if (popupHash && popupHash.includes("id_token")) {
        try {
          window.opener.postMessage(
            { type: "updown-oauth", hash: popupHash },
            window.location.origin,
          );
        } catch {
          // ignore
        }
        window.close();
        return;
      }
    }

    initTelegram();

    // 1. If `?session=` is present in the URL, immediately move it into
    //    sessionStorage and scrub the URL bar. This prevents the token from
    //    leaking via:
    //      - Google's OAuth audit logs (which record the full redirectUrl)
    //      - Browser history
    //      - `Referer` headers on subsequent navigations
    const urlSession = new URLSearchParams(window.location.search).get(
      "session",
    );
    if (urlSession) {
      try {
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, urlSession);
      } catch {
        // sessionStorage may be unavailable (private mode etc.); fall through.
      }
      // Strip query string but preserve hash (Enoki posts `id_token` there).
      const cleanUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, "", cleanUrl);
    }

    // 2. All subsequent reads come from sessionStorage.
    let stored: string | null = null;
    try {
      stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    } catch {
      stored = null;
    }
    if (!stored) {
      setStep({
        kind: "error",
        message: "Missing session token. Please re-open from the bot.",
      });
      return;
    }
    setSessionToken(stored);

    const hash = window.location.hash;
    if (hash && hash.includes("id_token")) {
      void handleAuthCallback(stored);
    } else {
      setStep({ kind: "needs-google" });
    }
    // We intentionally only run this once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAuthCallback = useCallback(
    async (token: string, hashOverride?: string) => {
    setStep({ kind: "signing" });
    try {
      const enokiMod = await import("@mysten/enoki");
      const flow = new enokiMod.EnokiFlow({
        apiKey: requireEnv("NEXT_PUBLIC_ENOKI_PUBLIC_KEY"),
      });
      // `hashOverride` is supplied when the id_token arrives via postMessage
      // from the OAuth popup (Telegram Web case). Falls back to the current
      // URL hash for the normal full-page redirect case.
      await flow.handleAuthCallback(hashOverride);

      const keypair = await flow.getKeypair({ network: NETWORK });
      const suiAddress = keypair.toSuiAddress();

      // The server route now requires Telegram `initData` proof in the body.
      const initData = getInitData();
      if (!initData) {
        throw new Error(
          "Telegram initData unavailable. Open this page from the Up/Down bot.",
        );
      }

      // Per-user delegated pubkey from server (POST + JSON body — `session`
      // is no longer in the URL so it cannot leak via access logs).
      const dkRes = await fetch(`/api/derive-pubkey`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ session: token, initData }),
      });
      if (!dkRes.ok) throw new Error(`derive-pubkey failed: ${dkRes.status}`);
      const dk = (await dkRes.json()) as DerivedKey;

      // Build onboarding PTB.
      const tx = buildOnboardTx({
        sender: suiAddress,
        delegatedPubkeyBase64: dk.delegatedPubkeyBase64,
        dailyCapMicros: 100_000_000n,
      });

      setStep({ kind: "submitting" });

      const sui = new SuiClient({ url: requireEnv("NEXT_PUBLIC_SUI_RPC_URL") });
      const kindBytes = await tx.build({
        client: sui,
        onlyTransactionKind: true,
      });
      const kindBase64 = toBase64(kindBytes);

      // Sponsorship MUST happen server-side with the private Enoki key —
      // public keys are forbidden from sponsoring (Enoki returns 403). The
      // server route restricts sponsorship to our onboarding move-call targets.
      const sponsorRes = await fetch(`/api/sponsor`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          transactionKindBytes: kindBase64,
          sender: suiAddress,
        }),
      });
      if (!sponsorRes.ok) {
        const detail = await sponsorRes.text().catch(() => "");
        throw new Error(`sponsor failed: ${sponsorRes.status} ${detail}`);
      }
      const sponsored = (await sponsorRes.json()) as {
        bytes: string;
        digest: string;
      };

      const { signature } = await keypair.signTransaction(
        fromBase64(sponsored.bytes),
      );

      const execRes = await fetch(`/api/execute`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ digest: sponsored.digest, signature }),
      });
      if (!execRes.ok) {
        const detail = await execRes.text().catch(() => "");
        throw new Error(`execute failed: ${execRes.status} ${detail}`);
      }
      const exec = (await execRes.json()) as { digest: string };

      // Wait for the tx to be indexed and pull objectChanges so we can
      // identify the freshly-created BettingAccount, OwnerCap, and
      // PredictManager object ids by Move type. The bot needs all three
      // to operate the user's account on subsequent /up /down commands.
      const txResp = await sui.waitForTransaction({
        digest: exec.digest,
        options: { showObjectChanges: true },
      });
      const objectChanges: SuiObjectChange[] = txResp.objectChanges ?? [];

      const updownPkg = requireEnv("NEXT_PUBLIC_UPDOWN_PACKAGE_ID");
      const predictPkg = requireEnv("NEXT_PUBLIC_PREDICT_PACKAGE_ID");

      // Match by Move struct type. Note BettingAccount<Q> is generic so we
      // match on the struct prefix and trust the package id to disambiguate.
      const accountId = findCreatedObjectId(
        objectChanges,
        (t) => t.startsWith(`${updownPkg}::account::BettingAccount<`),
      );
      const ownerCapId = findCreatedObjectId(
        objectChanges,
        (t) => t === `${updownPkg}::account::OwnerCap`,
      );
      const predictManagerId = findCreatedObjectId(
        objectChanges,
        // The manager object lives in the `predict_manager` module (not
        // `predict`); create_manager returns its ID and shares the object.
        (t) => t === `${predictPkg}::predict_manager::PredictManager`,
      );

      if (!accountId) throw new Error("BettingAccount not found in tx effects");
      if (!ownerCapId) throw new Error("OwnerCap not found in tx effects");
      if (!predictManagerId) {
        throw new Error("PredictManager not found in tx effects");
      }

      // Forward the new IDs to the bot — via our own same-origin /api/register
      // proxy. A direct browser POST to the bot origin is blocked by both CORS
      // (the bot sends no CORS headers on this route) and the page CSP. The
      // proxy calls the bot server-side; the bot re-verifies initData + token.
      const post = await fetch(`/api/register`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          token,
          initData,
          suiAddress,
          accountId,
          ownerCapId,
          predictManagerId,
          delegatedPubkey: dk.delegatedPubkeyBase64,
        }),
      });
      if (!post.ok) {
        const detail = await post.text().catch(() => "");
        throw new Error(`register failed: ${post.status} ${detail}`);
      }

      // Success: drop the now-consumed session from sessionStorage.
      try {
        window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
      } catch {
        // ignore
      }
      setStep({ kind: "success", suiAddress, digest: exec.digest });
    } catch (err) {
      setStep({ kind: "error", message: errMsg(err) });
    }
  }, []);

  const onSignInWithGoogle = useCallback(async () => {
    setStep({ kind: "signing" });
    try {
      const enokiMod = await import("@mysten/enoki");
      const flow = new enokiMod.EnokiFlow({
        apiKey: requireEnv("NEXT_PUBLIC_ENOKI_PUBLIC_KEY"),
      });
      // IMPORTANT: redirectUrl must NOT contain the session token. The token
      // lives in sessionStorage and is read on callback.
      const redirectUrl = `${window.location.origin}/onboard`;
      const url = await flow.createAuthorizationURL({
        provider: "google",
        clientId: requireEnv("NEXT_PUBLIC_GOOGLE_CLIENT_ID"),
        redirectUrl,
        network: NETWORK,
      });

      // Telegram Web hosts the mini app in a sandboxed cross-origin iframe
      // where Google's account chooser returns 403 (it needs first-party
      // cookies). Open OAuth in a top-level popup; the popup posts the
      // id_token back here, where we still hold initData + zkLogin state.
      const popup = window.open(
        url,
        "updown-google-oauth",
        "popup,width=480,height=720",
      );
      if (!popup) {
        // Popup blocked or not in an iframe — full-page nav works directly.
        window.location.href = url;
        return;
      }
      const onMessage = (ev: MessageEvent) => {
        if (ev.origin !== window.location.origin) return;
        const data = ev.data as { type?: string; hash?: string } | null;
        if (!data || data.type !== "updown-oauth" || !data.hash) return;
        window.removeEventListener("message", onMessage);
        try {
          popup.close();
        } catch {
          // ignore
        }
        let stored: string | null = null;
        try {
          stored = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
        } catch {
          stored = null;
        }
        if (stored) {
          void handleAuthCallback(stored, data.hash);
        } else {
          setStep({
            kind: "error",
            message: "Missing session token. Please re-open from the bot.",
          });
        }
      };
      window.addEventListener("message", onMessage);
    } catch (err) {
      setStep({ kind: "error", message: errMsg(err) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="container-page py-8">
      <div className="card p-6 fade-up flex flex-col gap-4">
        <h1 className="text-2xl font-medium tracking-tight">Welcome to Up/Down</h1>
        <p className="text-sm text-[var(--color-fg-muted)]">
          One tap to set up your sub-hour BTC betting account on Sui.
        </p>

        {step.kind === "loading" && <div>Loading…</div>}

        {step.kind === "needs-google" && (
          <button
            className="btn-primary"
            onClick={onSignInWithGoogle}
            type="button"
          >
            Sign in with Google
          </button>
        )}

        {(step.kind === "signing" || step.kind === "submitting") && (
          <div className="text-sm text-[var(--color-fg-muted)]">
            {step.kind === "signing" ? "Signing in…" : "Submitting on-chain…"}
          </div>
        )}

        {step.kind === "success" && (
          <div className="flex flex-col gap-3">
            <div className="text-sm">
              <div className="font-medium">All set.</div>
              <div className="text-[var(--color-fg-muted)]">
                Address:{" "}
                <span className="font-mono">{short(step.suiAddress)}</span>
              </div>
              <div className="text-[var(--color-fg-muted)]">
                Tx: <span className="font-mono">{short(step.digest)}</span>
              </div>
            </div>
            <button
              className="btn-primary"
              onClick={closeWebApp}
              type="button"
            >
              Return to Telegram
            </button>
          </div>
        )}

        {step.kind === "error" && (
          <div className="text-sm" style={{ color: "var(--color-down)" }}>
            Error: {step.message}
          </div>
        )}

        {sessionToken && (
          <div className="text-xs text-[var(--color-fg-dim)]">
            Session: {sessionToken.slice(0, 8)}…
          </div>
        )}
      </div>
    </main>
  );
}

// NEXT_PUBLIC_* vars are only inlined by Next.js/Turbopack when read as a
// STATIC literal (process.env.NEXT_PUBLIC_FOO). A dynamic process.env[key]
// access is NOT substituted in the browser bundle and resolves to undefined,
// which is exactly what caused the spurious "Missing env" errors. We build a
// static map here so each var is inlined, then look it up by key.
const PUBLIC_ENV: Record<string, string | undefined> = {
  NEXT_PUBLIC_ENOKI_PUBLIC_KEY: process.env.NEXT_PUBLIC_ENOKI_PUBLIC_KEY,
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
  NEXT_PUBLIC_SUI_NETWORK: process.env.NEXT_PUBLIC_SUI_NETWORK,
  NEXT_PUBLIC_SUI_RPC_URL: process.env.NEXT_PUBLIC_SUI_RPC_URL,
  NEXT_PUBLIC_PREDICT_PACKAGE_ID: process.env.NEXT_PUBLIC_PREDICT_PACKAGE_ID,
  NEXT_PUBLIC_PREDICT_OBJ_ID: process.env.NEXT_PUBLIC_PREDICT_OBJ_ID,
  NEXT_PUBLIC_DUSDC_TYPE: process.env.NEXT_PUBLIC_DUSDC_TYPE,
  NEXT_PUBLIC_DUSDC_TREASURY_CAP_ID:
    process.env.NEXT_PUBLIC_DUSDC_TREASURY_CAP_ID,
  NEXT_PUBLIC_UPDOWN_PACKAGE_ID: process.env.NEXT_PUBLIC_UPDOWN_PACKAGE_ID,
  NEXT_PUBLIC_BOT_WEBHOOK_URL: process.env.NEXT_PUBLIC_BOT_WEBHOOK_URL,
};

function requireEnv(key: string): string {
  const v = PUBLIC_ENV[key];
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

/**
 * Walk objectChanges from a transaction and return the objectId of the first
 * `created` change whose `objectType` matches the given predicate. Returns
 * null if no match is found.
 *
 * Move struct types we expect during onboarding (with `${PKG}` substituted):
 *   - `${NEXT_PUBLIC_UPDOWN_PACKAGE_ID}::account::BettingAccount<${DUSDC_TYPE}>`
 *   - `${NEXT_PUBLIC_UPDOWN_PACKAGE_ID}::account::OwnerCap`
 *   - `${NEXT_PUBLIC_PREDICT_PACKAGE_ID}::predict::PredictManager`
 */
function findCreatedObjectId(
  changes: readonly SuiObjectChange[],
  matchType: (objectType: string) => boolean,
): string | null {
  for (const c of changes) {
    if (c.type === "created" && matchType(c.objectType)) {
      return c.objectId;
    }
  }
  return null;
}
