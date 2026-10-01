/** Runtime signal name → version, or "present" when no version is exposed. */
export type RuntimeSignals = Record<string, string>;

/**
 * Evaluated inside the scanned page after its scripts ran. It must stay
 * self-contained: the browser receives only this function's source.
 */
export function runtimeProbe(): RuntimeSignals {
  const found: RuntimeSignals = {};
  const scope = window as unknown as Record<string, unknown>;
  const read = (value: unknown, ...path: string[]): unknown =>
    path.reduce<unknown>(
      (current, key) =>
        current !== null &&
        (typeof current === "object" || typeof current === "function")
          ? (current as Record<string, unknown>)[key]
          : undefined,
      value,
    );
  const note = (name: string, present: unknown, version?: unknown) => {
    if (!present) return;
    found[name] =
      typeof version === "string" && /^\d+(\.\d+)*/.test(version)
        ? version
        : "present";
  };
  const elements = Array.from(document.querySelectorAll("*")).slice(0, 3000);
  const keyed = (prefix: string) =>
    elements.some((element) =>
      Object.keys(element).some((key) => key.startsWith(prefix)),
    );
  const vueApp = elements
    .map((element) => read(element, "__vue_app__"))
    .find(Boolean);
  const svelte = read(scope, "__svelte", "v");

  const next = scope.next;
  note(
    "next",
    typeof read(next, "version") === "string" &&
      (read(next, "router") || read(next, "appDir") !== undefined),
    read(next, "version"),
  );
  note(
    "react",
    keyed("__reactFiber") ||
      keyed("__reactContainer") ||
      keyed("_reactRootContainer"),
    read(scope, "React", "version"),
  );
  note(
    "vue",
    vueApp || scope.__VUE__ || read(scope, "Vue", "version"),
    read(vueApp, "version") ?? read(scope, "Vue", "version"),
  );
  note("nuxt", scope.__NUXT__ || scope.useNuxtApp || scope.$nuxt);
  note(
    "angular",
    document.querySelector("[ng-version]") || read(scope, "ng", "getComponent"),
    document.querySelector("[ng-version]")?.getAttribute("ng-version"),
  );
  note(
    "svelte",
    svelte,
    svelte instanceof Set ? Array.from(svelte)[0] : undefined,
  );
  note("solid", scope._$HY);
  note(
    "lit",
    scope.litElementVersions || scope.litHtmlVersions,
    read(scope, "litElementVersions", "0") ??
      read(scope, "litHtmlVersions", "0"),
  );
  note("alpine", scope.Alpine, read(scope, "Alpine", "version"));
  note("htmx", scope.htmx, read(scope, "htmx", "version"));
  note(
    "jquery",
    read(scope, "jQuery", "fn", "jquery"),
    read(scope, "jQuery", "fn", "jquery"),
  );
  note("ember", scope.Ember, read(scope, "Ember", "VERSION"));
  note("turbo", read(scope, "Turbo", "session"));
  note("sentry", scope.__SENTRY__, read(scope, "__SENTRY__", "version"));
  note("gtm", scope.google_tag_manager);
  note(
    "datadog",
    read(scope, "DD_RUM", "init"),
    read(scope, "DD_RUM", "version"),
  );
  note("newrelic", scope.NREUM);
  note("posthog", read(scope, "posthog", "capture"));
  note("mixpanel", read(scope, "mixpanel", "track"));
  note(
    "segment",
    read(scope, "analytics", "VERSION"),
    read(scope, "analytics", "VERSION"),
  );
  note("amplitude", scope.amplitude);
  note("intercom", typeof scope.Intercom === "function");
  note(
    "stripe",
    typeof scope.Stripe === "function",
    read(scope, "Stripe", "version"),
  );
  note("hotjar", typeof scope.hj === "function");
  note(
    "reactRouter",
    scope.__reactRouterVersion || scope.__reactRouterContext,
    scope.__reactRouterVersion,
  );
  note("tanstackQuery", scope.__TANSTACK_QUERY_CLIENT__);
  note("zod", scope.__zod_globalConfig || scope.__zod_globalRegistry);
  note("three", scope.__THREE__, scope.__THREE__);
  note(
    "gsap",
    scope.gsapVersions || scope.gsap,
    read(scope, "gsapVersions", "0"),
  );
  note(
    "turbopack",
    Object.keys(scope).some((key) => key.startsWith("TURBOPACK")),
  );
  note("apollo", scope.__APOLLO_CLIENT__);
  note("prism", read(scope, "Prism", "highlightAll"));
  note("d3", read(scope, "d3", "select"), read(scope, "d3", "version"));
  note(
    "chartjs",
    read(scope, "Chart", "register"),
    read(scope, "Chart", "version"),
  );
  note("leaflet", read(scope, "L", "map"), read(scope, "L", "version"));
  note(
    "moment",
    read(scope, "moment", "isMoment"),
    read(scope, "moment", "version"),
  );
  note(
    "firebase",
    read(scope, "firebase", "SDK_VERSION"),
    read(scope, "firebase", "SDK_VERSION"),
  );
  note(
    "lottie",
    read(scope, "lottie", "loadAnimation") ||
      read(scope, "bodymovin", "loadAnimation"),
  );
  note("swiper", typeof scope.Swiper === "function");
  note("tealium", read(scope, "utag", "link"));
  note("metaPixel", typeof scope.fbq === "function" || scope._fbq);
  note("linkedinInsight", typeof scope.lintrk === "function");
  note("tiktokPixel", read(scope, "ttq", "track"));
  note("clarity", typeof scope.clarity === "function");
  note("hubspot", scope._hsq);
  note("onetrust", scope.OneTrust);
  note("cookiebot", scope.Cookiebot);
  note("zendesk", typeof scope.zE === "function");
  note("crisp", scope.$crisp);
  note("hcaptcha", read(scope, "hcaptcha", "render"));
  note("turnstile", read(scope, "turnstile", "render"));
  return found;
}
