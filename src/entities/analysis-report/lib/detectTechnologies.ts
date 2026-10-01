import type { Technology } from "../model/types";

export interface DocumentSignals {
  /** Lower-cased response header names. */
  headers: Readonly<Record<string, string>>;
  html: string;
}

type Signal =
  { header: string; pattern?: RegExp } | { html: RegExp; label: string };

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
      { html: /\sng-version=["']([\d.]+)["']/i, label: "ng-version attribute" },
    ],
  },
  {
    name: "Vue",
    type: "UI library",
    signals: [
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
    signals: [{ html: /googletagmanager\.com\/gtm\.js/i, label: "GTM loader" }],
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
      { html: /cdn\.segment\.com\/analytics\.js/i, label: "Segment loader" },
    ],
  },
  {
    name: "Hotjar",
    type: "Analytics",
    signals: [{ html: /static\.hotjar\.com\//i, label: "Hotjar loader" }],
  },
  {
    name: "Sentry",
    type: "Monitoring",
    signals: [
      {
        html: asset("(?:browser|js)\\.sentry-cdn\\.com/([\\d.]+)?"),
        label: "Sentry CDN script",
      },
    ],
  },
  {
    name: "Datadog RUM",
    type: "Monitoring",
    signals: [
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
    signals: [{ html: asset("js\\.stripe\\.com/"), label: "Stripe.js script" }],
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
    signals: [{ html: /widget\.intercom\.io\//i, label: "Intercom widget" }],
  },
];

const INFERRED_TYPES: Readonly<Record<string, string>> = {
  React: "UI library",
  Vue: "UI library",
  Svelte: "UI library",
};

function excerpt(text: string) {
  const compact = text.replace(/\s+/g, " ").trim();
  return compact.length > 120 ? `${compact.slice(0, 117)}…` : compact;
}

function match(
  rule: Rule,
  { headers, html }: DocumentSignals,
): Technology | null {
  for (const signal of rule.signals) {
    if ("header" in signal) {
      const value = headers[signal.header];
      if (value === undefined) continue;
      const found = signal.pattern ? value.match(signal.pattern) : [value];
      if (!found) continue;
      return {
        name: rule.name,
        version: signal.pattern ? (found[1] ?? "") : "",
        type: rule.type,
        evidence: `Response header ${signal.header}: ${excerpt(value)}`,
        basis: "Observed",
      };
    }
    const found = html.match(signal.html);
    if (found)
      return {
        name: rule.name,
        version: found[1] ?? "",
        type: rule.type,
        evidence: `${signal.label} in the HTML document: ${excerpt(found[0])}`,
        basis: "Observed",
      };
  }
  return null;
}

/**
 * Identify technologies from one HTTP response. Only the document and its
 * headers are inspected; scripts are not executed, so technologies that only
 * appear after client-side rendering are not detected.
 */
export function detectTechnologies(document: DocumentSignals): Technology[] {
  const found = RULES.flatMap((rule) => match(rule, document) ?? []);
  const names = new Set(found.map(({ name }) => name));
  const inferred: Technology[] = [];
  for (const technology of found)
    for (const base of RULES.find(({ name }) => name === technology.name)
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
