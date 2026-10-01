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
    "Scripts were not executed",
  );
  await page.getByRole("button", { name: /^Next\.js/ }).click();
  await expect(
    page.getByText("Response header x-powered-by: Next.js"),
  ).toBeVisible();
  await page.getByRole("button", { name: /^React/ }).click();
  await expect(page.getByText(/Inferred because Next\.js/)).toBeVisible();
  await page
    .getByRole("navigation", { name: "Report sections" })
    .getByRole("button", { name: "Security", exact: true })
    .click();
  await expect(page.getByText("Final URL uses HTTP:")).toBeVisible();
  const sections = page.getByRole("navigation", { name: "Report sections" });
  await sections.getByRole("button", { name: "Performance" }).click();
  await expect(page.getByText("HTTP status")).toBeVisible();
  await expect(page.getByText(/not in a visitor's browser/)).toBeVisible();
  await sections.getByRole("button", { name: "Network" }).click();
  await expect(page.getByText("1 redirect", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("row", { name: "x-vercel-id icn1::fixture" }),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export report" }).click();
  expect((await download).suggestedFilename()).toBe("autopsy-127.0.0.1.json");
});

test("prose mentioning Next.js paths is not detected as Next.js", async ({
  page,
}) => {
  await page.goto(`/?site=${encodeURIComponent(`${FIXTURE}/plain`)}`);
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "127.0.0.1",
    { timeout: 15000 },
  );
  await expect(page.getByRole("button", { name: /^GitHub/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^Next\.js/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^React/ })).toHaveCount(0);
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
