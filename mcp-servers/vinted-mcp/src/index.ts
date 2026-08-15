#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerSearchItemsTool } from "./tools/search-items.js";
import { registerGetItemTool } from "./tools/get-item.js";
import { registerGetUserTool } from "./tools/get-user.js";
import { registerGetUserItemsTool } from "./tools/get-user-items.js";
import { registerGetUserFeedbackTool } from "./tools/get-user-feedback.js";

const server = new McpServer({
  name: "vinted-mcp-server",
  version: "0.1.0",
});

registerSearchItemsTool(server);
registerGetItemTool(server);
registerGetUserTool(server);
registerGetUserItemsTool(server);
registerGetUserFeedbackTool(server);

async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("vinted-mcp-server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error starting vinted-mcp-server:", error);
  process.exit(1);
});
