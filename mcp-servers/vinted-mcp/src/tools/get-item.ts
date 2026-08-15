import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { domainSchema } from "../schemas.js";
import { vintedClient } from "../vinted-client.js";
import { extractId } from "../ids.js";
import { formatMoney, toLimitedJson } from "../format.js";
import { describeError } from "../errors.js";
import type { VintedItemDetailResponse } from "../types.js";

const InputSchema = {
  item: z.string().min(1).describe("Numeric item ID, or a full Vinted item URL (e.g. https://www.vinted.com/items/1234567-...)."),
  domain: domainSchema,
};

type Input = { item: string; domain: string };

export function registerGetItemTool(server: McpServer): void {
  server.registerTool(
    "vinted_get_item",
    {
      title: "Get Vinted Item Details",
      description: `Fetch full details for a single Vinted listing by ID or URL.

This is a read-only lookup and does NOT require login.

Args:
  - item (string): numeric item ID, or a full item URL
  - domain (string, default 'vinted.com'): which regional marketplace the item belongs to

Returns: JSON with title, description, price, brand, size, condition, color, material, seller
info, photo URLs, favourite/view counts, and the canonical listing URL.

Errors:
  - Returns "Not found" if the item doesn't exist, was deleted, or was sold and removed.
  - Returns an access-denied message if Vinted's anti-bot layer blocks the request; retrying later
    or from a different network sometimes helps.`,
      inputSchema: InputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (params: Input) => {
      try {
        const id = extractId(params.item, "item");
        const data = await vintedClient.get<VintedItemDetailResponse>(params.domain, `/api/v2/items/${id}`);
        const item = data.item;

        if (!item) {
          return {
            content: [{ type: "text" as const, text: `No item data returned for ID ${id} on ${params.domain}.` }],
            isError: true,
          };
        }

        const output = {
          id: item.id,
          title: item.title,
          description: item.description,
          price: formatMoney(item.total_item_price ?? item.price),
          brand: item.brand_title,
          size: item.size_title,
          condition: item.status,
          color: [item.color1, item.color2].filter(Boolean).join(", ") || undefined,
          material: item.material_title,
          seller: item.user?.login ? { id: item.user.id, login: item.user.login, business: item.user.business } : undefined,
          photo_urls: (item.photos ?? (item.photo ? [item.photo] : [])).map((p) => p.full_size_url ?? p.url).filter(Boolean),
          favourite_count: item.favourite_count,
          view_count: item.view_count,
          url: item.url,
        };

        return {
          content: [{ type: "text" as const, text: toLimitedJson(output) }],
          structuredContent: output,
        };
      } catch (error) {
        return {
          content: [{ type: "text" as const, text: describeError(error) }],
          isError: true,
        };
      }
    },
  );
}
