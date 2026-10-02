import type { Localized } from "@/shared/lib/i18n";
import type { FetchFailure } from "@/shared/lib/public-http/index.server";
import type { RenderFailure } from "@/shared/lib/rendered-page/index.server";

/** Server-written report and error text. English keeps the lower layers' detailed messages. */
export interface ScanMessages {
  invalidUrl: string;
  notHtml: (type: string) => string;
  cancelled: string;
  /** Null keeps the fetch error's own message. */
  fetchFailure: ((code: FetchFailure, detail: string) => string) | null;
  browserOff: string;
  browserFailed: string;
  /** Null keeps the render error's own message. */
  renderFailure: ((code: RenderFailure) => string) | null;
  browserUnavailable: (issue: string) => string;
  browserRan: string;
  status: (status: number) => string;
  truncated: (kilobytes: number) => string;
  cookies: (count: number) => string;
}

export const SCAN_MESSAGES: Localized<ScanMessages> = {
  en: {
    invalidUrl: "Enter a valid website URL, such as example.com.",
    notHtml: (type) => `The URL returned ${type}, not an HTML document.`,
    cancelled: "The scan was cancelled.",
    fetchFailure: null,
    browserOff: "It is turned off on this server.",
    browserFailed: "The page could not be loaded in the browser.",
    renderFailure: null,
    browserUnavailable: (issue) =>
      `Browser stage unavailable: ${issue} Results come from the HTML response only; scripts were not executed, so client-rendered technologies and browser metrics are not included.`,
    browserRan:
      "The autopsy server fetched the HTML response and loaded the page in headless Chromium with scripts running. Timings are lab values from that server (desktop viewport, no throttling); interaction latency is not measured. Security, accessibility, and SEO checks read the HTML response.",
    status: (status) =>
      `The site answered with HTTP ${status}; results describe that response, which may be an error or bot-protection page rather than the site itself.`,
    truncated: (kilobytes) =>
      `Only the first ${kilobytes} kB of the HTML document were inspected.`,
    cookies: (count) => `${count} cookie(s); values omitted`,
  },
  ko: {
    invalidUrl: "example.com 같은 올바른 웹사이트 URL을 입력하세요.",
    notHtml: (type) => `URL이 HTML 문서가 아니라 ${type} 형식을 반환했습니다.`,
    cancelled: "스캔이 취소되었습니다.",
    fetchFailure: (code, detail) => {
      switch (code) {
        case "invalid-url":
          return "URL이 올바르지 않거나 지원하지 않는 형식입니다. 인증 정보가 없는 HTTP·HTTPS URL만 스캔합니다.";
        case "blocked":
          return "공개 인터넷 주소의 80, 443 포트만 스캔합니다. 이 주소나 리디렉션 대상은 허용되지 않습니다.";
        case "dns":
          return "호스트 이름을 확인할 수 없습니다.";
        case "connection":
          return `웹사이트에 연결할 수 없습니다${detail ? ` (${detail})` : ""}.`;
        case "timeout":
          return "웹사이트가 제한 시간 안에 응답하지 않았습니다.";
        case "redirects":
          return "웹사이트가 리디렉션을 너무 많이 반복했습니다.";
        case "aborted":
          return "스캔이 취소되었습니다.";
      }
    },
    browserOff: "이 서버에서는 꺼져 있습니다.",
    browserFailed: "브라우저에서 페이지를 불러오지 못했습니다.",
    renderFailure: (code) => {
      switch (code) {
        case "unavailable":
          return "스캔용 브라우저를 시작하지 못했습니다.";
        case "blocked":
          return "페이지 주소가 공개 인터넷 주소가 아닙니다.";
        case "timeout":
          return "페이지가 제한 시간 안에 로드되지 않았습니다.";
        case "navigation":
          return "브라우저에서 페이지를 불러오지 못했습니다.";
        case "aborted":
          return "스캔이 취소되었습니다.";
      }
    },
    browserUnavailable: (issue) =>
      `브라우저 단계를 실행하지 못했습니다: ${issue} 결과는 HTML 응답만으로 만들었습니다. 스크립트를 실행하지 않았으므로 클라이언트에서 렌더링되는 기술과 브라우저 지표는 포함되지 않습니다.`,
    browserRan:
      "autopsy 서버가 HTML 응답을 가져오고 headless Chromium에서 스크립트를 실행한 상태로 페이지를 불러왔습니다. 타이밍은 그 서버에서 잰 lab 값이며(데스크톱 viewport, throttling 없음) 상호작용 지연은 측정하지 않습니다. 보안, 접근성, SEO 점검은 HTML 응답을 읽습니다.",
    status: (status) =>
      `사이트가 HTTP ${status}로 응답했습니다. 결과는 그 응답을 설명하며, 사이트 자체가 아니라 오류 페이지나 봇 차단 페이지일 수 있습니다.`,
    truncated: (kilobytes) =>
      `HTML 문서의 처음 ${kilobytes} kB만 검사했습니다.`,
    cookies: (count) => `쿠키 ${count}개, 값 생략`,
  },
};
