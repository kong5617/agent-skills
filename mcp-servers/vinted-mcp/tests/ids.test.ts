import { test } from "node:test";
import assert from "node:assert/strict";
import { extractId } from "../src/ids.js";
import { VintedApiError } from "../src/vinted-client.js";

test("extractId accepts a bare numeric ID", () => {
  assert.equal(extractId("1234567", "item"), 1234567);
});

test("extractId pulls the ID out of an item URL", () => {
  assert.equal(extractId("https://www.vinted.com/items/1234567-nike-air-max", "item"), 1234567);
});

test("extractId pulls the ID out of a member URL", () => {
  assert.equal(extractId("https://www.vinted.fr/member/7654321-jane", "user"), 7654321);
});

test("extractId throws a VintedApiError for unrecognized input", () => {
  assert.throws(() => extractId("not-a-valid-id", "item"), VintedApiError);
});
