import AxeBuilder from "@axe-core/playwright";
import { test } from "@playwright/test";

function summarizeViolations(
  violations: Array<{ id: string; impact?: string | null; help: string; nodes: { html: string }[] }>
) {
  return violations
    .map(
      (v) =>
        `[${v.impact}] ${v.id}: ${v.help}\n` +
        v.nodes
          .slice(0, 5)
          .map((n) => `  ${n.html}`)
          .join("\n")
    )
    .join("\n\n");
}

test.describe("Full-page axe: /compensation/intake", () => {
  /** Resolves after client redirect (e.g. to /login) when unauthenticated — still exercises global chrome + gate page. */
  test("no critical or serious WCAG violations on resolved document", async ({ page }) => {
    await page.goto("/compensation/intake", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {
      /* long-polling / analytics — dom is enough */
    });

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();

    const blocking = results.violations.filter(
      (v) => v.impact === "critical" || v.impact === "serious"
    );

    if (blocking.length > 0) {
      throw new Error(`Axe critical/serious:\n${summarizeViolations(blocking)}`);
    }
  });
});
