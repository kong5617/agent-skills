import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { domainSchema, pageSchema, perPageSchema } from "../schemas.js";
import { vintedClient } from "../vinted-client.js";
import { summarizeItem, toLimitedJson } from "../format.js";
import { describeError } from "../errors.js";
import type { VintedSearchResponse } from "../types.js";

const OrderEnum = z.enum(["relevance", "newest_first", "price_high_to_low", "price_low_to_high"]);

const idListSchema = z
  .array(z.number().int().positive())
  .optional()
  .describe("Numeric IDs. Look these up first with vinted_get_item on a similar item, or via the site's URL filters.");

const InputSchema = {
  search_text: z.string().max(200).optional().describe("Free-text search query, e.g. 'nike air max'."),
  catalog_ids: idListSchema.describe("Category IDs to restrict the search to (e.g. men's shoes, women's dresses)."),
  brand_ids: idListSchema.describe("Brand IDs to filter by."),
  size_ids: idListSchema.describe("Size IDs to filter by."),
  color_ids: idListSchema.describe("Color IDs to filter by."),
  material_ids: idListSchema.describe("Material IDs to filter by."),
  status_ids: idListSchema.describe("Condition/status IDs to filter by (e.g. new with tags, very good)."),
  price_from: z.number().nonnegative().optional().describe("Minimum price, inclusive."),
  price_to: z.number().nonnegative().optional().describe("Maximum price, inclusive."),
  currency: z.string().length(3).optional().describe("3-letter currency code matching price_from/price_to, e.g. 'EUR', 'USD', 'GBP'."),
  order: OrderEnum.default("relevance").describe("Sort order for results."),
  page: pageSchema,
  per_page: perPageSchema,
  domain: domainSchema,
};

type Input = {
  [K in keyof typeof InputSchema]: z.infer<(typeof InputSchema)[K]>;
};

export function registerSearchItemsTool(server: McpServer): void {
  server.registerTool(
    "vinted_search_items",
    {
      title: "Search Vinted Items",
      description: `Search Vinted's secondhand marketplace listings by keyword and/or filters.

This is a read-only browse/search over public listings. It does NOT require login. Numeric filter
IDs (catalog_ids, brand_ids, size_ids, color_ids, material_ids, status_ids) come from Vinted's own
taxonomy and are not resolvable by name through this server yet — omit them for a plain keyword
search, or pass IDs you already know (e.g. copied from a vinted.com search URL's query string).

Args:
  - search_text (string, optional): free-text query
  - catalog_ids/brand_ids/size_ids/color_ids/material_ids/status_ids (number[], optional): taxonomy filters
  - price_from/price_to (number, optional): inclusive price range
  - currency (string, optional): 3-letter code, e.g. 'EUR'
  - order: 'relevance' | 'newest_first' | 'price_high_to_low' | 'price_low_to_high' (default 'relevance')
  - page (number, default 1), per_page (number, default 20, max 96)
  - domain (string, default 'vinted.com'): which regional marketplace to query

Returns: JSON with total match count, the returned items (id, title, price, brand, size, condition,
seller, url, photo_url, favourite_count), and pagination info.

Errors:
  - Returns a clear message if Vinted rate-limits or blocks the request (its anti-bot layer can
    reject automated traffic unpredictably; retrying later or narrowing the query often helps).`,
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
        const data = await vintedClient.get<VintedSearchResponse>(params.domain, "/api/v2/catalog/items", {
          search_text: params.search_text,
          catalog_ids: params.catalog_ids?.join(","),
          brand_ids: params.brand_ids?.join(","),
          size_ids: params.size_ids?.join(","),
          color_ids: params.color_ids?.join(","),
          material_ids: params.material_ids?.join(","),
          status_ids: params.status_ids?.join(","),
          price_from: params.price_from,
          price_to: params.price_to,
          currency: params.currency,
          order: params.order,
          page: params.page,
          per_page: params.per_page,
        });

        const items = (data.items ?? []).map(summarizeItem);
        const output = {
          domain: params.domain,
          query: params.search_text,
          total_entries: data.pagination?.total_entries ?? items.length,
          page: data.pagination?.current_page ?? params.page,
          total_pages: data.pagination?.total_pages,
          count: items.length,
          items,
        };

        if (items.length === 0) {
          return {
            content: [
              {
                type: "text" as const,
                text: `No items found${params.search_text ? ` for '${params.search_text}'` : ""} on ${params.domain}. Try broadening filters or removing price bounds.`,
              },
            ],
            structuredContent: output,
          };
        }

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
