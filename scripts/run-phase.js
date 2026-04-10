#!/usr/bin/env node
/**
 * Auto Pipeline 2.0 — run-phase.js
 *
 * Full-phase automation. Computes dependency waves from domain-order.json,
 * skips already-locked domains, runs each domain's complete pipeline, and
 * stops with an escalation if one is detected.
 *
 * Usage:
 *   node scripts/run-phase.js --phase 3
 *   node scripts/run-phase.js --phase 3 --resume
 *   node scripts/run-phase.js --phase 3 --dry-run
 *
 * Wave rules:
 *   Wave 1: domains with no dependsOn within this phase
 *   Wave 2: domains whose deps are all satisfied by Wave 1
 *   Wave N: domains whose deps are all satisfied by Waves 1..N-1
 *   Single-domain waves: run sequentially
 *   Multi-domain waves: run in parallel (Promise.all)
 *
 * Idempotent: domains already "locked" in domain-order.json are skipped.
 * --resume: same as default (skip locked); explicit alias for clarity.
 * --dry-run: print the wave plan without running anything.
 *
 * runDomain steps (per domain):
 *   a. node scripts/preflight.js --domain {domain}
 *   b. node scripts/fetch-prompt.js --domain {domain} --stage analysis
 *   c. [Claude Code] reads artifacts/domain-{domain}-analysis-prompt.txt, runs full
 *      analysis + implementation in one pass, posts implementation notes to Notion
 *      via post-notion-output.js (Claude-driven)
 *   d. node scripts/validate.js --domain {domain}  — stops phase if any gate fails
 *   e. node scripts/post-notion-output.js [implementationNotesPageId]  (Claude-driven)
 *   f. node scripts/commit-and-pr.js --domain {domain}
 *   g. node scripts/notion-closeout.js --domain {domain}
 *   h. Update config/domain-order.json status → "locked"
 *
 * Escalation: if artifacts/domain-{domain}-escalation.md exists after
 * execution, the phase stops and the file content is printed. Human resolves,
 * then re-runs with --resume.
 *
 * Requires: NOTION_API_KEY, gh CLI on PATH
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { execSync, spawnSync } = require("child_process");

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { dryRun: false, resume: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--phase") args.phase = argv[++i];
    else if (argv[i] === "--dry-run") args.dryRun = true;
    else if (argv[i] === "--resume") args.resume = true;
  }
  return args;
}

const { phase: phaseArg, dryRun, resume } = parseArgs(process.argv.slice(2));

if (!phaseArg) {
  console.error("Usage: node scripts/run-phase.js --phase N [--dry-run] [--resume]");
  console.error("Example: node scripts/run-phase.js --phase 3");
  process.exit(1);
}

const phaseKey = String(phaseArg);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const repoRoot = path.resolve(__dirname, "..");
const domainOrderPath = path.join(repoRoot, "config", "domain-order.json");
const domainPagesPath = path.join(repoRoot, "config", "domain-pages.json");
const artifactsDir = path.join(repoRoot, "artifacts");

// Ensure /opt/homebrew/bin on PATH for gh and other Homebrew tools
const env = { ...process.env };
const extraPath = "/opt/homebrew/bin:/usr/local/bin";
env.PATH = env.PATH ? extraPath + ":" + env.PATH : extraPath;

function fail(message) {
  console.error(`[phase-runner] FAILED: ${message}`);
  process.exit(1);
}

function log(message) {
  console.log(`[phase-runner] ${message}`);
}

/** Run a shell command synchronously. Throws on non-zero exit. */
function sh(cmd, opts = {}) {
  return execSync(cmd, {
    encoding: "utf8",
    env,
    cwd: repoRoot,
    stdio: "inherit",
    ...opts,
  });
}

/** Run a shell command, capturing stdout. Throws on non-zero exit. */
function shCapture(cmd, opts = {}) {
  return execSync(cmd, {
    encoding: "utf8",
    env,
    cwd: repoRoot,
    ...opts,
  });
}

// ---------------------------------------------------------------------------
// Load configs
// ---------------------------------------------------------------------------

