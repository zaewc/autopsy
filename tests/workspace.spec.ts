import { test, expect } from "@playwright/test";
test("report exploration and URL scan demonstration", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.getByRole("heading", {
      name: "linear.app Open linear.app",
      exact: true,
    }),
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
  await page.getByRole("button", { name: "New analysis" }).click();
  await page.getByRole("textbox", { name: "Website URL" }).fill("invalid");
  await page.getByRole("button", { name: "Open sample", exact: true }).click();
  await expect(page.getByRole("dialog").getByRole("alert")).toContainText(
    "valid website URL",
  );
  await page
    .getByRole("textbox", { name: "Website URL" })
    .fill("https://example.com");
  await page.getByRole("button", { name: "Open sample", exact: true }).click();
  await expect(page.getByRole("dialog")).toBeHidden({ timeout: 10000 });
  await expect(
    page.getByRole("heading", {
      name: "example.com Open example.com",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Security", exact: true }).click();
  await expect(
    page.getByText("Header absent from sample response"),
  ).toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export report" }).click();
  expect((await download).suggestedFilename()).toBe("autopsy-example.com.json");
  expect(errors).toEqual([]);
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
      await page.getByRole("button", { name: "New analysis" }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByRole("button", { name: "Close new analysis" }).click();
    }
    await page.screenshot({
      path: test.info().outputPath(`autopsy-${width}.png`),
      fullPage: true,
    });
  }
});

test("landing scan opens the requested sample report", async ({ page }) => {
  await page.goto("/new");
  await expect(
    page.getByRole("heading", { name: "Put the web under a microscope." }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "Website URL" })
    .fill("https://example.org/path");
  await page.getByRole("button", { name: "Open sample", exact: true }).click();
  await expect(page).toHaveURL(/site=example.org/, { timeout: 15000 });
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "example.org",
  );
  await expect(
    page.getByText(/no live website scan has been performed/),
  ).toBeVisible();
});

test("keyboard navigation, dialog cancellation, and evidence are accessible", async ({
  page,
}) => {
  await page.goto("/");
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
  await page.getByRole("textbox", { name: "Website URL" }).fill("example.net");
  await page.getByRole("button", { name: "Open sample", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "linear.app",
  );
});
