import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { domainSchema, pageSchema, perPageSchema } from "../schemas.js";
import { vintedClient } from "../vinted-client.js";
import { extractId } from "../ids.js";
import { toLimitedJson } from "../format.js";
import { describeError } from "../errors.js";
import type { VintedFeedback, VintedFeedbacksResponse } from "../types.js";

const InputSchema = {
  user: z.string().min(1).describe("Numeric user/member ID, or a full Vinted profile URL."),
  page: pageSchema,
  per_page: perPageSchema,
  domain: domainSchema,
};

type Input = { user: string; page: number; per_page: number; domain: string };

function summarizeFeedback(f: VintedFeedback) {
  return {
    id: f.id,
    from: f.user?.login,
    rating: f.rating,
    comment: f.comment,
    item_title: f.item?.title,
    created_at: f.created_at,
  };
}

export function registerGetUserFeedbackTool(server: McpServer): void {
  server.registerTool(
    "vinted_get_user_feedback",
    {
      title: "Get Vinted Seller Feedback",
      description: `List the reviews/feedback other members left for a Vinted user.

This is a read-only lookup and does NOT require login.

Args:
  - user (string): numeric user ID, or a full profile URL
  - page (number, default 1), per_page (number, default 20, max 96)
  - domain (string, default 'vinted.com')

Returns: JSON with individual feedback entries (reviewer, rating, comment, related item, date) and
pagination info. Pair with vinted_get_user for the aggregate positive/negative/neutral counts.`,
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
        const data = await vintedClient.get<VintedFeedbacksResponse>(params.domain, "/api/v2/feedbacks", {
          user_id: id,
          page: params.page,
          per_page: params.per_page,
        });

        const feedbacks = (data.user_feedbacks ?? data.feedbacks ?? []).map(summarizeFeedback);
        const output = {
          user_id: id,
          page: data.pagination?.current_page ?? params.page,
          total_pages: data.pagination?.total_pages,
          total_entries: data.pagination?.total_entries ?? feedbacks.length,
          count: feedbacks.length,
          feedbacks,
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
