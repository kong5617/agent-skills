import { CHARACTER_LIMIT } from "./constants.js";
import type { VintedItemSummary, VintedMoney } from "./types.js";

export function formatMoney(money: VintedMoney | undefined): string | undefined {
  if (!money?.amount) return undefined;
  return money.currency_code ? `${money.amount} ${money.currency_code}` : money.amount;
}

export function summarizeItem(item: VintedItemSummary) {
  return {
    id: item.id,
    title: item.title,
    price: formatMoney(item.total_item_price ?? item.price),
    brand: item.brand_title,
    size: item.size_title,
    condition: item.status,
    seller: item.user?.login,
    url: item.url,
    photo_url: item.photo?.url ?? item.photos?.[0]?.url,
    favourite_count: item.favourite_count,
  };
}

/** Serializes structured content and truncates the text view if it would blow the context budget. */
export function toLimitedJson(payload: Record<string, unknown>): string {
  const full = JSON.stringify(payload, null, 2);
  if (full.length <= CHARACTER_LIMIT) return full;

  const truncatedNote = {
    ...payload,
    truncated: true,
    truncation_message: `Response truncated to stay under ${CHARACTER_LIMIT} characters. Narrow your query (smaller per_page, more specific filters) to see full results.`,
  };
  // Best-effort: drop list fields down to a prefix until it fits.
  for (const key of Object.keys(truncatedNote)) {
    const value = (truncatedNote as Record<string, unknown>)[key];
    if (Array.isArray(value) && value.length > 1) {
      (truncatedNote as Record<string, unknown>)[key] = value.slice(0, Math.max(1, Math.ceil(value.length / 2)));
      const attempt = JSON.stringify(truncatedNote, null, 2);
      if (attempt.length <= CHARACTER_LIMIT) return attempt;
    }
  }
  return JSON.stringify(truncatedNote, null, 2).slice(0, CHARACTER_LIMIT);
}
