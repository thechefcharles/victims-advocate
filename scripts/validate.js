#!/usr/bin/env node
/**
 * Auto Pipeline 2.0 — validate.js
 *
 * Consolidates all validation gates into one script call. Runs the same
 * checks I would run by hand at the end of a domain execution session:
 *
 *   0. rm -rf .next            (CRITICAL — prevents stale Next.js cache from
 *                               flagging route files that exist on a different
 *                               branch as TS errors)
 *   1. npx tsc --noEmit        (must exit 0)
 *   2. npm test                (must pass; captures the test count)
 *   3. npm run build           (must succeed)
 *   4+. domain-specific grepChecks from config/domain-pages.json
 *
 * Usage:
 *   node scripts/validate.js --domain 3.1
 *
 * Exit code:
 *   0 — all gates passed
 *   1 — any gate failed; the failing gate is named in the output
 */

const fs = require("fs");
const path = require("path");
const { execSync, spawnSync } = require("child_process");

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--domain") args.domain = argv[++i];
  }
  return args;
}

const { domain } = parseArgs(process.argv.slice(2));

if (!domain) {
  console.error("Usage: node scripts/validate.js --domain X.Y");
  console.error("Example: node scripts/validate.js --domain 3.1");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const repoRoot = path.resolve(__dirname, "..");
const configPath = path.join(repoRoot, "config", "domain-pages.json");

let domainPages;
try {
  domainPages = JSON.parse(fs.readFileSync(configPath, "utf8"));
} catch (err) {
  console.error(`[validate] FAILED: cannot read ${configPath}: ${err.message}`);
  process.exit(1);
}

const config = domainPages[domain];
if (!config) {
  console.error(
    `[validate] FAILED: domain '${domain}' not found in domain-pages.json. ` +
      `Available: ${Object.keys(domainPages).join(", ")}`,
  );
  process.exit(1);
}

const grepChecks = Array.isArray(config.grepChecks) ? config.grepChecks : [];

const results = [];

function recordResult(gate, passed, extra = {}) {
  results.push({ gate, passed, ...extra });
}

function failAndExit(gate, detail) {
  recordResult(gate, false, { detail });
  console.error(`\n[validate] FAILED at gate: ${gate}`);
  if (detail) console.error(detail);
  console.error(`\n[validate] Domain ${domain} validation FAILED.`);
  process.exit(1);
}

function log(msg) {
  console.log(`[validate] ${msg}`);
}

// ---------------------------------------------------------------------------
// Gate 0: Clear .next cache
// ---------------------------------------------------------------------------

log("Domain " + domain + " (" + config.name + ") — running validation gates");
log("Gate 0: clearing .next cache");
try {
  execSync("rm -rf .next", { cwd: repoRoot, stdio: "ignore" });
  log("  ✓ .next removed");
} catch (err) {
  log("  ! .next removal warning (non-blocking): " + err.message);
}

// ---------------------------------------------------------------------------
// Gate 1: TypeScript
// ---------------------------------------------------------------------------

log("Gate 1: npx tsc --noEmit");
const tscResult = spawnSync("npx", ["tsc", "--noEmit"], {
  cwd: repoRoot,
  encoding: "utf8",
});
if (tscResult.status !== 0) {
  failAndExit(
    "tsc",
    (tscResult.stdout || "") + (tscResult.stderr || "") || "TypeScript errors detected.",
  );
}
recordResult("tsc", true);
log("  ✓ TSC passed (0 errors)");

// ---------------------------------------------------------------------------
// Gate 2: Tests
// ---------------------------------------------------------------------------

log("Gate 2: npm test");
const testResult = spawnSync("npm", ["test", "--", "--passWithNoTests"], {
  cwd: repoRoot,
  encoding: "utf8",
});
const testOutput = (testResult.stdout || "") + (testResult.stderr || "");
if (testResult.status !== 0) {
  failAndExit("tests", testOutput || "Tests failed.");
}
const testMatch = testOutput.match(/Tests\s+(\d+)\s+passed/);
const testCount = testMatch ? parseInt(testMatch[1], 10) : null;
if (testCount === null) {
  failAndExit("tests", "Could not parse test count from output:\n" + testOutput);
}
recordResult("tests", true, { count: testCount });
log("  ✓ Tests passed (" + testCount + " passing)");

// ---------------------------------------------------------------------------
// Gate 3: Build
// ---------------------------------------------------------------------------

log("Gate 3: npm run build");
const buildResult = spawnSync("npm", ["run", "build"], {
  cwd: repoRoot,
  encoding: "utf8",
});
if (buildResult.status !== 0) {
  failAndExit(
    "build",
    (buildResult.stdout || "") + (buildResult.stderr || "") || "Build failed.",
  );
}
recordResult("build", true);
log("  ✓ Build succeeded");

// ---------------------------------------------------------------------------
// Gate 4+: Domain-specific grep checks
// ---------------------------------------------------------------------------

if (grepChecks.length === 0) {
  log("Gates 4+: no grepChecks configured for this domain");
} else {
  log("Gates 4+: " + grepChecks.length + " grep check(s)");
}

for (let i = 0; i < grepChecks.length; i++) {
  const check = grepChecks[i];
  const gateName = "grep[" + (i + 1) + "] " + (check.description || check.pattern);

  // Build the grep command. Match the existing manual pattern from execution
  // sessions: grep -rn "PATTERN" PATH --include="*.ts"
  // For paths that are files (not dirs), the --include flag is harmless.
  //
  // Comment exclusion: domain-pages.json grepChecks are designed to catch
  // real code references, not documentation prose. JSDoc lines (` * source_text`)
  // and line comments (`// source_text`) are routinely filtered out manually
  // during validation. Auto-exclude them here so honest config like the 2.4
  // `source_text\b expectedCount: 0` rule doesn't false-positive on its own
  // own JSDoc explaining the rule.
  //
  // The exclusion uses a second grep against the `path:line:content` output
  // and drops lines where the content (after the second colon) is a JSDoc
  // line (`*`, `/*`), a `//` comment, or a SQL `--` comment.
  // Use -E (extended regex) so patterns like "A|B" are treated as alternation
  // rather than the literal pipe character. Existing grepCheck patterns in
  // domain-pages.json (e.g. "BEHAVIOR_RULES|DEFAULT_DISCLAIMER") rely on this.
  const safePattern = String(check.pattern).replace(/"/g, '\\"');
  const cmd =
    'grep -rEn "' +
    safePattern +
    '" ' +
    check.path +
    ' --include="*.ts" 2>/dev/null' +
    ' | grep -vE ":[0-9]+:[[:space:]]*(\\*|//|/\\*|--)"' +
    ' | wc -l';

  let count;
  try {
    const out = execSync(cmd, { cwd: repoRoot, encoding: "utf8", shell: "/bin/bash" });
    count = parseInt(out.trim(), 10);
  } catch {
    // grep returns 1 when no matches; that's fine — it means count = 0.
    count = 0;
  }

  const expected = check.expectedCount;
  let passed;
  if (expected === 0) {
    passed = count === 0;
  } else if (typeof expected === "string" && expected.startsWith(">=")) {
    const minimum = parseInt(expected.slice(2), 10);
    passed = count >= minimum;
  } else if (typeof expected === "number") {
    passed = count === expected;
  } else {
    // Unknown expectation form — treat as informational
    passed = true;
  }

  if (!passed) {
    recordResult(gateName, false, { count, expected });
    failAndExit(
      gateName,
      "grep count " + count + " does not satisfy expectedCount " + JSON.stringify(expected) +
        "\n  pattern: " + check.pattern +
        "\n  path:    " + check.path,
    );
  }
  recordResult(gateName, true, { count, expected });
  log("  ✓ " + gateName + " (count=" + count + ", expected=" + JSON.stringify(expected) + ")");
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

const summary = {
  success: true,
  domain,
  testCount,
  gates: results.length,
  results,
};

console.log("\n[validate] All gates passed.");
console.log("[validate] " + JSON.stringify({ domain, testCount, gates: results.length }));
console.log(JSON.stringify(summary, null, 2));
process.exit(0);
