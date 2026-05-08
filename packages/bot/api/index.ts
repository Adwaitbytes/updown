import type { IncomingMessage, ServerResponse } from "node:http";
import { buildApp } from "../src/app.js";

let appPromise: ReturnType<typeof buildApp> | null = null;

export const config = {
  runtime: "nodejs",
  maxDuration: 30,
};

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (!appPromise) appPromise = buildApp();
  const app = await appPromise;
  // Express apps are themselves (req, res) handlers; types differ slightly
  // from node http types but are compatible at runtime.
  (app as unknown as (req: IncomingMessage, res: ServerResponse) => void)(req, res);
}
