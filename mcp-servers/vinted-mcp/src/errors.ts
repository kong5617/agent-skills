import { VintedApiError } from "./vinted-client.js";

export function describeError(error: unknown): string {
  if (error instanceof VintedApiError) {
    return `Error: ${error.message}`;
  }
  return `Error: unexpected failure - ${error instanceof Error ? error.message : String(error)}`;
}
