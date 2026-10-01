import type { Technology } from "../model/types";
import type { RuntimeSignals } from "./runtimeProbe";

/** What a browser observed after the page's scripts ran. */
export interface RenderedSignals {
  html: string;
  /** URLs the page requested. */
  requests: readonly string[];
  runtime: Readonly<RuntimeSignals>;
}

export interface DocumentSignals {
  /** Lower-cased response header names. */
  headers: Readonly<Record<string, string>>;
  html: string;
  rendered?: RenderedSignals | null;
}

type Signal =
  | { header: string; pattern?: RegExp }
  | { html: RegExp; label: string }
  /** A key reported by runtimeProbe, with how it was read. */
  | { runtime: string; label: string };

interface Rule {
  name: string;
  type: string;
  /** Any matching signal identifies the technology. A first capture group is its version. */
  signals: readonly Signal[];
  /** Technologies this one is built on, recorded as inferences. */
  implies?: readonly string[];
}

// Matches a URL inside a src or href attribute, not text that mentions it.
const asset = (path: string) =>
  new RegExp(`(?:src|href)=["'][^"']*${path}[^"']*["']`, "i");
const generator = (name: string) =>
  new RegExp(
    `<meta(?=[^>]*\\bname=["']generator["'])[^>]*\\bcontent=["']${name}\\s*v?([\\d.]*)[^"']*["']`,
    "i",
  );
const server = (pattern: RegExp): Signal => ({ header: "server", pattern });
const poweredBy = (pattern: RegExp): Signal => ({
  header: "x-powered-by",
  pattern,
});

