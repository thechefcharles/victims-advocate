#!/usr/bin/env node
/**
 * Auto Pipeline 2.0 — preflight.js
 *
 * Runs before every domain. Enforces Rule 25 (Integration Branch Law),
 * checks upstream dependencies, ensures a clean working tree, and creates
 * or switches to the domain branch.
 *
 * Usage:
 *   node scripts/preflight.js --domain 2.2
 *
 * Order of operations:
 *   1. Read config/domain-order.json + config/domain-pages.json
 *   2. Check all dependsOn[] domains have status "locked"
 *   3. Rule 25 check: if any prior domain branch has commits not in
 *      NXTSTPS2.0-V1, merge it in and push. No asking.
 *   4. Verify git working tree is clean (fail loudly if not)
 *   5. Checkout NXTSTPS2.0-V1 and pull
 *   6. Create domain/<slug> branch (or switch to existing)
 *   7. Print { success: true, branch, domain }
 *
 * Exit code 1 on any failure with a clear error message.
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

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
  console.error("Usage: node scripts/preflight.js --domain X.Y");
  console.error("Example: node scripts/preflight.js --domain 2.2");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fail(message) {
  console.error(`[preflight] FAILED: ${message}`);
  process.exit(1);
}

function log(message) {
  console.log(`[preflight] ${message}`);
}

/** Run a shell command, returning stdout. Throws on non-zero exit. */
function sh(cmd, opts = {}) {
  return execSync(cmd, { encoding: "utf8", ...opts });
}

