import { test } from "node:test";
import assert from "node:assert/strict";
import { VintedClient, VintedApiError } from "../src/vinted-client.js";

function htmlResponseWithCookie(cookie = "access_token_web=abc123") {
  const headers = new Headers();
  headers.append("set-cookie", `${cookie}; Path=/; HttpOnly`);
  return new Response("<html></html>", { status: 200, headers });
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

test("get() bootstraps a session then returns parsed JSON", async (t) => {
  const calls: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: string) => {
    calls.push(url);
    if (calls.length === 1) return htmlResponseWithCookie();
    return jsonResponse({ code: 0, items: [{ id: 1, title: "Test item" }] });
  });

  const client = new VintedClient();
  const data = await client.get<{ items: { id: number; title: string }[] }>("vinted.com", "/api/v2/catalog/items", {
    search_text: "nike",
  });

  assert.equal(data.items[0].title, "Test item");
  assert.equal(calls.length, 2);
  assert.equal(calls[0], "https://www.vinted.com/");
  assert.match(calls[1], /^https:\/\/www\.vinted\.com\/api\/v2\/catalog\/items\?search_text=nike$/);
});

test("get() refreshes the session once on a 403 and retries", async (t) => {
  const responses = [
    htmlResponseWithCookie("session=first"),
    new Response("forbidden", { status: 403 }),
    htmlResponseWithCookie("session=second"),
    jsonResponse({ code: 0, item: { id: 42 } }),
  ];
  let i = 0;
  t.mock.method(globalThis, "fetch", async () => responses[i++]);

  const client = new VintedClient();
  const data = await client.get<{ item: { id: number } }>("vinted.com", "/api/v2/items/42");

  assert.equal(data.item.id, 42);
  assert.equal(i, 4);
});

test("get() surfaces rate limiting as a VintedApiError with status 429", async (t) => {
  t.mock.method(globalThis, "fetch", async (_url: string, init?: RequestInit) => {
    if (!init?.headers || !(init.headers as Record<string, string>).Cookie) {
      return htmlResponseWithCookie();
    }
    return new Response("rate limited", { status: 429 });
  });

  const client = new VintedClient();
  await assert.rejects(
    () => client.get("vinted.com", "/api/v2/catalog/items"),
    (error: unknown) => error instanceof VintedApiError && error.status === 429,
  );
});

test("get() surfaces a Vinted error envelope (code != 0) as a VintedApiError", async (t) => {
  let call = 0;
  t.mock.method(globalThis, "fetch", async () => {
    call++;
    if (call === 1) return htmlResponseWithCookie();
    return jsonResponse({ code: 1, message_code: "not_found" });
  });

  const client = new VintedClient();
  await assert.rejects(
    () => client.get("vinted.com", "/api/v2/items/999999"),
    (error: unknown) => error instanceof VintedApiError && /not_found/.test(error.message),
  );
});
