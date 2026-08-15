import { VintedApiError } from "./vinted-client.js";

/**
 * Accepts either a bare numeric ID or a Vinted URL and returns the numeric ID.
 * Handles item URLs (`.../items/1234567-some-title`) and member/profile URLs
 * (`.../member/7654321-some-name`).
 */
export function extractId(input: string, kind: "item" | "user"): number {
  const trimmed = input.trim();

  if (/^\d+$/.test(trimmed)) {
    return Number(trimmed);
  }

  const pattern = kind === "item" ? /\/(?:items|catalog)\/(\d+)/ : /\/(?:member|users)\/(\d+)/;
  const match = trimmed.match(pattern);
  if (match) {
    return Number(match[1]);
  }

  throw new VintedApiError(
    `Could not extract a numeric ${kind} ID from '${input}'. Pass a numeric ID or a full Vinted ${
      kind === "item" ? "item" : "profile"
    } URL.`,
  );
}
