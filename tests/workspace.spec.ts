import { test, expect, type Page } from "@playwright/test";
const FIXTURE = "http://127.0.0.1:3101";

async function analyze(page: Page, url: string) {
  await page
    .getByRole("main")
    .getByRole("button", { name: "New analysis", exact: true })
    .click();
  await page.getByRole("textbox", { name: "Website URL" }).fill(url);
  await page.getByRole("button", { name: "Analyze", exact: true }).click();
}

test("sample report is labelled and not attributed to a website", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", { level: 1, name: "Sample report" }),
  ).toBeVisible();
  await expect(
    page.getByText(/do not describe any real website/),
  ).toBeVisible();
  const overview = page.getByRole("region", { name: "Report overview" });
  for (const section of [
    "Technology",
    "Performance",
    "Network",
    "Architecture",
    "Security",
    "Accessibility",
    "SEO",
    "Findings",
  ])
    await expect(
      overview.getByRole("button", { name: new RegExp(`^Open ${section}:`) }),
    ).toBeVisible();
  await expect(overview).toContainText("Browser → Cloudflare → Next.js");
  await overview.getByRole("button", { name: /^Open Findings:/ }).click();
  await expect(
    page.getByRole("tabpanel").getByRole("heading", { name: "Findings" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "JavaScript payload could be smaller" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Suggested improvement" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Info", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "JavaScript payload could be smaller" }),
  ).toHaveCount(0);
  await page
    .getByRole("navigation", { name: "Report sections" })
    .getByRole("button", { name: "Security", exact: true })
    .click();
  await expect(
    page.getByText("Header absent from sample response"),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export report" }).click();
  expect((await download).suggestedFilename()).toBe("autopsy-sample.json");
  expect(errors).toEqual([]);
});

