const SUPABASE_URL = "https://cegqsbsxtrvwmlqnilsz.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_f9h7XU0hhvSoD74iMAFY-Q_vTZXfRLO";

const AI_CRAWLERS = [
  ["OpenAI Search", /OAI-SearchBot/i],
  ["ChatGPT", /ChatGPT-User/i],
  ["OpenAI GPTBot", /GPTBot/i],
  ["Claude Search", /Claude-SearchBot/i],
  ["Claude", /Claude(?:Bot|-User)/i],
  ["Perplexity", /Perplexity(?:Bot|-User)/i],
  ["Microsoft Copilot", /CopilotBot/i],
  ["DuckAssist", /DuckAssistBot/i],
  ["Google AI", /Google-Extended/i],
  ["Apple AI", /Applebot-Extended/i],
  ["Amazon AI", /Amazonbot/i],
  ["Meta AI", /meta-externalagent/i],
  ["ByteDance AI", /Bytespider/i],
  ["You.com", /YouBot/i],
  ["Cohere", /cohere-ai/i],
  ["Common Crawl", /CCBot/i]
];

const EXTENSIONLESS_PAGE_PATHS = new Set([
  "/doctor",
  "/reviews",
  "/shop",
  "/article",
  "/detail",
  "/product"
]);

function classifyCrawler(userAgent) {
  for (const [source, pattern] of AI_CRAWLERS) {
    if (pattern.test(userAgent)) return source;
  }
  return "";
}

function classifyReferral(referrer) {
  if (!referrer) return "";

  try {
    const url = new URL(referrer);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    const path = url.pathname.toLowerCase();

    if (host === "chatgpt.com" || host === "chat.openai.com") return "ChatGPT";
    if (host === "perplexity.ai" || host.endsWith(".perplexity.ai")) return "Perplexity";
    if (host === "copilot.microsoft.com" || (host.endsWith("bing.com") && path.startsWith("/chat"))) return "Microsoft Copilot";
    if (host === "gemini.google.com" || host === "bard.google.com") return "Gemini";
    if (host === "claude.ai") return "Claude";
    if (host === "poe.com") return "Poe";
    if (host === "you.com") return "You.com";
    if (host === "phind.com") return "Phind";
    if (host === "meta.ai") return "Meta AI";
  } catch (_) {
    return "";
  }

  return "";
}

function isTrackablePage(url) {
  const path = url.pathname.toLowerCase();
  if (path === "/admin.html" || path === "/remote-consult.html") return false;
  if (path.startsWith("/assets/") || path.startsWith("/api/")) return false;
  return (
    path === "/" ||
    path.endsWith("/") ||
    path.endsWith(".html") ||
    EXTENSIONLESS_PAGE_PATHS.has(path)
  );
}

async function recordAiEvent(request, url) {
  if (!isTrackablePage(url)) return;

  const crawler = classifyCrawler(request.headers.get("user-agent") || "");
  const referral = crawler ? "" : classifyReferral(request.headers.get("referer") || "");
  if (!crawler && !referral) return;

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/cms_track_ai_event`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      p_event_type: crawler ? "crawler" : "referral",
      p_source: crawler || referral,
      p_path: (url.pathname + url.search).slice(0, 500),
      p_country: String(request.cf?.country || "").slice(0, 2)
    })
  });

  if (!response.ok && response.status !== 404) {
    console.warn("AI analytics write failed", response.status);
  }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    if (request.method !== "GET" && request.method !== "HEAD") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    let response;

    if (/^\/[^/]+\/$/.test(url.pathname)) {
      const detailUrl = new URL("/detail.html", url.origin);
      const detailRequest = new Request(detailUrl, {
        method: request.method,
        headers: request.headers
      });
      const detailResponse = await env.ASSETS.fetch(detailRequest);

      if (detailResponse.ok) {
        const headers = new Headers(detailResponse.headers);
        headers.set("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0");
        response = new Response(
          request.method === "HEAD" ? null : detailResponse.body,
          { status: 200, headers }
        );
      }
    }

    if (!response) response = await env.ASSETS.fetch(request);

    if (request.method === "GET" && response.ok) {
      ctx.waitUntil(recordAiEvent(request, url).catch(() => {}));
    }

    return response;
  }
};