let domainOrder, domainPages;
try {
  domainOrder = JSON.parse(fs.readFileSync(domainOrderPath, "utf8"));
} catch (err) {
  fail(`Cannot read ${domainOrderPath}: ${err.message}`);
}
try {
  domainPages = JSON.parse(fs.readFileSync(domainPagesPath, "utf8"));
} catch (err) {
  fail(`Cannot read ${domainPagesPath}: ${err.message}`);
}

// ---------------------------------------------------------------------------
// Find phase
// ---------------------------------------------------------------------------

const phaseData = domainOrder.phases[phaseKey];
if (!phaseData) {
  fail(
    `Phase '${phaseKey}' not found in domain-order.json. ` +
      `Available phases: ${Object.keys(domainOrder.phases).join(", ")}`,
  );
}

const buildOrder = phaseData.buildOrder || [];
if (buildOrder.length === 0) {
  fail(`Phase ${phaseKey} has no domains in buildOrder.`);
}

// ---------------------------------------------------------------------------
// Validate prior-phase prerequisites
// ---------------------------------------------------------------------------

log(`Phase ${phaseKey} (${phaseData.name}) — checking cross-phase prerequisites...`);

// Collect all domains in THIS phase for the intra-phase dep check
const phasedomainIds = new Set(buildOrder.map((e) => e.domain));

for (const entry of buildOrder) {
  const externalDeps = (entry.dependsOn || []).filter((d) => !phasedomainIds.has(d));
  for (const dep of externalDeps) {
    // Find dep in any other phase
    let depEntry = null;
    for (const [pk, pd] of Object.entries(domainOrder.phases)) {
      if (pk === phaseKey) continue;
      depEntry = (pd.buildOrder || []).find((e) => e.domain === dep);
      if (depEntry) break;
    }
    if (!depEntry) {
      fail(`Cross-phase dependency '${dep}' for domain '${entry.domain}' not found in domain-order.json`);
    }
    if (depEntry.status !== "locked") {
      fail(
        `Cross-phase prerequisite domain '${dep}' has status '${depEntry.status}', not 'locked'. ` +
          `Complete phase ${dep.split(".")[0]} before starting phase ${phaseKey}.`,
      );
    }
    log(`  ✓ cross-phase dep ${dep} is locked`);
  }
}

// ---------------------------------------------------------------------------
// Build execution waves
// ---------------------------------------------------------------------------

/**
 * Compute waves from a buildOrder array.
 * A domain can be placed in wave N+1 if all of its intra-phase dependsOn
 * are in waves 1..N.
 * Returns: [ [domain, ...], [domain, ...], ... ]
 */
function buildWaves(order) {
  const waves = [];
  const placed = new Set();

  // Work with only intra-phase deps (cross-phase deps already verified above)
  const remaining = [...order];

  while (remaining.length > 0) {
    const wave = remaining.filter((entry) => {
      const intraDeps = (entry.dependsOn || []).filter((d) => phasedomainIds.has(d));
      return intraDeps.every((d) => placed.has(d));
    });

    if (wave.length === 0) {
      fail(
        `Circular dependency detected in phase ${phaseKey}. ` +
          `Remaining domains: ${remaining.map((e) => e.domain).join(", ")}`,
      );
    }

    waves.push(wave);
    for (const entry of wave) {
      placed.add(entry.domain);
      remaining.splice(remaining.indexOf(entry), 1);
    }
  }

  return waves;
}

const waves = buildWaves(buildOrder);

// ---------------------------------------------------------------------------
// --dry-run: print wave plan and exit
// ---------------------------------------------------------------------------