const RULES: readonly Rule[] = [
  {
    name: "Next.js",
    type: "Framework",
    implies: ["React"],
    signals: [
      { runtime: "next", label: "window.next.version" },
      poweredBy(/Next\.js ?([\d.]*)/i),
      { header: "x-nextjs-cache" },
      { header: "x-nextjs-prerender" },
      { header: "x-nextjs-stale-time" },
      { header: "x-nextjs-matched-path" },
      {
        html: /<script[^>]+id=["']__NEXT_DATA__["']/i,
        label: "Pages Router data script",
      },
      { html: /self\.__next_f\s*=/, label: "App Router flight data" },
      { html: asset("/_next/static/"), label: "Next.js static asset path" },
    ],
  },
  {
    name: "Nuxt",
    type: "Framework",
    implies: ["Vue"],
    signals: [
      { runtime: "nuxt", label: "Nuxt runtime global" },
      poweredBy(/Nuxt/i),
      { html: /<div[^>]+id=["']__nuxt["']/i, label: "Nuxt root element" },
      { html: /window\.__NUXT__\s*=/, label: "Nuxt state script" },
      { html: asset("/_nuxt/"), label: "Nuxt asset path" },
    ],
  },
  {
    name: "Gatsby",
    type: "Framework",
    implies: ["React"],
    signals: [
      { html: /<div[^>]+id=["']___gatsby["']/i, label: "Gatsby root element" },
      { html: generator("Gatsby"), label: "Generator meta tag" },
    ],
  },
  {
    name: "Remix",
    type: "Framework",
    implies: ["React"],
    signals: [
      { html: /window\.__remixContext\s*=/, label: "Remix context script" },
    ],
  },
  {
    name: "React Router",
    type: "Framework",
    implies: ["React"],
    signals: [
      { runtime: "reactRouter", label: "window.__reactRouterVersion" },
      {
        html: /window\.__reactRouterContext\s*=/,
        label: "React Router framework context",
      },
    ],
  },
  {
    name: "SvelteKit",
    type: "Framework",
    implies: ["Svelte"],
    signals: [
      { html: /\sdata-sveltekit-[\w-]+/i, label: "SvelteKit data attribute" },
      {
        html: asset("/_app/immutable/"),
        label: "SvelteKit immutable asset path",
      },
    ],
  },
  {
    name: "Astro",
    type: "Framework",
    signals: [
      { html: generator("Astro"), label: "Generator meta tag" },
      { html: /<astro-island[\s>]/i, label: "Astro island element" },
      { html: asset("/_astro/"), label: "Astro asset path" },
    ],
  },
  {
    name: "Angular",
    type: "Framework",
    signals: [
      { runtime: "angular", label: "Angular runtime" },
      { html: /\sng-version=["']([\d.]+)["']/i, label: "ng-version attribute" },
    ],
  },
  {
    name: "Vue",
    type: "UI library",
    signals: [
      { runtime: "vue", label: "Vue app instance" },
      { html: /\sdata-v-app[\s>=]/i, label: "Vue app mount attribute" },
      {
        html: /\sdata-server-rendered=["']true["']/i,
        label: "Vue SSR attribute",
      },
    ],
  },
  {
    name: "React",
    type: "UI library",
    signals: [
      { runtime: "react", label: "React fiber on DOM nodes" },
      { html: /\sdata-reactroot[\s>=]/i, label: "data-reactroot attribute" },
      { html: asset("react-dom@([\\d.]+)"), label: "react-dom script" },
    ],
  },
  {
    name: "Ruby on Rails",
    type: "Framework",
    signals: [
      {
        html: /<meta[^>]+name=["']csrf-param["'][^>]+content=["']authenticity_token["']/i,
        label: "Rails CSRF meta tag",
      },
    ],
  },
  { name: "Express", type: "Framework", signals: [poweredBy(/^Express$/i)] },
  { name: "PHP", type: "Runtime", signals: [poweredBy(/PHP\/?([\d.]*)/i)] },
  {
    name: "ASP.NET",
    type: "Framework",
    signals: [
      poweredBy(/ASP\.NET/i),
      { header: "x-aspnet-version", pattern: /([\d.]+)/ },
    ],
  },
  {
    name: "WordPress",
    type: "CMS",
    signals: [
      { html: generator("WordPress"), label: "Generator meta tag" },
      {
        html: asset("/wp-(?:content|includes)/"),
        label: "WordPress asset path",
      },
    ],
  },
  {
    name: "Drupal",
    type: "CMS",
    signals: [
      { header: "x-generator", pattern: /Drupal ?(\d*)/i },
      { header: "x-drupal-cache" },
      { html: generator("Drupal"), label: "Generator meta tag" },
    ],
  },
  {
    name: "Ghost",
    type: "CMS",
    signals: [{ html: generator("Ghost"), label: "Generator meta tag" }],
  },
  {
    name: "Shopify",
    type: "Commerce",
    signals: [
      { header: "x-shopid" },
      { header: "x-shopify-stage" },
      { html: asset("cdn\\.shopify\\.com/"), label: "Shopify CDN asset" },
    ],
  },
  {
    name: "Webflow",
    type: "Site builder",
    signals: [
      { html: generator("Webflow"), label: "Generator meta tag" },
      { html: /<html[^>]+data-wf-page=/i, label: "Webflow page attribute" },
    ],
  },
  {
    name: "Wix",
    type: "Site builder",
    signals: [{ header: "x-wix-request-id" }],
  },
  {
    name: "Squarespace",
    type: "Site builder",
    signals: [
      {
        html: asset("static1\\.squarespace\\.com/"),
        label: "Squarespace asset",
      },
    ],
  },
  {
    name: "Hugo",
    type: "Site generator",
    signals: [{ html: generator("Hugo"), label: "Generator meta tag" }],
  },
  {
    name: "Jekyll",
    type: "Site generator",
    signals: [{ html: generator("Jekyll"), label: "Generator meta tag" }],
  },
  {
    name: "Docusaurus",
    type: "Site generator",
    implies: ["React"],
    signals: [{ html: generator("Docusaurus"), label: "Generator meta tag" }],
  },
  {
    name: "Vercel",
    type: "Hosting",
    signals: [
      { header: "x-vercel-id" },
      { header: "x-vercel-cache" },
      server(/^Vercel$/i),
    ],
  },
  {
    name: "Netlify",
    type: "Hosting",
    signals: [{ header: "x-nf-request-id" }, server(/^Netlify$/i)],
  },
  {
    name: "GitHub",
    type: "Hosting",
    signals: [server(/^GitHub\.com$/i)],
  },
  {
    name: "Heroku",
    type: "Hosting",
    signals: [{ header: "via", pattern: /vegur/i }],
  },
  { name: "Fly.io", type: "Hosting", signals: [{ header: "fly-request-id" }] },
  {
    name: "Render",
    type: "Hosting",
    signals: [{ header: "rndr-id" }, { header: "x-render-origin-server" }],
  },
  {
    name: "Google Cloud",
    type: "Hosting",
    signals: [server(/^Google Frontend$/i)],
  },
  { name: "Amazon S3", type: "Hosting", signals: [server(/^AmazonS3$/i)] },
  { name: "Azure", type: "Hosting", signals: [{ header: "x-azure-ref" }] },
  {
    name: "Cloudflare",
    type: "CDN",
    signals: [{ header: "cf-ray" }, server(/^cloudflare$/i)],
  },
  {
    name: "Fastly",
    type: "CDN",
    signals: [
      { header: "x-served-by", pattern: /cache-[a-z]{3}/i },
      { header: "x-fastly-request-id" },
    ],
  },
  {
    name: "Amazon CloudFront",
    type: "CDN",
    signals: [
      { header: "x-amz-cf-id" },
      { header: "via", pattern: /CloudFront/i },
    ],
  },
  {
    name: "Akamai",
    type: "CDN",
    signals: [
      { header: "akamai-grn" },
      { header: "x-akamai-transformed" },
      server(/^AkamaiGHost$/i),
    ],
  },
  {
    name: "Varnish",
    type: "Cache",
    signals: [{ header: "x-varnish" }, { header: "via", pattern: /varnish/i }],
  },
  {
    name: "nginx",
    type: "Web server",
    signals: [server(/^nginx\/?([\d.]*)/i)],
  },
  {
    name: "OpenResty",
    type: "Web server",
    signals: [server(/^openresty\/?([\d.]*)/i)],
  },
  {
    name: "Apache HTTP Server",
    type: "Web server",
    signals: [server(/^Apache\/?([\d.]*)/i)],
  },
  {
    name: "Microsoft IIS",
    type: "Web server",
    signals: [server(/^Microsoft-IIS\/?([\d.]*)/i)],
  },
  { name: "LiteSpeed", type: "Web server", signals: [server(/^LiteSpeed/i)] },
  { name: "Caddy", type: "Web server", signals: [server(/^Caddy/i)] },
  { name: "Envoy", type: "Web server", signals: [server(/^envoy/i)] },
  {
    name: "Google Tag Manager",
    type: "Tag manager",
    signals: [
      { runtime: "gtm", label: "window.google_tag_manager" },
      { html: /googletagmanager\.com\/gtm\.js/i, label: "GTM loader" },
    ],
  },
  {
    name: "Google Analytics",
    type: "Analytics",
    signals: [
      {
        html: asset("googletagmanager\\.com/gtag/js"),
        label: "gtag.js script",
      },
      {
        html: asset("google-analytics\\.com/(?:analytics|ga)\\.js"),
        label: "analytics.js script",
      },
    ],
  },
  {
    name: "Vercel Web Analytics",
    type: "Analytics",
    signals: [
      {
        html: asset("/_vercel/insights/script\\.js"),
        label: "Insights script",
      },
    ],
  },
  {
    name: "Vercel Speed Insights",
    type: "Monitoring",
    signals: [
      {
        html: asset("/_vercel/speed-insights/script\\.js"),
        label: "Speed Insights script",
      },
    ],
  },
  {
    name: "Cloudflare Web Analytics",
    type: "Analytics",
    signals: [
      {
        html: asset("static\\.cloudflareinsights\\.com/beacon"),
        label: "Beacon script",
      },
    ],
  },
  {
    name: "Plausible",
    type: "Analytics",
    signals: [{ html: asset("plausible\\.io/js/"), label: "Plausible script" }],
  },
  {
    name: "Fathom",
    type: "Analytics",
    signals: [
      { html: asset("cdn\\.usefathom\\.com/"), label: "Fathom script" },
    ],
  },
  {
    name: "Segment",
    type: "Analytics",
    signals: [
      { runtime: "segment", label: "window.analytics.VERSION" },
      { html: /cdn\.segment\.com\/analytics\.js/i, label: "Segment loader" },
    ],
  },
  {
    name: "Hotjar",
    type: "Analytics",
    signals: [
      { runtime: "hotjar", label: "window.hj" },
      { html: /static\.hotjar\.com\//i, label: "Hotjar loader" },
    ],
  },
  {
    name: "Sentry",
    type: "Monitoring",
    signals: [
      { runtime: "sentry", label: "window.__SENTRY__" },
      {
        html: asset("(?:browser|js)\\.sentry-cdn\\.com/([\\d.]+)?"),
        label: "Sentry CDN script",
      },
      {
        html: asset("\\.ingest\\.(?:[a-z]+\\.)?sentry\\.io/"),
        label: "Sentry ingestion request",
      },
    ],
  },
  {
    name: "Datadog RUM",
    type: "Monitoring",
    signals: [
      { runtime: "datadog", label: "window.DD_RUM" },
      {
        html: asset("datadoghq-browser-agent\\.com/"),
        label: "Datadog browser agent",
      },
    ],
  },
  {
    name: "New Relic",
    type: "Monitoring",
    signals: [
      { runtime: "newrelic", label: "window.NREUM" },
      {
        html: /js-agent\.newrelic\.com\/|window\.NREUM/,
        label: "New Relic browser agent",
      },
    ],
  },
  {
    name: "jQuery",
    type: "Library",
    signals: [
      { runtime: "jquery", label: "jQuery.fn.jquery" },
      {
        html: asset("jquery[.-]?(\\d+\\.\\d+\\.\\d+)?(?:\\.min)?\\.js"),
        label: "jQuery script",
      },
    ],
  },
  {
    name: "Bootstrap",
    type: "Library",
    signals: [
      {
        html: asset(
          "bootstrap(?:@|/)?(\\d+\\.\\d+\\.\\d+)?[^\"']*\\.(?:css|js)",
        ),
        label: "Bootstrap asset",
      },
    ],
  },
  {
    name: "Google Fonts",
    type: "Fonts",
    signals: [
      {
        html: asset("fonts\\.googleapis\\.com/"),
        label: "Google Fonts stylesheet",
      },
    ],
  },
  {
    name: "Adobe Fonts",
    type: "Fonts",
    signals: [
      { html: asset("use\\.typekit\\.net/"), label: "Typekit stylesheet" },
    ],
  },
  {
    name: "Stripe",
    type: "Payments",
    signals: [
      { runtime: "stripe", label: "window.Stripe" },
      { html: asset("js\\.stripe\\.com/"), label: "Stripe.js script" },
    ],
  },
  {
    name: "reCAPTCHA",
    type: "Security",
    signals: [
      {
        html: asset("(?:google\\.com|recaptcha\\.net)/recaptcha/"),
        label: "reCAPTCHA script",
      },
    ],
  },
  {
    name: "Intercom",
    type: "Support",
    signals: [
      { runtime: "intercom", label: "window.Intercom" },
      { html: /widget\.intercom\.io\//i, label: "Intercom widget" },
    ],
  },
];

const RUNTIME_RULES: readonly Rule[] = [
  ["Svelte", "UI library", "svelte", "window.__svelte"],
  ["SolidJS", "UI library", "solid", "Solid hydration global"],
  ["Lit", "UI library", "lit", "Lit version registry"],
  ["Alpine.js", "Library", "alpine", "window.Alpine"],
  ["htmx", "Library", "htmx", "window.htmx"],
  ["Ember.js", "Framework", "ember", "window.Ember"],
  ["Hotwire Turbo", "Library", "turbo", "window.Turbo"],
  ["PostHog", "Analytics", "posthog", "window.posthog"],
  ["Mixpanel", "Analytics", "mixpanel", "window.mixpanel"],
  ["Amplitude", "Analytics", "amplitude", "window.amplitude"],
  [
    "React Query",
    "Library",
    "tanstackQuery",
    "window.__TANSTACK_QUERY_CLIENT__",
  ],
  ["Zod", "Library", "zod", "Zod global registry"],
  ["Three.js", "Library", "three", "window.__THREE__"],
  ["GSAP", "Library", "gsap", "GSAP version registry"],
  ["Turbopack", "Bundler", "turbopack", "TURBOPACK chunk-loading global"],
  ["Apollo Client", "Library", "apollo", "window.__APOLLO_CLIENT__"],
  ["Prism", "Library", "prism", "window.Prism"],
  ["D3", "Library", "d3", "window.d3"],
  ["Chart.js", "Library", "chartjs", "window.Chart"],
  ["Leaflet", "Library", "leaflet", "window.L"],
  ["Moment.js", "Library", "moment", "window.moment"],
  ["Firebase", "Backend service", "firebase", "firebase.SDK_VERSION"],
  ["Lottie", "Library", "lottie", "window.lottie"],
  ["Swiper", "Library", "swiper", "window.Swiper"],
  ["Crisp", "Support", "crisp", "window.$crisp"],
].map(([name, type, runtime, label]) => ({
  name,
  type,
  signals: [{ runtime, label }],
}));

// Third-party services seen in a runtime global or a request to their host.
const SERVICE_RULES: readonly Rule[] = [
  ["Contentful", "CMS", "", "ctfassets\\.net/", "Contentful asset"],
  [
    "Vercel Blob",
    "Storage",
    "",
    "\\.blob\\.vercel-storage\\.com/",
    "Vercel Blob object",
  ],
  ["Tealium", "Tag manager", "tealium", "tags\\.tiqcdn\\.com/", "Tealium tag"],
  [
    "Meta Pixel",
    "Advertising",
    "metaPixel",
    "connect\\.facebook\\.net/[^\"']*fbevents",
    "Meta Pixel script",
  ],
  [
    "LinkedIn Insight Tag",
    "Advertising",
    "linkedinInsight",
    "snap\\.licdn\\.com/",
    "LinkedIn Insight script",
  ],
  [
    "TikTok Pixel",
    "Advertising",
    "tiktokPixel",
    "analytics\\.tiktok\\.com/",
    "TikTok Pixel script",
  ],
  [
    "Google Ads",
    "Advertising",
    "",
    "(?:ad\\.doubleclick\\.net|googleadservices\\.com)/",
    "Google ads request",
  ],
  [
    "Microsoft Clarity",
    "Analytics",
    "clarity",
    "clarity\\.ms/",
    "Clarity script",
  ],
  [
    "HubSpot",
    "Marketing",
    "hubspot",
    "(?:js\\.hs-scripts\\.com|js\\.hsforms\\.net|js\\.hs-analytics\\.net)/",
    "HubSpot script",
  ],
  [
    "OneTrust",
    "Consent",
    "onetrust",
    "cdn\\.cookielaw\\.org/",
    "OneTrust consent script",
  ],
  [
    "Cookiebot",
    "Consent",
    "cookiebot",
    "consent\\.cookiebot\\.com/",
    "Cookiebot consent script",
  ],
  [
    "Zendesk",
    "Support",
    "zendesk",
    "static\\.zdassets\\.com/",
    "Zendesk widget",
  ],
  ["Wistia", "Video", "", "fast\\.wistia\\.(?:com|net)/", "Wistia player"],
  [
    "YouTube",
    "Video",
    "",
    "youtube(?:-nocookie)?\\.com/(?:iframe_api|embed/)",
    "YouTube embed",
  ],
  ["Vimeo", "Video", "", "player\\.vimeo\\.com/", "Vimeo player"],
  [
    "Algolia",
    "Search",
    "",
    "(?:algolia\\.net|algolianet\\.com)/",
    "Algolia search request",
  ],
  ["Mapbox", "Maps", "", "api\\.mapbox\\.com/", "Mapbox request"],
  ["hCaptcha", "Security", "hcaptcha", "hcaptcha\\.com/", "hCaptcha script"],
  [
    "Cloudflare Turnstile",
    "Security",
    "turnstile",
    "challenges\\.cloudflare\\.com/turnstile/",
    "Turnstile script",
  ],
].map(([name, type, runtime, host, label]) => ({
  name,
  type,
  signals: [
    ...(runtime ? [{ runtime, label: `${name} runtime global` }] : []),
    { html: asset(host), label },
  ],
}));
const ALL_RULES = [...RULES, ...RUNTIME_RULES, ...SERVICE_RULES];

const INFERRED_TYPES: Readonly<Record<string, string>> = {
  React: "UI library",
  Vue: "UI library",
  Svelte: "UI library",
};

function excerpt(text: string) {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > 120 ? `${compact.slice(0, 117)}…` : compact;
}

function technology(rule: Rule, version: string, evidence: string): Technology {
  return {
    name: rule.name,
    version,
    type: rule.type,
    evidence,
    basis: "Observed",
  };
}

function matchHtml(rule: Rule, html: string, where: string) {
  for (const signal of rule.signals) {
    if (!("html" in signal)) continue;
    const found = html.match(signal.html);
    if (found)
      return technology(
        rule,
        found[1] ?? "",
        `${signal.label} in ${where}: ${excerpt(found[0])}`,
      );
  }
  return null;
}

/** Strongest evidence first: headers, the HTML response, then browser signals. */
function match(
  rule: Rule,
  { headers, html, rendered }: DocumentSignals,
  requested: string,
): Technology | null {
  for (const signal of rule.signals) {
    if (!("header" in signal)) continue;
    const value = headers[signal.header];
    if (value === undefined) continue;
    const found = signal.pattern ? value.match(signal.pattern) : [value];
    if (found)
      return technology(
        rule,
        signal.pattern ? (found[1] ?? "") : "",
        `Response header ${signal.header}: ${excerpt(value)}`,
      );
  }
  const inDocument = matchHtml(rule, html, "the HTML document");
  if (inDocument || !rendered) return inDocument;
  const inDom = matchHtml(rule, rendered.html, "the rendered DOM");
  if (inDom) return inDom;
  for (const signal of rule.signals) {
    if (!("runtime" in signal)) continue;
    const value = rendered.runtime[signal.runtime];
    if (value)
      return technology(
        rule,
        value === "present" ? "" : value,
        `${signal.label} after scripts ran${value === "present" ? "" : `: ${value}`}`,
      );
  }
  return matchHtml(rule, requested, "a network request");
}

/**
 * Identify technologies from one HTTP response and, when available, what a
 * browser observed after running the page's scripts.
 */
export function detectTechnologies(document: DocumentSignals): Technology[] {
  // Requested URLs are matched like asset attributes.
  const requested = (document.rendered?.requests ?? [])
    .map((url) => `src="${url}"`)
    .join("\n");
  const found = ALL_RULES.flatMap(
    (rule) => match(rule, document, requested) ?? [],
  );
  const names = new Set(found.map(({ name }) => name));
  const inferred: Technology[] = [];
  for (const technology of found)
    for (const base of ALL_RULES.find(({ name }) => name === technology.name)
      ?.implies ?? []) {
      if (names.has(base)) continue;
      names.add(base);
      inferred.push({
        name: base,
        version: "",
        type: INFERRED_TYPES[base] ?? "Library",
        evidence: `Inferred because ${technology.name} is built on ${base}; no direct ${base} signal was found.`,
        basis: "Inferred",
      });
    }
  return [...found, ...inferred];
}
