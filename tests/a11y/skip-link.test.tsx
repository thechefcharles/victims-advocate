import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { axe } from "jest-axe";
import { SkipToMainLink } from "@/components/SkipToMainLink";

describe("Phase 4 accessibility (axe smoke)", () => {
  it("skip link + main landmark shell has no critical axe violations", async () => {
    const { container } = render(
      <>
        <SkipToMainLink />
        <div id="main-content" tabIndex={-1}>
          <main>
            <h1>Test page</h1>
            <p>Smoke test for axe-core in CI.</p>
          </main>
        </div>
      </>
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
