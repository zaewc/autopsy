"use client";
import { useState, type FormEvent } from "react";
import { ArrowRight, ArrowUpRight, Globe } from "lucide-react";
import { useMessages, type Localized } from "@/shared/lib/i18n";
import { normalizeHttpUrl } from "@/shared/lib/web-url";
import "./analysisForm.css";
const EXAMPLES = ["github.com", "nextjs.org", "wordpress.org"];
const MESSAGES: Localized<{
  eyebrow: string;
  title: readonly [string, string];
  intro: string;
  url: string;
  submit: string;
  invalid: string;
  examples: string;
}> = {
  en: {
    eyebrow: "New analysis",
    title: ["Put the web under", "a microscope."],
    intro:
      "Enter a public website URL. autopsy fetches its HTML document, loads the page in a headless browser with scripts running, and reports the technologies, timings, requests, and basic checks it can observe.",
    url: "Website URL",
    submit: "Analyze",
    invalid: "Enter a valid website URL, such as example.com.",
    examples: "Try",
  },
  ko: {
    eyebrow: "새 분석",
    title: ["웹을 현미경으로", "들여다보세요."],
    intro:
      "공개 웹사이트 URL을 입력하세요. autopsy가 HTML 문서를 가져오고 headless 브라우저에서 스크립트를 실행한 상태로 페이지를 불러온 뒤, 관측할 수 있는 기술, 타이밍, 요청, 기본 점검 결과를 보고합니다.",
    url: "웹사이트 URL",
    submit: "분석",
    invalid: "example.com 같은 올바른 웹사이트 URL을 입력하세요.",
    examples: "예시",
  },
};
export function AnalysisForm({
  onSubmit,
  titleId = "analysis-title",
}: {
  /** Receives a validated http(s) URL. */
  onSubmit: (url: URL) => void;
  titleId?: string;
}) {
  const t = useMessages(MESSAGES);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    const url = normalizeHttpUrl(input);
    if (!url) return setError(t.invalid);
    setError("");
    onSubmit(url);
  }
  return (
    <div className="analysis-content">
      <div className="eyebrow">{t.eyebrow}</div>
      <h2 id={titleId}>
        {t.title[0]}
        <br />
        {t.title[1]}
      </h2>
      <p>{t.intro}</p>
      <form onSubmit={submit} noValidate>
        <Globe size={18} />
        <input
          aria-label={t.url}
          autoFocus
          placeholder="https://example.com"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          required
          aria-invalid={!!error}
          aria-describedby={error ? "url-error" : undefined}
        />
        <button type="submit">
          {t.submit}
          <ArrowRight size={16} />
        </button>
      </form>
      {error && (
        <p id="url-error" role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="try-example">
        {t.examples}
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => setInput(`https://${example}`)}
          >
            {example}
            <ArrowUpRight size={12} />
          </button>
        ))}
      </div>
    </div>
  );
}
