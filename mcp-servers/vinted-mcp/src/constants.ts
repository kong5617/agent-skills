export const DEFAULT_DOMAIN = "vinted.com";

export const DOMAIN_PATTERN = /^vinted\.[a-z]{2,3}(\.[a-z]{2})?$/;

export const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export const REQUEST_TIMEOUT_MS = 15_000;

export const SESSION_TTL_MS = 10 * 60 * 1000;

/** Cap on response size returned to the model; large results are truncated with a note. */
export const CHARACTER_LIMIT = 25_000;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 96;
