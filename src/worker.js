export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    if (/^\/[^/]+\/$/.test(url.pathname)) {
      const detailUrl = new URL("/detail.html", url.origin);
      const detailRequest = new Request(detailUrl, {
        method: request.method,
        headers: request.headers
      });

      const response = await env.ASSETS.fetch(detailRequest);

      if (response.ok) {
        const headers = new Headers(response.headers);
        headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");

        return new Response(
          request.method === "HEAD" ? null : response.body,
          { status: 200, headers }
        );
      }
    }

    return new Response("Not Found", { status: 404 });
  }
};
