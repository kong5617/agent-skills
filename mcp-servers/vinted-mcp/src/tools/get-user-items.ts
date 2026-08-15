import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { domainSchema, pageSchema, perPageSchema } from "../schemas.js";
import { vintedClient } from "../vinted-client.js";
import { extractId } from "../ids.js";
import { summarizeItem, toLimitedJson } from "../format.js";
import { describeError } from "../errors.js";
import type { VintedUserItemsResponse } from "../types.js";

const InputSchema = {
  user: z.string().min(1).describe("Numeric user/member ID, or a full Vinted profile URL."),
  page: pageSchema,
  per_page: perPageSchema,
  domain: domainSchema,
};

type Input = { user: string; page: number; per_page: number; domain: string };

export function registerGetUserItemsTool(server: McpServer): void {
  server.registerTool(
    "vinted_get_user_items",
    {
      title: "List a Seller's Vinted Listings",
      description: `List the items a Vinted user currently has for sale (their "closet").

This is a read-only lookup and does NOT require login.

Args:
  - user (string): numeric user ID, or a full profile URL
  - page (number, default 1), per_page (number, default 20, max 96)
  - domain (string, default 'vinted.com')

Returns: JSON with the seller's active listings (id, title, price, brand, size, condition, url,
photo_url) and pagination info. Use vinted_get_item for full detail on any listing returned here.`,
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
        const id = extractId(params.user, "user");
        const data = await vintedClient.get<VintedUserItemsResponse>(params.domain, `/api/v2/users/${id}/items`, {
          page: params.page,
          per_page: params.per_page,
        });

        const items = (data.items ?? []).map(summarizeItem);
        const output = {
          user_id: id,
          page: data.pagination?.current_page ?? params.page,
          total_pages: data.pagination?.total_pages,
          total_entries: data.pagination?.total_entries ?? items.length,
          count: items.length,
          items,
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
