# vinted-mcp-server

An MCP (Model Context Protocol) server for browsing and searching [Vinted](https://www.vinted.com), the secondhand fashion marketplace.

## What this is (and isn't)

Vinted has no public read API. This server talks to the same unofficial `/api/v2` JSON
endpoints Vinted's own web frontend uses — the same approach taken by every open-source
Vinted wrapper (`vinted_scraper`, `pyVinted`, `vinted-api-wrapper`, etc.). It works against
**public listing data only**: no login, no credentials, no account actions.

It does **not** currently support creating, editing, or deleting listings. Posting a listing
is an authenticated, account-mutating action against an undocumented endpoint, and getting it
wrong risks the account, not just a failed request — that needs to be built from a verified
real request rather than a guess. See [Contributing a `create_listing` tool](#contributing-a-create_listing-tool)
if you want to help close that gap.

**This is unofficial and best-effort.** Vinted's internal API is not documented, can change
without notice, and its anti-bot layer may rate-limit or block requests unpredictably. Don't
build anything business-critical on top of it, and keep request volume reasonable.

## Tools

All tools are read-only (`readOnlyHint: true`) and require no authentication.

| Tool | Description |
|---|---|
| `vinted_search_items` | Search listings by keyword and/or taxonomy filters (brand, size, color, price range, condition), with sorting and pagination. |
| `vinted_get_item` | Full detail for one listing, by numeric ID or item URL. |
| `vinted_get_user` | A seller's public profile: reputation, feedback counts, item counts, location. |
| `vinted_get_user_items` | The items a seller currently has for sale. |
| `vinted_get_user_feedback` | Individual reviews left for a seller. |

Every tool accepts an optional `domain` parameter (default `vinted.com`) to target a specific
regional marketplace, e.g. `vinted.fr`, `vinted.co.uk`, `vinted.de`.

## Setup

```bash
cd mcp-servers/vinted-mcp
npm install
npm run build
```

Add it to your MCP client config (stdio transport):

```json
{
  "mcpServers": {
    "vinted": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-servers/vinted-mcp/dist/index.js"]
    }
  }
}
```

No environment variables or credentials are required.

## Development

```bash
npm run dev        # run src/index.ts directly with auto-reload
npm run typecheck   # tsc --noEmit
npm test            # unit tests (mocked HTTP, no live network calls)
npm run build        # compile to dist/
```

Inspect tools interactively with the [MCP Inspector](https://github.com/modelcontextprotocol/inspector):

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## Architecture

- `src/vinted-client.ts` — HTTP client. Bootstraps an anonymous browsing session by requesting
  the storefront once to collect the cookie Vinted's anti-bot layer expects, caches it per
  domain for 10 minutes, and refreshes it once on a 401/403 before giving up.
- `src/schemas.ts` — shared Zod pieces (domain, pagination) reused across tools.
- `src/ids.ts` — accepts either a bare numeric ID or a full Vinted URL for item/user lookups.
- `src/format.ts` — response shaping and a character-limit guard so large result sets get
  truncated with a clear note instead of blowing out the model's context.
- `src/tools/*.ts` — one file per tool.

## Contributing a `create_listing` tool

Vinted does have an official, documented, stable API for managing your own inventory —
[Vinted Pro Integrations](https://pro-docs.svc.vinted.com/) — but it requires a Vinted Pro
seller account manually approved by Vinted for API access, and uses HMAC-SHA256-signed
requests (`X-Vpi-Access-Key` / `X-Vpi-Hmac-Sha256`). If you have Pro API access, a tool built
against that is the right way to add write support here.

Short of that, the unofficial internal "create item" endpoint isn't reliably documented
anywhere. If you want to add it anyway, capture a real request (DevTools Network tab → create
a listing on vinted.com → copy the create-item and photo-upload requests as cURL) and build
the tool from that, rather than guessing the payload shape against a real account.
