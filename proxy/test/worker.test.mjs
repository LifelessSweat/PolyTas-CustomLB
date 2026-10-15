import test from "node:test";
import assert from "node:assert/strict";
import worker from "../src/index.mjs";

test("forwards game API method, path, query, and body to the fixed upstream", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  let forwarded;
  globalThis.fetch = async (request) => {
    forwarded = request;
    return Response.json({ uploadId: 12 });
  };

  const response = await worker.fetch(new Request(
    "https://polytrackproxy.gassers.workers.dev/v6/leaderboard?version=0.6.2&trackId=summer1",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: "frames=123&recording=encoded"
    }
  ));

  assert.equal(forwarded.url, "https://vps.kodub.com/v6/leaderboard?version=0.6.2&trackId=summer1");
  assert.equal(forwarded.method, "POST");
  assert.equal(await forwarded.text(), "frames=123&recording=encoded");
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { uploadId: 12 });
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*");
  assert.equal(response.headers.get("Access-Control-Allow-Credentials"), null);
});

test("answers API CORS preflight without contacting upstream", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = () => { throw new Error("preflight must not reach upstream"); };

  const response = await worker.fetch(new Request(
    "https://polytrackproxy.gassers.workers.dev/v6/leaderboard",
    { method: "OPTIONS" }
  ));

  assert.equal(response.status, 204);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*");
  assert.equal(response.headers.get("Access-Control-Allow-Methods"), "GET, POST, OPTIONS");
});

test("does not expose a general-purpose URL proxy", async () => {
  const response = await worker.fetch(new Request(
    "https://polytrackproxy.gassers.workers.dev/https://example.com/"
  ));
  assert.equal(response.status, 404);
});

test("reports upstream failures as a CORS-readable 502", async (t) => {
  const originalFetch = globalThis.fetch;
  t.after(() => { globalThis.fetch = originalFetch; });
  globalThis.fetch = async () => { throw new Error("upstream offline"); };

  const response = await worker.fetch(new Request(
    "https://polytrackproxy.gassers.workers.dev/v6/leaderboard"
  ));

  assert.equal(response.status, 502);
  assert.equal(response.headers.get("Access-Control-Allow-Origin"), "*");
  assert.match((await response.json()).detail, /upstream offline/);
});