if (dryRun) {
  log(`Phase ${phaseKey} — ${phaseData.name} — dry-run wave plan:`);
  console.log("");
  for (let i = 0; i < waves.length; i++) {
    const wave = waves[i];
    const mode = wave.length === 1 ? "sequential" : "parallel";
    const domainList = wave
      .map((e) => {
        const config = domainPages[e.domain];
        const name = config ? config.name : e.domain;
        const locked = e.status === "locked" ? " [already locked — will skip]" : "";
        return `${e.domain} — ${name}${locked}`;
      })
      .join(", ");
    console.log(`  Wave ${i + 1} (${mode}):   ${domainList}`);
  }
  console.log("");
  const pendingCount = buildOrder.filter((e) => e.status !== "locked").length;
  const lockedCount = buildOrder.filter((e) => e.status === "locked").length;
  log(`${buildOrder.length} domains total: ${pendingCount} pending, ${lockedCount} already locked`);
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Domain status helpers
// ---------------------------------------------------------------------------

/** Read the latest domain-order.json (may have been updated by a parallel domain). */
function readDomainOrder() {
  return JSON.parse(fs.readFileSync(domainOrderPath, "utf8"));
}

/** Set a domain's status to "locked" in domain-order.json (atomic-ish file write). */
function markDomainLocked(domain) {
  const current = readDomainOrder();
  for (const pd of Object.values(current.phases)) {
    const entry = (pd.buildOrder || []).find((e) => e.domain === domain);
    if (entry) {
      entry.status = "locked";
      entry.lockedDate = new Date().toISOString().slice(0, 10);
      break;
    }
  }
  fs.writeFileSync(domainOrderPath, JSON.stringify(current, null, 2) + "\n", "utf8");
}

/** Check if a domain is currently "locked" in domain-order.json. */
function isDomainLocked(domain) {
  const current = readDomainOrder();
  for (const pd of Object.values(current.phases)) {
    const entry = (pd.buildOrder || []).find((e) => e.domain === domain);
    if (entry) return entry.status === "locked";
  }
  return false;
}

// ---------------------------------------------------------------------------
// runDomain — full pipeline for one domain
// ---------------------------------------------------------------------------

/**
 * Runs the complete pipeline for a single domain.
 * Returns { domain, status: "locked", prUrl, testCount }
 * Throws on any hard failure.
 */
async function runDomain(domain) {
  const config = domainPages[domain];
  if (!config) {
    throw new Error(`Domain '${domain}' not found in domain-pages.json`);
  }

  // Skip if already locked (idempotent / resume support)
  if (isDomainLocked(domain)) {
    log(`${domain}: already locked — skipping`);
    const prTxtPath = path.join(artifactsDir, `domain-${domain}-pr.txt`);
    const prUrl = fs.existsSync(prTxtPath)
      ? fs.readFileSync(prTxtPath, "utf8").trim()
      : "(locked before this run)";
    return { domain, status: "locked", prUrl, testCount: null };
  }

  log(`Phase ${phaseKey} — Wave N: running ${domain} ${config.name}`);

  // ---- a. Preflight ----------------------------------------------------------
  log(`${domain}: running preflight...`);
  sh(`node scripts/preflight.js --domain ${domain}`);
  log(`${domain}: preflight passed`);

  // ---- b. Fetch analysis prompt ----------------------------------------------
  log(`${domain}: fetching analysis prompt...`);
  sh(`node scripts/fetch-prompt.js --domain ${domain} --stage analysis`);
  log(`${domain}: analysis prompt fetched → artifacts/domain-${domain}-analysis-prompt.txt`);

  // ---- c. [Claude Code] — run full analysis + implementation ----------------
  // Claude Code reads the fetched analysis prompt and performs analysis AND
  // implementation in one pass. No intermediate Anthropic API review step.
  log(`${domain}: ACTION REQUIRED — Claude Code: read artifacts/domain-${domain}-analysis-prompt.txt, run full analysis + implementation in one pass, post implementation notes to Notion via post-notion-output.js`);

  // ---- Escalation check (after execution, before validation) -----------------
  const escalationPath = path.join(artifactsDir, `domain-${domain}-escalation.md`);
  if (fs.existsSync(escalationPath)) {
    const content = fs.readFileSync(escalationPath, "utf8");
    console.error(`\n[phase-runner] ESCALATION DETECTED for domain ${domain}:`);
    console.error("─".repeat(60));
    console.error(content);
    console.error("─".repeat(60));
    console.error(
      `\n[phase-runner] Phase ${phaseKey} STOPPED. Resolve escalation then re-run with --resume.`,
    );
    process.exit(1);
  }

  // ---- d. Validate -----------------------------------------------------------
  log(`${domain}: running validation gates...`);
  let testCount = null;
  try {
    const validateOut = shCapture(
      `node scripts/validate.js --domain ${domain}`,
      { stdio: ["ignore", "pipe", "pipe"] },
    );
    const match = validateOut.match(/"testCount":(\d+)/);
    if (match) testCount = parseInt(match[1], 10);
    log(`${domain}: validation passed (${testCount !== null ? testCount : "?"} tests)`);
  } catch (err) {
    console.error(`\n[phase-runner] VALIDATION FAILED for domain ${domain}:`);
    console.error(err.stdout || err.message);
    console.error(
      `\n[phase-runner] Phase ${phaseKey} STOPPED at validation. Fix failures then re-run with --resume.`,
    );
    process.exit(1);
  }

  // ---- e. [Claude Code] — post implementation notes --------------------------
  log(`${domain}: ACTION REQUIRED — Claude Code: post implementation notes to Notion page ${config.implementationNotesPageId} via post-notion-output.js`);

  // ---- f. Commit and PR ------------------------------------------------------
  log(`${domain}: committing and opening PR...`);
  sh(`node scripts/commit-and-pr.js --domain ${domain}`);
  const prTxtPath = path.join(artifactsDir, `domain-${domain}-pr.txt`);
  const prUrl = fs.existsSync(prTxtPath)
    ? fs.readFileSync(prTxtPath, "utf8").trim()
    : "(no PR URL found)";
  log(`${domain}: PR created — ${prUrl}`);

  // ---- g. Notion closeout ----------------------------------------------------
  log(`${domain}: running Notion closeout...`);
  sh(`node scripts/notion-closeout.js --domain ${domain}`);

  // ---- h. Mark locked in domain-order.json -----------------------------------
  markDomainLocked(domain);
  log(`${domain}: LOCKED ✅`);

  return { domain, status: "locked", prUrl, testCount };
}

// ---------------------------------------------------------------------------
// Main — execute waves
// ---------------------------------------------------------------------------

async function main() {
  log(`Phase ${phaseKey} (${phaseData.name}) — starting (${waves.length} wave(s))`);
  if (resume) log("--resume flag set: locked domains will be skipped");

  const allResults = [];

  for (let waveIdx = 0; waveIdx < waves.length; waveIdx++) {
    const wave = waves[waveIdx];
    const waveNum = waveIdx + 1;
    const isParallel = wave.length > 1;

    // Filter out already-locked domains for actual execution
    const pending = wave.filter((e) => !isDomainLocked(e.domain));
    const skipping = wave.filter((e) => isDomainLocked(e.domain));

    if (skipping.length > 0) {
      for (const e of skipping) {
        log(`Wave ${waveNum}: ${e.domain} already locked — skipping`);
        allResults.push({ domain: e.domain, status: "locked", prUrl: null, testCount: null });
      }
    }

    if (pending.length === 0) {
      log(`Wave ${waveNum}: all domains already locked — moving to next wave`);
      continue;
    }

    if (isParallel && pending.length > 1) {
      log(
        `Wave ${waveNum} (parallel): running ${pending.map((e) => e.domain).join(", ")} simultaneously`,
      );
      const results = await Promise.all(pending.map((e) => runDomain(e.domain)));
      allResults.push(...results);
    } else {
      for (const entry of pending) {
        log(`Wave ${waveNum} (sequential): running ${entry.domain} ${domainPages[entry.domain]?.name || ""}`);
        const result = await runDomain(entry.domain);
        allResults.push(result);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Phase complete summary
  // ---------------------------------------------------------------------------

  console.log("");
  log(`Phase ${phaseKey} (${phaseData.name}) — COMPLETE`);
  console.log("");
  console.log("  Domain     Status    Tests    PR");
  console.log("  ─────────────────────────────────────────────────────────────");
  for (const r of allResults) {
    const config = domainPages[r.domain];
    const name = (config?.name || "").padEnd(22);
    const status = (r.status || "").padEnd(8);
    const tests = (r.testCount !== null ? String(r.testCount) : "—").padEnd(8);
    const pr = r.prUrl || "—";
    console.log(`  ${r.domain.padEnd(10)} ${name} ${status} ${tests} ${pr}`);
  }
  console.log("");

  const allLocked = allResults.every((r) => r.status === "locked");
  if (allLocked) {
    log(`All ${allResults.length} domains locked. Phase ${phaseKey} complete. Ready to merge PRs.`);
  } else {
    const notLocked = allResults.filter((r) => r.status !== "locked").map((r) => r.domain);
    log(`WARNING: ${notLocked.join(", ")} did not reach locked status. Re-run with --resume.`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(`[phase-runner] Unexpected error: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
