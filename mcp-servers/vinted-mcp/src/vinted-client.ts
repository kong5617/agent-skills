import { DEFAULT_DOMAIN, REQUEST_TIMEOUT_MS, SESSION_TTL_MS, USER_AGENT } from "./constants.js";

export class VintedApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "VintedApiError";
  }
}

interface SessionEntry {
  cookie: string;
  expiresAt: number;
}

export type QueryValue = string | number | boolean | undefined;

/**
 * Thin client for Vinted's unofficial, reverse-engineered `/api/v2` endpoints.
 *
 * Vinted has no public read API. Like every open-source Vinted wrapper, this client
 * establishes an anonymous browsing session by requesting the storefront once to
 * collect the session cookie Vinted's anti-bot layer expects, then reuses that
 * cookie for subsequent JSON requests. Sessions are cached per-domain and
 * transparently refreshed once on a 401/403 before giving up.
 */
export class VintedClient {
  private readonly sessions = new Map<string, SessionEntry>();

  private baseUrl(domain: string): string {
    return `https://www.${domain}`;
  }

  private async fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new VintedApiError(`Request to ${url} timed out after ${REQUEST_TIMEOUT_MS}ms.`);
      }
      throw new VintedApiError(
        `Network error while contacting ${new URL(url).hostname}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private extractSetCookies(res: Response): string[] {
    const headersWithGetSetCookie = res.headers as Headers & { getSetCookie?: () => string[] };
    if (typeof headersWithGetSetCookie.getSetCookie === "function") {
      return headersWithGetSetCookie.getSetCookie();
    }
    const single = res.headers.get("set-cookie");
    return single ? [single] : [];
  }

  private async establishSession(domain: string): Promise<string> {
    const res = await this.fetchWithTimeout(this.baseUrl(domain) + "/", {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html,application/xhtml+xml" },
      redirect: "follow",
    });

    const cookie = this.extractSetCookies(res)
      .map((c) => c.split(";")[0])
      .join("; ");

    if (!cookie) {
      throw new VintedApiError(
        `Could not establish a browsing session with ${domain} (no cookies returned, HTTP ${res.status}). ` +
          "Vinted may be blocking automated access from this network, or the domain is wrong.",
      );
    }

    this.sessions.set(domain, { cookie, expiresAt: Date.now() + SESSION_TTL_MS });
    return cookie;
  }

  private async getSessionCookie(domain: string, forceRefresh = false): Promise<string> {
    const cached = this.sessions.get(domain);
    if (!forceRefresh && cached && cached.expiresAt > Date.now()) {
      return cached.cookie;
    }
    return this.establishSession(domain);
  }

  private buildUrl(domain: string, path: string, query: Record<string, QueryValue>): URL {
    const url = new URL(this.baseUrl(domain) + path);
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === "") continue;
      url.searchParams.set(key, String(value));
    }
    return url;
  }

  private async performRequest(url: URL, cookie: string): Promise<Response> {
    return this.fetchWithTimeout(url.toString(), {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json, text/plain, */*",
        Cookie: cookie,
      },
    });
  }

  /** GET a Vinted `/api/v2` JSON endpoint, handling session bootstrap/refresh and common error shapes. */
  async get<T>(domain: string, path: string, query: Record<string, QueryValue> = {}): Promise<T> {
    const url = this.buildUrl(domain, path, query);

    let cookie = await this.getSessionCookie(domain);
    let res = await this.performRequest(url, cookie);

    if (res.status === 401 || res.status === 403) {
      cookie = await this.getSessionCookie(domain, true);
      res = await this.performRequest(url, cookie);
    }

    if (res.status === 429) {
      throw new VintedApiError(
        `Vinted rate-limited requests to ${domain}. Wait a while before retrying and avoid tight request loops.`,
        429,
      );
    }
    if (res.status === 404) {
      throw new VintedApiError(`Not found: ${path}. Double-check the ID and domain (${domain}).`, 404);
    }
    if (res.status === 401 || res.status === 403) {
      throw new VintedApiError(
        `Vinted denied access to ${path} (HTTP ${res.status}) even after refreshing the session. ` +
          "This endpoint may require a logged-in account, or Vinted's anti-bot layer is blocking this network.",
        res.status,
      );
    }
    if (!res.ok) {
      throw new VintedApiError(`Vinted API request to ${path} failed with HTTP ${res.status}.`, res.status);
    }

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      throw new VintedApiError(`Vinted returned a non-JSON response for ${path}. It may be showing a CAPTCHA page.`);
    }

    const envelope = json as { code?: number; message_code?: string };
    if (typeof envelope?.code === "number" && envelope.code !== 0) {
      throw new VintedApiError(`Vinted API error for ${path}: ${envelope.message_code ?? "unknown error"}.`);
    }

    return json as T;
  }
}

export function normalizeDomain(domain: string | undefined): string {
  return domain && domain.trim() ? domain.trim().toLowerCase() : DEFAULT_DOMAIN;
}

export const vintedClient = new VintedClient();