/** Run a shell command, returning stdout, swallowing failures (for probes). */
function shSafe(cmd) {
  try {
    return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Load configs
// ---------------------------------------------------------------------------

const repoRoot = path.resolve(__dirname, "..");
const domainPagesPath = path.join(repoRoot, "config", "domain-pages.json");
const domainOrderPath = path.join(repoRoot, "config", "domain-order.json");

let domainPages, domainOrder;
try {
  domainPages = JSON.parse(fs.readFileSync(domainPagesPath, "utf8"));
} catch (err) {
  fail(`Cannot read ${domainPagesPath}: ${err.message}`);
}
try {
  domainOrder = JSON.parse(fs.readFileSync(domainOrderPath, "utf8"));
} catch (err) {
  fail(`Cannot read ${domainOrderPath}: ${err.message}`);
}

const config = domainPages[domain];
if (!config) {
  fail(
    `Domain '${domain}' not found in domain-pages.json. ` +
      `Available: ${Object.keys(domainPages).join(", ")}`,
  );
}

const integrationBranch = domainOrder.integrationBranch || "NXTSTPS2.0-V1";

/** Walk all phases and find the buildOrder entry for this domain. */
function findOrderEntry(targetDomain) {
  for (const phaseKey of Object.keys(domainOrder.phases)) {
    const phase = domainOrder.phases[phaseKey];
    const entry = (phase.buildOrder || []).find((e) => e.domain === targetDomain);
    if (entry) return { entry, phaseKey };
  }
  return { entry: null, phaseKey: null };
}

const { entry: orderEntry } = findOrderEntry(domain);
if (!orderEntry) {
  fail(
    `Domain '${domain}' not found in domain-order.json buildOrder. ` +
      `Add it to phases[N].buildOrder before running preflight.`,
  );
}

// ---------------------------------------------------------------------------
// Step 1: Check upstream domain dependencies are locked
// ---------------------------------------------------------------------------

log(`Domain ${domain} (${config.name}) — checking upstream dependencies...`);

const dependsOn = orderEntry.dependsOn || [];
for (const dep of dependsOn) {
  const { entry: depEntry } = findOrderEntry(dep);
  if (!depEntry) {
    fail(`Upstream dependency '${dep}' not found in domain-order.json`);
  }
  if (depEntry.status !== "locked") {
    fail(
      `Upstream domain '${dep}' has status '${depEntry.status}', not 'locked'. ` +
        `Cannot start ${domain}.`,
    );
  }
  log(`  ✓ ${dep} is locked`);
}
if (dependsOn.length === 0) {
  log("  (no upstream dependencies)");
}

// ---------------------------------------------------------------------------
// Step 2: Rule 25 — Integration Branch Law
//   For each domain in domain-pages.json with status='locked' AND a slug,
//   check if its branch has commits not yet in integrationBranch. If so,
//   merge it. This is the auto-fix for the recurring "previous domain not
//   merged" friction we hit 4x in Phase 2.
// ---------------------------------------------------------------------------

log(`Rule 25 check: ensuring all locked domain branches are merged into ${integrationBranch}...`);

// Make sure we have the latest refs from origin
shSafe(`git fetch origin --quiet`);

const lockedDomains = Object.entries(domainPages)
  .filter(([, c]) => c.status === "locked" && c.slug)
  .map(([key, c]) => ({ key, slug: c.slug }));

let mergedAny = false;
for (const { key, slug } of lockedDomains) {
  const branch = `domain/${slug}`;
  // Skip if the branch doesn't exist locally OR remotely
  const localExists = shSafe(`git rev-parse --verify --quiet refs/heads/${branch}`);
  const remoteExists = shSafe(`git rev-parse --verify --quiet refs/remotes/origin/${branch}`);
  if (!localExists && !remoteExists) continue;

  // Use whichever ref exists for the comparison
  const ref = localExists ? branch : `origin/${branch}`;
  const aheadCount = shSafe(`git rev-list --count ${integrationBranch}..${ref}`);
  if (aheadCount === null) continue;
  const ahead = parseInt(aheadCount.trim(), 10);
  if (ahead === 0) continue;

  log(`  ⚠ ${branch} has ${ahead} commit(s) not in ${integrationBranch} — merging now (Rule 25)`);

  // Make sure we're on integrationBranch and up to date before merging
  try {
    sh(`git checkout ${integrationBranch}`);
    sh(`git pull origin ${integrationBranch}`);
    sh(`git merge --no-edit ${ref}`);
    sh(`git push origin ${integrationBranch}`);
    mergedAny = true;
    log(`  ✓ merged ${branch} → ${integrationBranch} → pushed`);
  } catch (err) {
    fail(
      `Auto-merge of ${branch} into ${integrationBranch} failed: ${err.message}\n` +
        `Resolve manually then re-run preflight.`,
    );
  }
}

if (!mergedAny) {
  log("  ✓ all locked domain branches already in " + integrationBranch);
}

// ---------------------------------------------------------------------------
// Step 3: Verify git working tree is clean
// ---------------------------------------------------------------------------

const dirty = sh(`git status --porcelain`).trim();
if (dirty) {
  fail(
    `Git working tree is dirty. Commit or stash changes first.\n` +
      `Uncommitted changes:\n${dirty}`,
  );
}
log("  ✓ working tree clean");

// ---------------------------------------------------------------------------
// Step 4: Checkout integration branch and pull
// ---------------------------------------------------------------------------

log(`Switching to ${integrationBranch} and pulling latest...`);
try {
  sh(`git checkout ${integrationBranch}`);
  sh(`git pull origin ${integrationBranch}`);
} catch (err) {
  fail(`Failed to update ${integrationBranch}: ${err.message}`);
}

// ---------------------------------------------------------------------------
// Step 5: Create or switch to the domain branch
// ---------------------------------------------------------------------------

const branch = `domain/${config.slug}`;
const branchExists = shSafe(`git rev-parse --verify --quiet refs/heads/${branch}`);

try {
  if (branchExists) {
    sh(`git checkout ${branch}`);
    log(`Switched to existing branch: ${branch}`);
  } else {
    sh(`git checkout -b ${branch}`);
    log(`Created branch: ${branch}`);
  }
} catch (err) {
  fail(`Branch checkout failed: ${err.message}`);
}

// ---------------------------------------------------------------------------
// Done
// ---------------------------------------------------------------------------

const result = { success: true, branch, domain };
console.log(JSON.stringify(result));