test("live scan reports observed technologies with evidence", async ({
  page,
}) => {
  await page.goto("/");
  await analyze(page, "invalid");
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "valid website URL",
  );
  await page
    .getByRole("textbox", { name: "Website URL" })
    .fill(`${FIXTURE}/moved`);
  await page.getByRole("button", { name: "Analyze", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(
    page.getByRole("heading", { level: 1, name: "127.0.0.1 Open 127.0.0.1" }),
  ).toBeVisible({ timeout: 15000 });
  await expect(page).toHaveURL(/site=http%3A%2F%2F127\.0\.0\.1%3A3101%2Fnext/);
  await expect(page.locator(".report-note")).toContainText(
    "headless Chromium with scripts running",
  );
  await expect(
    page.locator('.glance-technologies svg[data-logo="Next.js"]'),
  ).toBeVisible();
  await page
    .getByRole("navigation", { name: "Report sections" })
    .getByRole("button", { name: "Technology", exact: true })
    .click();
  await expect(
    page.locator('.technology-list svg[data-logo="Next.js"]'),
  ).toBeVisible();
  await page
    .locator(".technology-list")
    .getByRole("button", { name: /^Next\.js/ })
    .click();
  await expect(
    page.getByText("Response header x-powered-by: Next.js"),
  ).toBeVisible();
  await page
    .locator(".technology-list")
    .getByRole("button", { name: /^React/ })
    .click();
  await expect(page.getByText(/Inferred because Next\.js/)).toBeVisible();
  await page
    .getByRole("navigation", { name: "Report sections" })
    .getByRole("button", { name: "Security", exact: true })
    .click();
  const issue = page.getByRole("button", {
    name: /high\s*Page is served without HTTPS/,
  });
  await issue.click();
  await expect(
    page.getByText("Final URL: http://127.0.0.1:3101/next"),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: /OWASP: Transport Layer Security/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^high/, pressed: true }).click();
  await expect(issue).toBeHidden();
  await expect(
    page.getByRole("row", { name: /sid No No Not set/ }),
  ).toBeVisible();
  await expect(
    page.locator(".security-detail", { hasText: "security.txt" }),
  ).toContainText("mailto:security@fixture.test");
  await expect(page.getByText(/fixture-secret/)).toHaveCount(0);
  await page.getByRole("button", { name: "Reset filters" }).click();
  const search = page.getByRole("searchbox", { name: "Search issues" });
  await search.fill("Final URL:");
  await expect(issue).toBeVisible();
  await expect(page.locator(".security-result-count")).toContainText("1 of");
  await search.fill("no-matching-security-evidence");
  await expect(page.getByText("No issues match these filters.")).toBeVisible();
  await page.getByRole("button", { name: "Reset filters" }).click();
  await expect(search).toHaveValue("");
  await page.getByLabel("Sort by").selectOption("title");
  const titles = await page
    .locator(".security-issues .finding-title")
    .allTextContents();
  expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b)));
  await page.getByLabel("Category", { exact: true }).selectOption("Transport");
  await expect(issue).toBeVisible();
  await page
    .getByRole("navigation", { name: "Security evidence" })
    .getByRole("link", { name: "Security headers", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Security headers", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: "Reset filters" }).click();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await page.screenshot({
      path: `/tmp/autopsy-security-${width}.png`,
      fullPage: true,
      animations: "disabled",
    });
  }
  await page.setViewportSize({ width: 1440, height: 1000 });

  const sections = page.getByRole("navigation", { name: "Report sections" });
  await sections.getByRole("button", { name: "Performance" }).click();
  await expect(page.getByText("HTTP status")).toBeVisible();
  await expect(
    page.getByText("Lab values · headless Chromium, desktop, no throttling"),
  ).toBeVisible();
  await expect(page.locator(".requests-panel .subheading")).toContainText(
    /Request waterfall\s*First \d+ of \d+ requests/,
  );
  await expect(page.getByText(/not in a visitor's browser/)).toBeVisible();
  await sections.getByRole("button", { name: "Network" }).click();
  await expect(page.getByText("1 redirect", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("row", {
      name: new RegExp(`${FIXTURE}/_next/static/chunks/main-app\\.js JS 404`),
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("row", { name: "x-vercel-id icn1::fixture" }),
  ).toBeVisible();
  await sections.getByRole("button", { name: "Architecture" }).click();
  await page.getByRole("button", { name: /^Vercel/ }).click();
  await expect(
    page.getByText("Vercel: Response header x-vercel-id: icn1::fixture"),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: /^Origin services/ }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export report" }).click();
  expect((await download).suggestedFilename()).toBe("autopsy-127.0.0.1.json");
});

test("prose mentioning Next.js paths is not detected as Next.js", async ({
  page,
}) => {
  await page.goto(`/?site=${encodeURIComponent(`${FIXTURE}/plain`)}`);
  await expect(
    page.getByRole("heading", { level: 1, name: "127.0.0.1 Open 127.0.0.1" }),
  ).toBeVisible({ timeout: 15000 });
  await page
    .getByRole("navigation", { name: "Report sections" })
    .getByRole("button", { name: "Technology", exact: true })
    .click();
  await expect(
    page.locator(".technology-list").getByRole("button", { name: /^GitHub/ }),
  ).toBeVisible();
  await expect(
    page.locator(".technology-list").getByRole("button", { name: /^Next\.js/ }),
  ).toHaveCount(0);
  await expect(
    page.locator(".technology-list").getByRole("button", { name: /^React/ }),
  ).toHaveCount(0);
});

test("landing form opens a live report", async ({ page }) => {
  await page.goto("/new");
  await expect(
    page.getByRole("heading", { name: "Put the web under a microscope." }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Website URL" })
    .fill(`${FIXTURE}/plain`);
  await page.getByRole("button", { name: "Analyze", exact: true }).click();
  await expect(page).toHaveURL(/site=/);
  await expect(
    page.getByRole("heading", { level: 1, name: "127.0.0.1 Open 127.0.0.1" }),
  ).toBeVisible({ timeout: 15000 });
});

test("scan failures explain the cause and allow recovery", async ({ page }) => {
  await page.goto("/?site=10.0.0.1");
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "10.0.0.1 is not a public internet address.",
    { timeout: 15000 },
  );
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  await page.getByRole("button", { name: "View sample report" }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: "Sample report" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await analyze(page, `${FIXTURE}/file.json`);
  await expect(page.getByRole("main").getByRole("alert")).toContainText(
    "not an HTML document",
    {
      timeout: 15000,
    },
  );
});

test("keyboard navigation, scan cancellation, and evidence are accessible", async ({
  page,
}) => {
  await page.goto("/");
  await page.setViewportSize({ width: 390, height: 900 });
  await page.getByRole("tab", { name: "Overview", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Technology", exact: true }),
  ).toBeFocused();
  await page.getByRole("button", { name: /TypeScript/ }).click();
  await expect(
    page.getByText(/does not prove the original source language/),
  ).toBeVisible();
  await page.keyboard.press("ControlOrMeta+k");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await page.keyboard.press("ControlOrMeta+k");
  await page
    .getByRole("textbox", { name: "Website URL" })
    .fill(`${FIXTURE}/slow`);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText(
    "Fetching the HTML document",
  );
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Sample report",
  );
  await expect(page).toHaveURL(/\/$/);
});

test("desktop and mobile layouts fit the viewport", async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("/");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBeTruthy();
    if (width === 390) {
      await page.getByRole("button", { name: "Toggle navigation" }).click();
      await page
        .getByRole("button", { name: "New analysis", exact: true })
        .first()
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByRole("button", { name: "Close new analysis" }).click();
    }
    await page.screenshot({
      path: test.info().outputPath(`autopsy-${width}.png`),
      fullPage: true,
    });
  }
});

test("long scan targets and entry forms fit narrow viewports", async ({
  page,
}) => {
  const domain = `${"a".repeat(60)}.${"b".repeat(60)}.example.com`;
  for (const width of [320, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto(`/?site=${domain}`);
    await expect(page.getByRole("heading", { level: 1 })).toContainText(domain);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.goto("/new");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
    await page.getByRole("textbox", { name: "Website URL" }).fill("invalid");
    await page.getByRole("button", { name: "Analyze", exact: true }).click();
    await expect(
      page.getByText("Enter a valid website URL, such as example.com."),
    ).toBeVisible();
  }
});

test("mobile navigation restores focus and reduced motion preserves readable evidence", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const toggle = page.getByRole("button", { name: "Toggle navigation" });
  await toggle.click();
  await expect(
    page
      .getByRole("complementary", { name: "Report navigation" })
      .getByRole("button", { name: "Close navigation" }),
  ).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(toggle).toBeFocused();
  await expect(
    page
      .getByRole("complementary", { name: "Report navigation" })
      .getByRole("button", { name: "New analysis", exact: true }),
  ).toBeHidden();
  await page.getByRole("tab", { name: /^Findings/ }).click();
  await page.getByRole("button", { name: /JavaScript payload/ }).click();
  await expect(
    page.getByRole("heading", { name: "Suggested improvement" }),
  ).toBeVisible();
  expect(
    await page
      .locator(".report-tabs")
      .evaluate((element) => getComputedStyle(element).transitionDuration),
  ).toBe("0s");
  await toggle.click();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await expect(page.locator(".workspace")).not.toHaveAttribute("inert", "");
});

test.describe("Korean locale", () => {
  test.use({ locale: "ko-KR" });

  test("browser language selects Korean and a saved choice overrides it", async ({
    page,
    context,
  }) => {
    await page.goto("/new");
    await expect(page.locator("html")).toHaveAttribute("lang", "ko");
    await expect(page).toHaveTitle("autopsy — 웹을 현미경 아래에");
    await context.addCookies([
      { name: "autopsy-locale", value: "en", url: "http://127.0.0.1:3100" },
    ]);
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });

  test("workspace navigation and scan status are in Korean", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 900 });
    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1, name: "샘플 리포트" }),
    ).toBeVisible();
    await expect(
      page.getByText(/실제 웹사이트를 설명하지 않습니다/),
    ).toBeVisible();
    await page.getByRole("tab", { name: "개요", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(
      page.getByRole("tab", { name: "기술", exact: true }),
    ).toBeFocused();
    await page
      .getByRole("main")
      .getByRole("button", { name: "새 분석", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "웹사이트 URL" })
      .fill(`${FIXTURE}/slow`);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("status")).toContainText(
      "headless 브라우저에서 스크립트를 실행한 상태로",
    );
    await page.getByRole("button", { name: "취소", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "샘플 리포트",
    );
    for (const width of [1440, 320]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
    }
    await page.getByRole("button", { name: "탐색 열기/닫기" }).click();
    await expect(
      page
        .getByRole("complementary", { name: "리포트 탐색" })
        .getByRole("button", { name: "탐색 닫기" }),
    ).toBeFocused();
    await page.screenshot({ path: "/tmp/autopsy-ko-nav-320.png" });
  });

  test("report overview summarizes each section in Korean", async ({
    page,
  }) => {
    await page.goto("/");
    const overview = page.getByRole("region", { name: "리포트 개요" });
    for (const section of ["기술", "성능", "네트워크", "보안", "SEO"])
      await expect(
        overview.getByRole("button", { name: new RegExp(`^${section} 열기:`) }),
      ).toBeVisible();
    await expect(overview).toContainText("관측된 기술 5개 · 추론 1개");
    await expect(overview).toContainText("브라우저 → Cloudflare → Next.js");
    await expect(overview).toContainText("경고 2개 · 정보 1개");
    await expect(overview).toContainText("LCP");
    await expect(overview).toContainText("좋음");
    await page.goto(`/?site=${encodeURIComponent(`${FIXTURE}/next`)}`);
    await expect(
      overview.getByRole("button", { name: /^보안 열기: 높음 \d+개/ }),
    ).toBeVisible({ timeout: 15000 });
    for (const width of [1440, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
      await page.screenshot({
        path: `/tmp/autopsy-ko-overview-${width}.png`,
        fullPage: true,
      });
    }
  });

  test("report sections label evidence and checks in Korean", async ({
    page,
  }) => {
    await page.goto("/");
    const sections = page.getByRole("navigation", { name: "리포트 섹션" });
    await sections.getByRole("button", { name: "기술", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "기술 스택" }),
    ).toBeVisible();
    await page.getByRole("button", { name: /TypeScript/ }).click();
    await expect(page.getByText("TypeScript · 샘플 근거")).toBeVisible();
    await expect(page.locator(".technology-basis").first()).toHaveText("관측");
    await sections.getByRole("button", { name: /^발견 사항/ }).click();
    await page
      .getByRole("button", { name: /JavaScript payload could be smaller/ })
      .click();
    await expect(
      page.getByRole("heading", { name: "개선 제안" }),
    ).toBeVisible();
    await expect(page.locator(".finding-tag").first()).toHaveText("성능");
    await page.getByRole("button", { name: "정보", exact: true }).click();
    await expect(
      page.getByRole("button", { name: /JavaScript payload/ }),
    ).toHaveCount(0);
    await sections.getByRole("button", { name: "보안", exact: true }).click();
    await expect(
      page.getByRole("heading", { name: "보안 점검" }),
    ).toBeVisible();
    await expect(page.locator(".audit-table")).toContainText("검토 필요");
    await sections
      .getByRole("button", { name: "아키텍처", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "아키텍처 신호" }),
    ).toBeVisible();
    await expect(page.getByText(/외부 API는 가설이며/)).toBeVisible();
    await page.getByRole("button", { name: /^브라우저/ }).click();
    await expect(page.getByRole("status")).toContainText("이 샘플에서 관측");
    await page.setViewportSize({ width: 320, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBeTruthy();
  });

  test("performance and network views are in Korean", async ({ page }) => {
    await page.goto("/");
    const sections = page.getByRole("navigation", { name: "리포트 섹션" });
    await sections.getByRole("button", { name: "성능", exact: true }).click();
    await expect(page.getByText("예시 값 · 측정하지 않음")).toBeVisible();
    await expect(page.getByText("Largest Contentful Paint")).toBeVisible();
    await page.goto(`/?site=${encodeURIComponent(`${FIXTURE}/moved`)}`);
    await expect(
      page.getByRole("heading", { level: 1, name: "127.0.0.1 127.0.0.1 열기" }),
    ).toBeVisible({ timeout: 15000 });
    await sections.getByRole("button", { name: "성능", exact: true }).click();
    await expect(
      page.getByText("lab 값 · headless Chromium, 데스크톱, throttling 없음"),
    ).toBeVisible();
    await expect(page.locator(".requests-panel .subheading")).toContainText(
      /요청 waterfall\s*요청 \d+개 중 처음 \d+개/,
    );
    await expect(page.getByText("HTTP 상태")).toBeVisible();
    await sections
      .getByRole("button", { name: "네트워크", exact: true })
      .click();
    await expect(page.getByText("리디렉션 1개", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("columnheader", { name: "유형", exact: true }),
    ).toBeVisible();
    for (const width of [1440, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
      await page.screenshot({
        path: `/tmp/autopsy-ko-network-${width}.png`,
        fullPage: true,
      });
    }
  });

  test("security review filters and evidence are in Korean", async ({
    page,
  }) => {
    await page.goto(`/?site=${encodeURIComponent(`${FIXTURE}/next`)}`);
    await expect(
      page.getByRole("heading", { level: 1, name: "127.0.0.1 127.0.0.1 열기" }),
    ).toBeVisible({ timeout: 15000 });
    await page
      .getByRole("navigation", { name: "리포트 섹션" })
      .getByRole("button", { name: "보안", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "보안 검토" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /^높음/, pressed: true }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: /높음\s*페이지가 HTTPS 없이 제공됩니다/ })
      .click();
    await expect(
      page.getByText("최종 URL: http://127.0.0.1:3101/next"),
    ).toBeVisible();
    await page
      .getByRole("navigation", { name: "리포트 섹션" })
      .getByRole("button", { name: "기술", exact: true })
      .click();
    await page
      .locator(".technology-list")
      .getByRole("button", { name: /^Next\.js/ })
      .click();
    await expect(
      page.getByText("응답 헤더 x-powered-by: Next.js"),
    ).toBeVisible();
    await page
      .getByRole("navigation", { name: "리포트 섹션" })
      .getByRole("button", { name: "보안", exact: true })
      .click();
    await expect(
      page.getByRole("row", { name: /sid 아니요 아니요 설정 안 됨/ }),
    ).toBeVisible();
    const search = page.getByRole("searchbox", { name: "이슈 검색" });
    await search.fill("no-matching-security-evidence");
    await expect(
      page.getByText("필터와 일치하는 이슈가 없습니다."),
    ).toBeVisible();
    await page.getByRole("button", { name: "필터 초기화" }).click();
    await page.getByLabel("분류", { exact: true }).selectOption("Transport");
    await expect(page.locator(".security-result-count")).toContainText(
      /이슈 \d+개 중 \d+개/,
    );
    await expect(
      page.locator(".security-issues .finding-tag").first(),
    ).toHaveText("전송");
    await page
      .getByRole("navigation", { name: "보안 근거" })
      .getByRole("link", { name: "보안 헤더", exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: "보안 헤더", exact: true }),
    ).toBeFocused();
    await expect(page).toHaveURL(/#security-security-headers$/);
    for (const width of [1440, 320]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
      await page.evaluate(() =>
        window.scrollTo({ top: 0, behavior: "instant" }),
      );
      await page.screenshot({
        path: `/tmp/autopsy-ko-security-${width}.png`,
        fullPage: true,
      });
    }
  });

  test("scan notices and failures come back in Korean", async ({ page }) => {
    await page.goto(`/?site=${encodeURIComponent(`${FIXTURE}/next`)}`);
    await expect(page.locator(".report-note")).toContainText(
      "headless Chromium에서 스크립트를 실행한 상태로",
      { timeout: 15000 },
    );
    await page.goto("/?site=10.0.0.1");
    await expect(page.getByRole("main").getByRole("alert")).toContainText(
      "공개 인터넷 주소의 80, 443 포트만 스캔합니다.",
      { timeout: 15000 },
    );
    await expect(page.getByRole("button", { name: "다시 시도" })).toBeVisible();
  });

  test("document checks from a live scan are in Korean", async ({ page }) => {
    await page.goto(`/?site=${encodeURIComponent(`${FIXTURE}/next`)}`);
    await expect(
      page.getByRole("heading", { level: 1, name: "127.0.0.1 127.0.0.1 열기" }),
    ).toBeVisible({ timeout: 15000 });
    await page
      .getByRole("navigation", { name: "리포트 섹션" })
      .getByRole("button", { name: "SEO", exact: true })
      .click();
    await expect(page.locator(".audit-table")).toContainText(
      "meta description이 없습니다",
    );
    await expect(page.locator(".audit-table")).toContainText("페이지 제목");
  });

  test("URL entry is in Korean and keeps technical terms", async ({ page }) => {
    await page.goto("/new");
    await expect(
      page.getByRole("heading", { name: "웹을 현미경으로 들여다보세요." }),
    ).toBeVisible();
    await expect(page.getByText(/headless 브라우저/)).toBeVisible();
    await page.getByRole("textbox", { name: "웹사이트 URL" }).fill("invalid");
    await page.getByRole("button", { name: "분석", exact: true }).click();
    await expect(page.locator("#url-error")).toHaveText(
      "example.com 같은 올바른 웹사이트 URL을 입력하세요.",
    );
    for (const width of [1440, 320]) {
      await page.setViewportSize({ width, height: 900 });
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      ).toBeTruthy();
    }
    await page.screenshot({ path: "/tmp/autopsy-ko-new-320.png" });
  });
});
