const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
if (supabaseUrl && !supabaseUrl.includes("localhost") && !supabaseUrl.includes("staging")) {
  throw new Error(
    "E2E safety guard: these tests must not run against production. " +
      "NEXT_PUBLIC_SUPABASE_URL must contain 'localhost' or 'staging'.",
  );
}

import { test, expect } from "@playwright/test";

test.describe("Auth smoke — negative cases only", () => {
  test("unauthenticated visit to /applicant/dashboard redirects to /login", async ({ page }) => {
    await page.goto("/applicant/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForURL(/\/login/, { timeout: 10_000 });
    expect(page.url()).toMatch(/\/login/);
  });

  test("/login renders the form without errors or stack traces", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/login", { waitUntil: "domcontentloaded" });

    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 10_000 });

    const bodyText = (await page.locator("body").textContent()) ?? "";
    expect(bodyText).not.toMatch(/Unhandled Runtime Error/i);
    expect(bodyText).not.toMatch(/Server Error/i);
    expect(bodyText).not.toMatch(/at\s+\w+\s*\(.+:\d+:\d+\)/);
  });

  test("/signup renders the form without errors", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });

    await page.goto("/signup", { waitUntil: "domcontentloaded" });

    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 10_000 });

    const bodyText = (await page.locator("body").textContent()) ?? "";
    expect(bodyText).not.toMatch(/Unhandled Runtime Error/i);
    expect(bodyText).not.toMatch(/Server Error/i);

    expect(
      consoleErrors.filter((e) => !/favicon|devtools|hydration/i.test(e)),
      `Unexpected console errors on /signup: ${consoleErrors.join(" | ")}`,
    ).toEqual([]);
  });
});
