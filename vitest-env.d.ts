/// <reference types="vitest/globals" />

import type { AxeResults } from "axe-core";

declare module "vitest" {
  interface Assertion<T = unknown> {
    toHaveNoViolations(expected?: AxeResults): T;
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(expected?: AxeResults): unknown;
  }
}
