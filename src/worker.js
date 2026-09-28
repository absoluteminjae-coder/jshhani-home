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


// Step 1: expose the existing client SEO metadata in the initial HTML response.
  const DETAIL_SEO={
    damjeok:{title:'청주 담적병·기능성소화불량 진료 | 더부룩함·명치 답답함 | 제세현한의원',description:'담적병의 의미, 식후 더부룩함·조기 포만감·명치 통증·트림 등 주요 증상, 기능성소화불량과의 차이, 검사가 먼저 필요한 경우, 제세현한의원의 진료 기준과 근거자료를 안내합니다.'},
    bopye:{title:'청주 쉰목소리·기침·비염 진료 | 보폐고엔오 | 제세현한의원',description:'쉰 목소리, 감기 후 오래가는 기침·가래, 비염·후비루가 반복될 때 확인할 증상과 검사가 필요한 경우, 제세현한의원의 보폐고엔오·호흡기 진료 기준과 근거자료를 안내합니다.'},
    diet:{title:'청주 한방 다이어트 | 제세현한의원',description:'체중과 식습관, 생활패턴을 함께 살펴보는 제세현한의원 한방 다이어트 프로그램 안내입니다.'},
    pain:{title:'청주 통증클리닉 | 골반·만성통증·근골격계 초음파 | 제세현한의원',description:'반복되는 허리·골반·고관절·어깨·무릎 통증에서 골반과 움직임, 심부근육, 힘줄·인대 상태를 함께 평가하고 침·도침·자기장·충격파·초음파약침·매선 치료 방향을 안내합니다.'},
    menopause:{title:'청주 갱년기장애 한의원 | 50대 열감·냉증·불면·피로 | 제세현한의원',description:'50대 갱년기에서 열감·야간발한뿐 아니라 냉증·피로·불면·두근거림·배뇨 변화까지 함께 확인합니다. 체열진단과 HRV는 보조적으로 참고하며 한의학적 변증에 따라 맞춤 진료 방향을 안내합니다.'},
    immunity:{title:'청주 녹용보약·면역관리 | 제세현한의원',description:'피로와 체력 저하 등 현재 상태를 살펴보고 녹용보약과 한약 진료를 안내하는 제세현한의원 진료 페이지입니다.'},
    vascular:{title:'청주 경동맥초음파·혈관관리 | 제세현한의원',description:'경동맥초음파를 포함해 혈관 상태와 대사 건강을 살펴보는 제세현한의원 혈관·대사 진료 안내입니다.'},
    autonomic:{title:'청주 자율신경·화병·갱년기 진료 | 제세현한의원',description:'두근거림, 열감, 불면, 어지럼 등 다양한 증상을 함께 살펴보는 제세현한의원 자율신경 진료 안내입니다.'},
    craniosacral:{title:'청주 두개천골치료 | 제세현한의원',description:'두개천골치료의 진료 과정과 적용 범위를 안내하는 제세현한의원 진료 페이지입니다.'},
    constitution:{title:'청주 맞춤 한약·체질 진료 | 제세현한의원',description:'증상과 생활상태를 함께 살펴 개인별 한약 진료 방향을 안내하는 제세현한의원 체질·한약 진료 페이지입니다.'},
    tonic:{title:'청주 보약·한약 진료 | 제세현한의원',description:'현재 증상과 체력 상태를 살펴 개인별 보약·한약 진료 방향을 안내하는 제세현한의원 진료 페이지입니다.'}
  };
DETAIL_SEO.menopasue = DETAIL_SEO.menopause;

function detailSeoFor(url) {
  let slug = url.searchParams.get('slug');
  if (!slug) {
    try { slug = decodeURIComponent(url.pathname.replace(/^\/+|\/+$/g, '')); }
    catch (_) { return null; }
  }
  const isDetail = /^\/[^/]+\/$/.test(url.pathname) ||
    ['/detail.html', '/detail', '/detail/'].includes(url.pathname);
  if (!isDetail || !Object.hasOwn(DETAIL_SEO, slug)) return null;
  return {...DETAIL_SEO[slug], canonical: 'https://jshhani.com/' + encodeURIComponent(slug) + '/'};
}

function escapeSeo(value) {
  return String(value).replace(/[&<>"']/g, c => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[c]));
}

async function applyServerDetailSeo(response, url, method) {
  const seo = detailSeoFor(url);
  if (!seo || response.status !== 200 ||
      !(response.headers.get('content-type') || '').includes('text/html')) return response;
  const headers = new Headers(response.headers);
  // Entity validators belong to the original shared HTML, not the rewritten page.
  for (const name of ['content-length', 'etag', 'last-modified', 'content-encoding']) headers.delete(name);
  headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  headers.set('X-JSH-SEO', 'server-v1');
  if (method === 'HEAD') return new Response(null, {status:200, headers});
  const html = await response.text();
  const body = html.replace(/<head\b[^>]*>[\s\S]*?<\/head>/i, head => {
    const cleaned = head
      .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, '')
      .replace(/<meta\b(?=[^>]*\bname\s*=\s*["']description["'])[^>]*>/gi, '')
      .replace(/<link\b(?=[^>]*\brel\s*=\s*["']canonical["'])[^>]*>/gi, '')
      .replace(/<meta\b(?=[^>]*\bproperty\s*=\s*["']og:(?:title|description|url)["'])[^>]*>/gi, '');
    const tags = [
      '<title>' + escapeSeo(seo.title) + '</title>',
      '<meta name="description" content="' + escapeSeo(seo.description) + '">',
      '<link rel="canonical" href="' + escapeSeo(seo.canonical) + '">',
      '<meta property="og:title" content="' + escapeSeo(seo.title) + '">',
      '<meta property="og:description" content="' + escapeSeo(seo.description) + '">',
      '<meta property="og:url" content="' + escapeSeo(seo.canonical) + '">'
    ].join('\n');
    return cleaned.replace(/<\/head>/i, tags + '\n</head>');
  });
  return new Response(body, {status:200, headers});
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

    response = await applyServerDetailSeo(response, url, request.method);

    if (request.method === "GET" && response.ok) {
      ctx.waitUntil(recordAiEvent(request, url).catch(() => {}));
    }

    return response;
  }
};
