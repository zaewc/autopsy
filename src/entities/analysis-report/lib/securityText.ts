import type { Localized } from "@/shared/lib/i18n";

/** Issue text for analyzeSecurity; ids, categories, and severities live there. */
const en = {
  unknownCipher: "an unknown cipher",
  unknownIssuer: "an unknown issuer",
  http: {
    title: "Page is served without HTTPS",
    evidence: (url: string) => `Final URL: ${url}`,
    impact:
      "Anyone on the network path can read or modify the page and its cookies.",
    fix: "Serve the site over HTTPS and redirect HTTP requests to it.",
  },
  oldTls: {
    title: (protocol: string) => `Outdated protocol ${protocol} was negotiated`,
    evidence: (protocol: string, cipher: string) =>
      `Negotiated ${protocol} with ${cipher}.`,
    impact: "TLS 1.0 and 1.1 are deprecated and lack modern protections.",
    fix: "Disable TLS 1.0 and 1.1; offer TLS 1.2 and 1.3 only.",
  },
  expiry: {
    title: (days: number) =>
      `Certificate expires in ${days} day${days === 1 ? "" : "s"}`,
    evidence: (validTo: string, issuer: string) =>
      `Valid until ${validTo}, issued by ${issuer}.`,
    impact: "An expired certificate makes browsers block the site.",
    fix: "Confirm automatic renewal is working, or renew the certificate now.",
  },
  hstsMissing: {
    title: "HSTS is not configured",
    evidence: "No Strict-Transport-Security header in the response.",
    impact:
      "A first visit or a typed http:// address can be intercepted before the redirect to HTTPS.",
    fix: "Send Strict-Transport-Security with max-age of at least one year once every subdomain you include supports HTTPS.",
  },
  hstsShort: {
    title: "HSTS max-age is shorter than 180 days",
    impact: "A short max-age lets the HTTPS-only policy lapse between visits.",
    fix: "Use max-age=31536000 (one year) or longer.",
  },
  hstsSubdomains: {
    title: "HSTS does not cover subdomains",
    impact:
      "Subdomains can still be reached over HTTP and can set cookies for the parent domain.",
    fix: "Add includeSubDomains after confirming every subdomain serves HTTPS.",
  },
  cspImpact:
    "Without an enforced policy, injected markup can load and run any script.",
  cspReportOnly: {
    title: "Content Security Policy is report-only",
    fix: "Review the reports, then send the policy as Content-Security-Policy.",
  },
  cspMissing: {
    title: "Content Security Policy is not set",
    evidence: "No Content-Security-Policy header in the response.",
    fix: "Start with a report-only policy that restricts script sources, then enforce it.",
  },
  cspNoScript: {
    title: "Policy does not restrict scripts",
    evidence: "Neither script-src nor default-src is set.",
    impact: "Scripts can load from any origin despite the policy.",
    fix: "Add script-src with nonces or hashes, or at least explicit trusted origins.",
  },
  unsafeInline: {
    title: (label: string) => `${label} allows 'unsafe-inline'`,
    impact:
      "Inline script injection is not blocked, which removes most of the XSS protection a policy provides.",
    fix: "Use nonces or hashes for inline scripts and remove 'unsafe-inline'.",
  },
  unsafeEval: {
    title: (label: string) => `${label} allows 'unsafe-eval'`,
    impact: "eval-style string execution stays available to injected code.",
    fix: "Remove 'unsafe-eval' and replace code that needs it.",
  },
  broad: {
    title: (label: string) => `${label} allows broad sources`,
    evidence: (label: string, sources: string) =>
      `${label} includes ${sources}`,
    impact:
      "Scripts can be loaded from almost any host, which an attacker can satisfy.",
    fix: "List specific origins, or use nonces with 'strict-dynamic'.",
  },
  objectSrc: {
    title: "Plugins are not disabled",
    unset: "object-src is not set.",
    impact: "Plugin content can bypass script restrictions in older browsers.",
    fix: "Add object-src 'none'.",
  },
  baseUri: {
    title: "base-uri is not restricted",
    evidence: "base-uri is not set (it does not fall back to default-src).",
    impact:
      "Injected <base> tags can redirect relative script URLs to another host.",
    fix: "Add base-uri 'self' or 'none'.",
  },
  framing: {
    title: "Page can be framed by any site",
    evidence: "Neither CSP frame-ancestors nor X-Frame-Options is set.",
    impact:
      "Other sites can embed the page invisibly and trick users into clicking it (clickjacking).",
    fix: "Set frame-ancestors 'self' (or the origins allowed to embed the page).",
  },
  nosniff: {
    title: "MIME type sniffing is not disabled",
    missing: "No X-Content-Type-Options header.",
    impact: "Browsers may execute responses as a different type than declared.",
    fix: "Send X-Content-Type-Options: nosniff.",
  },
  referrerLeaky: {
    title: "Referrer policy sends full URLs to other sites",
    impact:
      "Paths and query strings, which may contain identifiers, leak to third parties.",
    fix: "Use strict-origin-when-cross-origin or stricter.",
  },
  referrerMissing: {
    title: "Referrer-Policy is not set",
    evidence: "No Referrer-Policy header; the browser default applies.",
    impact:
      "Modern browsers default to strict-origin-when-cross-origin, but older ones may send full URLs.",
    fix: "Send Referrer-Policy: strict-origin-when-cross-origin explicitly.",
  },
  permissions: {
    title: "Permissions-Policy is not set",
    evidence: "No Permissions-Policy header.",
    impact:
      "Embedded or injected content can request powerful features such as camera or geolocation.",
    fix: "Disable features the site does not use, for example camera=(), microphone=(), geolocation=().",
  },
  coop: {
    title: "Cross-Origin-Opener-Policy is not set",
    evidence: "No Cross-Origin-Opener-Policy header.",
    impact:
      "Pages opened from other origins keep a reference to this window, which enables some cross-site leaks.",
    fix: "Send Cross-Origin-Opener-Policy: same-origin unless the site relies on cross-origin popups.",
  },
  xss: {
    title: "Deprecated XSS filter is enabled",
    impact:
      "The legacy filter has been removed from modern browsers and could introduce issues in old ones.",
    fix: "Remove the header or set it to 0, and rely on Content-Security-Policy.",
  },
  corsCredentials: {
    title: "CORS allows any origin with credentials",
    evidence:
      "Access-Control-Allow-Origin: * with Access-Control-Allow-Credentials: true",
    impact:
      "This combination signals an intent to share credentialed responses with any site; browsers reject it, but it often hides a reflective configuration elsewhere.",
    fix: "Allow only specific trusted origins when credentials are required.",
  },
  corsWildcard: {
    title: "Page is readable by any origin",
    impact:
      "Any website can read this response with a script. This is only a problem if it contains non-public data.",
    fix: "Remove the header from HTML pages, or restrict it to trusted origins.",
  },
  disclosure: {
    title: (name: string, version: boolean) =>
      `${name} reveals software${version ? " and version" : ""}`,
    impact:
      "Version details help attackers match the server to known vulnerabilities.",
    fix: (name: string) => `Remove ${name} or strip the version from it.`,
  },
  cookie: {
    label: (name: string) => `Cookie ${name}`,
    noAttributes: "no security attributes",
    secure: {
      title: (label: string) => `${label} is sent over plain HTTP`,
      impact:
        "Without Secure, the cookie is also sent on any HTTP request to the domain, where it can be intercepted.",
      fix: "Add the Secure attribute.",
    },
    sameSiteNone: {
      title: (label: string) => `${label} uses SameSite=None without Secure`,
      impact:
        "Browsers reject this combination, so the cookie may not be set at all.",
      fix: "Add Secure, or use SameSite=Lax.",
    },
    sameSite: {
      title: (label: string) => `${label} has no SameSite attribute`,
      impact:
        "Browsers apply different defaults; older ones send it on cross-site requests, which enables CSRF.",
      fix: "Set SameSite=Lax (or Strict) explicitly.",
    },
    httpOnly: {
      title: (label: string) => `${label} is readable by scripts`,
      impact:
        "If this cookie identifies a session, injected scripts could read it.",
      fix: "Add HttpOnly unless page scripts need the value.",
    },
    hostPrefix: {
      title: (label: string) => `${label} breaks the __Host- prefix rules`,
      impact:
        "Browsers reject __Host- cookies unless they are Secure, host-only, and Path=/.",
      fix: "Set Secure and Path=/ and remove Domain.",
    },
  },
};

