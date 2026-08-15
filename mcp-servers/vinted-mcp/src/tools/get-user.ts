import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { domainSchema } from "../schemas.js";
import { vintedClient } from "../vinted-client.js";
import { extractId } from "../ids.js";
import { toLimitedJson } from "../format.js";
import { describeError } from "../errors.js";
import type { VintedUserResponse } from "../types.js";

const InputSchema = {
  user: z.string().min(1).describe("Numeric user/member ID, or a full Vinted profile URL (e.g. https://www.vinted.com/member/7654321-...)."),
  domain: domainSchema,
};

type Input = { user: string; domain: string };

export function registerGetUserTool(server: McpServer): void {
  server.registerTool(
    "vinted_get_user",
    {
      title: "Get Vinted Seller Profile",
      description: `Fetch a Vinted user's public profile: reputation, feedback counts, item counts, location.

This is a read-only lookup and does NOT require login.

Args:
  - user (string): numeric user ID, or a full profile URL
  - domain (string, default 'vinted.com'): which regional marketplace the profile belongs to

Returns: JSON with login, real_name (if public), city/country, item_count, follower/following
counts, positive/negative/neutral feedback counts, feedback_reputation, business-account flag,
and account creation date.

Use vinted_get_user_items to list what they're currently selling, and vinted_get_user_feedback
for their individual reviews.`,
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
        const data = await vintedClient.get<VintedUserResponse>(params.domain, `/api/v2/users/${id}`);
        const user = data.user;

        if (!user) {
          return {
            content: [{ type: "text" as const, text: `No user data returned for ID ${id} on ${params.domain}.` }],
            isError: true,
          };
        }

        const output = {
          id: user.id,
          login: user.login,
          real_name: user.real_name,
          city: user.city,
          country: user.country_title,
          item_count: user.item_count,
          given_item_count: user.given_item_count,
          followers_count: user.followers_count,
          following_count: user.following_count,
          feedback: {
            positive: user.positive_feedback_count,
            negative: user.negative_feedback_count,
            neutral: user.neutral_feedback_count,
            reputation: user.feedback_reputation,
          },
          business_account: user.business,
          member_since: user.created_at,
          last_active: user.last_loged_on_ts,
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
