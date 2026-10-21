const { test } = require("node:test");
const assert = require("node:assert/strict");
const vm = require("node:vm");
const fs = require("node:fs");
const path = require("node:path");
function setup({ wrongRestaurant = false, wrongTable = false } = {}) {
  const calls = [];
  const stored = new Map([
    ["session-cafe-T01", "tampered-session"],
    ["qr-token-cafe-T01", "fixture-token"],
  ]);
  const api = {
    get: async (url, options) => {
      calls.push({ url, options });
      return {
        data: {
          data: url.endsWith("/cafe")
            ? { id: "cafe-id" }
            : url.includes("/tables/")
              ? {
                  id: "table-id",
                  restaurantId: wrongRestaurant ? "other" : "cafe-id",
                  code: "T01",
                  activeSession: { id: "active-session" },
                }
              : {
                  id: "active-session",
                  restaurantId: "cafe-id",
                  tableId: wrongTable ? "other-table" : "table-id",
                  status: "ACTIVE",
                },
        },
      };
    },
  };
  const source = fs
    .readFileSync(path.join(__dirname, "../app/lib/customerContext.js"), "utf8")
    .replace(/^import .*;$/gm, "")
    .replaceAll("export ", "");
  const context = {
    api,
    DEMO_RESTAURANT: { slug: "nookambika" },
    localStorage: {
      getItem: (key) => stored.get(key),
      setItem: (key, value) => stored.set(key, value),
      removeItem: (key) => stored.delete(key),
    },
  };
  vm.createContext(context);
  vm.runInContext(source, context);
  return { load: context.loadCustomerContext, calls, stored };
}
test("session is derived from the verified table, not a tampered stored ID", async () => {
  const h = setup();
  const result = await h.load("cafe", "t01");
  assert.equal(result.base, "/restaurant/cafe/table/T01");
  assert.equal(result.session.id, "active-session");
  assert.ok(!h.calls.some((call) => call.url.includes("tampered")));
  assert.equal(
    h.calls.find((call) => call.url.includes("/tables/")).options.params.token,
    "fixture-token",
  );
  assert.equal(h.stored.get("session-cafe-T01"), "active-session");
});
test("restaurant mismatch is rejected before fetching session data", async () => {
  const h = setup({ wrongRestaurant: true });
  await assert.rejects(h.load("cafe", "T01"), /does not match/);
  assert.ok(!h.calls.some((call) => call.url.startsWith("/sessions/")));
});
test("session/table mismatch is rejected", async () => {
  const h = setup({ wrongTable: true });
  await assert.rejects(h.load("cafe", "T01"), /could not be verified/);
});