export type SecurityText = typeof en;

export const SECURITY_TEXT: Localized<SecurityText> = {
  en,
  ko: {
    unknownCipher: "알 수 없는 cipher",
    unknownIssuer: "알 수 없는 발급자",
    http: {
      title: "페이지가 HTTPS 없이 제공됩니다",
      evidence: (url) => `최종 URL: ${url}`,
      impact:
        "네트워크 경로에 있는 누구나 페이지와 쿠키를 읽거나 변조할 수 있습니다.",
      fix: "사이트를 HTTPS로 제공하고 HTTP 요청을 HTTPS로 리디렉션하세요.",
    },
    oldTls: {
      title: (protocol) => `오래된 프로토콜 ${protocol}로 협상했습니다`,
      evidence: (protocol, cipher) => `${protocol}, ${cipher}로 협상했습니다.`,
      impact: "TLS 1.0과 1.1은 폐기되었으며 최신 보호 기능이 없습니다.",
      fix: "TLS 1.0과 1.1을 끄고 TLS 1.2와 1.3만 제공하세요.",
    },
    expiry: {
      title: (days) => `인증서가 ${days}일 후 만료됩니다`,
      evidence: (validTo, issuer) => `${validTo}까지 유효, 발급자 ${issuer}.`,
      impact: "인증서가 만료되면 브라우저가 사이트를 차단합니다.",
      fix: "자동 갱신이 동작하는지 확인하거나 지금 인증서를 갱신하세요.",
    },
    hstsMissing: {
      title: "HSTS가 설정되지 않았습니다",
      evidence: "응답에 Strict-Transport-Security 헤더가 없습니다.",
      impact:
        "첫 방문이나 직접 입력한 http:// 주소는 HTTPS로 리디렉션되기 전에 가로채일 수 있습니다.",
      fix: "포함하는 모든 서브도메인이 HTTPS를 지원하면 max-age가 1년 이상인 Strict-Transport-Security를 보내세요.",
    },
    hstsShort: {
      title: "HSTS max-age가 180일보다 짧습니다",
      impact:
        "max-age가 짧으면 방문 사이에 HTTPS 전용 정책이 만료될 수 있습니다.",
      fix: "max-age=31536000(1년) 이상을 사용하세요.",
    },
    hstsSubdomains: {
      title: "HSTS가 서브도메인을 포함하지 않습니다",
      impact:
        "서브도메인은 여전히 HTTP로 접근할 수 있고 상위 도메인의 쿠키를 설정할 수 있습니다.",
      fix: "모든 서브도메인이 HTTPS를 제공하는지 확인한 뒤 includeSubDomains를 추가하세요.",
    },
    cspImpact:
      "적용된 정책이 없으면 주입된 마크업이 어떤 스크립트든 불러와 실행할 수 있습니다.",
    cspReportOnly: {
      title: "Content Security Policy가 report-only입니다",
      fix: "보고 내용을 검토한 뒤 정책을 Content-Security-Policy로 보내세요.",
    },
    cspMissing: {
      title: "Content Security Policy가 설정되지 않았습니다",
      evidence: "응답에 Content-Security-Policy 헤더가 없습니다.",
      fix: "스크립트 source를 제한하는 report-only 정책으로 시작한 뒤 적용하세요.",
    },
    cspNoScript: {
      title: "정책이 스크립트를 제한하지 않습니다",
      evidence: "script-src와 default-src 모두 설정되지 않았습니다.",
      impact: "정책이 있어도 스크립트를 어떤 origin에서든 불러올 수 있습니다.",
      fix: "nonce나 hash를 쓰는 script-src를 추가하거나, 최소한 신뢰하는 origin을 명시하세요.",
    },
    unsafeInline: {
      title: (label) => `${label}가 'unsafe-inline'을 허용합니다`,
      impact:
        "인라인 스크립트 주입을 막지 못해 정책이 주는 XSS 보호 대부분이 사라집니다.",
      fix: "인라인 스크립트에 nonce나 hash를 쓰고 'unsafe-inline'을 제거하세요.",
    },
    unsafeEval: {
      title: (label) => `${label}가 'unsafe-eval'을 허용합니다`,
      impact:
        "주입된 코드가 eval 방식의 문자열 실행을 계속 사용할 수 있습니다.",
      fix: "'unsafe-eval'을 제거하고 이를 필요로 하는 코드를 바꾸세요.",
    },
    broad: {
      title: (label) => `${label}가 광범위한 source를 허용합니다`,
      evidence: (label, sources) => `${label}에 ${sources} 포함`,
      impact:
        "거의 모든 호스트에서 스크립트를 불러올 수 있어 공격자도 조건을 충족할 수 있습니다.",
      fix: "구체적인 origin을 나열하거나 'strict-dynamic'과 nonce를 사용하세요.",
    },
    objectSrc: {
      title: "플러그인이 비활성화되지 않았습니다",
      unset: "object-src가 설정되지 않았습니다.",
      impact:
        "오래된 브라우저에서는 플러그인 콘텐츠가 스크립트 제한을 우회할 수 있습니다.",
      fix: "object-src 'none'을 추가하세요.",
    },
    baseUri: {
      title: "base-uri가 제한되지 않았습니다",
      evidence: "base-uri가 설정되지 않았습니다(default-src로 대체되지 않음).",
      impact:
        "주입된 <base> 태그가 상대 스크립트 URL을 다른 호스트로 돌릴 수 있습니다.",
      fix: "base-uri 'self' 또는 'none'을 추가하세요.",
    },
    framing: {
      title: "어떤 사이트든 페이지를 frame에 넣을 수 있습니다",
      evidence:
        "CSP frame-ancestors와 X-Frame-Options 모두 설정되지 않았습니다.",
      impact:
        "다른 사이트가 페이지를 보이지 않게 삽입해 사용자가 클릭하도록 속일 수 있습니다(clickjacking).",
      fix: "frame-ancestors 'self'(또는 삽입을 허용할 origin)를 설정하세요.",
    },
    nosniff: {
      title: "MIME type sniffing이 비활성화되지 않았습니다",
      missing: "X-Content-Type-Options 헤더가 없습니다.",
      impact: "브라우저가 응답을 선언과 다른 형식으로 실행할 수 있습니다.",
      fix: "X-Content-Type-Options: nosniff를 보내세요.",
    },
    referrerLeaky: {
      title: "Referrer policy가 다른 사이트에 전체 URL을 보냅니다",
      impact:
        "식별자가 들어 있을 수 있는 경로와 query string이 제3자에게 노출됩니다.",
      fix: "strict-origin-when-cross-origin 이상으로 엄격한 정책을 사용하세요.",
    },
    referrerMissing: {
      title: "Referrer-Policy가 설정되지 않았습니다",
      evidence: "Referrer-Policy 헤더가 없어 브라우저 기본값이 적용됩니다.",
      impact:
        "최신 브라우저의 기본값은 strict-origin-when-cross-origin이지만 오래된 브라우저는 전체 URL을 보낼 수 있습니다.",
      fix: "Referrer-Policy: strict-origin-when-cross-origin을 명시적으로 보내세요.",
    },
    permissions: {
      title: "Permissions-Policy가 설정되지 않았습니다",
      evidence: "Permissions-Policy 헤더가 없습니다.",
      impact:
        "삽입되거나 주입된 콘텐츠가 카메라나 위치 정보 같은 강력한 기능을 요청할 수 있습니다.",
      fix: "사이트가 쓰지 않는 기능을 끄세요. 예: camera=(), microphone=(), geolocation=().",
    },
    coop: {
      title: "Cross-Origin-Opener-Policy가 설정되지 않았습니다",
      evidence: "Cross-Origin-Opener-Policy 헤더가 없습니다.",
      impact:
        "다른 origin에서 연 페이지가 이 창의 참조를 유지해 일부 cross-site 정보 유출이 가능해집니다.",
      fix: "사이트가 cross-origin 팝업에 의존하지 않는다면 Cross-Origin-Opener-Policy: same-origin을 보내세요.",
    },
    xss: {
      title: "폐기된 XSS 필터가 켜져 있습니다",
      impact:
        "이 레거시 필터는 최신 브라우저에서 제거되었고 오래된 브라우저에서는 문제를 일으킬 수 있습니다.",
      fix: "헤더를 제거하거나 0으로 설정하고 Content-Security-Policy를 사용하세요.",
    },
    corsCredentials: {
      title: "CORS가 credentials와 함께 모든 origin을 허용합니다",
      evidence:
        "Access-Control-Allow-Origin: *와 Access-Control-Allow-Credentials: true",
      impact:
        "이 조합은 인증된 응답을 모든 사이트와 공유하려는 의도를 나타냅니다. 브라우저는 거부하지만, 다른 곳에 요청 origin을 그대로 반영하는 설정이 숨어 있는 경우가 많습니다.",
      fix: "credentials가 필요하다면 신뢰하는 특정 origin만 허용하세요.",
    },
    corsWildcard: {
      title: "모든 origin이 페이지를 읽을 수 있습니다",
      impact:
        "어떤 웹사이트든 스크립트로 이 응답을 읽을 수 있습니다. 비공개 데이터가 들어 있을 때만 문제가 됩니다.",
      fix: "HTML 페이지에서 헤더를 제거하거나 신뢰하는 origin으로 제한하세요.",
    },
    disclosure: {
      title: (name, version) =>
        `${name}가 소프트웨어${version ? "와 버전" : ""}을 드러냅니다`,
      impact:
        "버전 정보는 공격자가 서버를 알려진 취약점과 연결하는 데 도움이 됩니다.",
      fix: (name) => `${name}를 제거하거나 버전을 지우세요.`,
    },
    cookie: {
      label: (name) => `쿠키 ${name}`,
      noAttributes: "보안 속성 없음",
      secure: {
        title: (label) => `${label}가 일반 HTTP로도 전송됩니다`,
        impact:
          "Secure가 없으면 도메인에 대한 모든 HTTP 요청에도 쿠키가 전송되어 가로채일 수 있습니다.",
        fix: "Secure 속성을 추가하세요.",
      },
      sameSiteNone: {
        title: (label) => `${label}가 Secure 없이 SameSite=None을 사용합니다`,
        impact:
          "브라우저가 이 조합을 거부하므로 쿠키가 아예 설정되지 않을 수 있습니다.",
        fix: "Secure를 추가하거나 SameSite=Lax를 사용하세요.",
      },
      sameSite: {
        title: (label) => `${label}에 SameSite 속성이 없습니다`,
        impact:
          "브라우저마다 기본값이 다르고, 오래된 브라우저는 cross-site 요청에도 보내 CSRF가 가능해집니다.",
        fix: "SameSite=Lax(또는 Strict)를 명시적으로 설정하세요.",
      },
      httpOnly: {
        title: (label) => `${label}를 스크립트가 읽을 수 있습니다`,
        impact:
          "이 쿠키가 세션을 식별한다면 주입된 스크립트가 읽을 수 있습니다.",
        fix: "페이지 스크립트가 값을 써야 하는 경우가 아니라면 HttpOnly를 추가하세요.",
      },
      hostPrefix: {
        title: (label) => `${label}가 __Host- prefix 규칙을 어깁니다`,
        impact:
          "브라우저는 Secure, host-only, Path=/를 모두 갖춘 경우에만 __Host- 쿠키를 받아들입니다.",
        fix: "Secure와 Path=/를 설정하고 Domain을 제거하세요.",
      },
    },
  },
};
