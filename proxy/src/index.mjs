const DEFAULT_UPSTREAM_ORIGIN = "https://vps.kodub.com";

function corsHeaders(headers) {
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "*");
  headers.delete("Access-Control-Allow-Credentials");
  return headers;
}

export default {
  async fetch(request, env = {}) {
    const incomingUrl = new URL(request.url);
    if (!incomingUrl.pathname.startsWith("/v6/")) {
      return new Response("Not found", { status: 404 });
    }

    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: corsHeaders(new Headers())
      });
    }

    if (!["GET", "POST"].includes(request.method)) {
      return new Response("Method not allowed", {
        status: 405,
        headers: corsHeaders(new Headers({ Allow: "GET, POST, OPTIONS" }))
      });
    }

    let upstreamOrigin;
    try {
      upstreamOrigin = new URL(env.UPSTREAM_ORIGIN || DEFAULT_UPSTREAM_ORIGIN);
    } catch {
      return Response.json(
        { error: "Invalid proxy upstream configuration" },
        { status: 500, headers: corsHeaders(new Headers()) }
      );
    }
    if (upstreamOrigin.protocol !== "https:") {
      return Response.json(
        { error: "Proxy upstream must use HTTPS" },
        { status: 500, headers: corsHeaders(new Headers()) }
      );
    }

    const upstreamUrl = new URL(incomingUrl.pathname + incomingUrl.search, upstreamOrigin);
    let upstreamResponse;
    try {
      const upstreamRequest = new Request(upstreamUrl, request);
      upstreamResponse = await fetch(upstreamRequest);
    } catch (error) {
      return Response.json(
        { error: "Leaderboard upstream request failed", detail: String(error) },
        { status: 502, headers: corsHeaders(new Headers()) }
      );
    }

    if (request.headers.get("Upgrade")?.toLowerCase() === "websocket") {
      return upstreamResponse;
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      statusText: upstreamResponse.statusText,
      headers: corsHeaders(new Headers(upstreamResponse.headers))
    });
  }
};
