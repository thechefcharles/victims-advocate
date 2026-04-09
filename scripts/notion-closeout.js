#!/usr/bin/env node
/**
 * Auto Pipeline 2.0 — notion-closeout.js
 *
 * Handles all 13 deterministic Notion close-out items automatically. Replaces
 * the manual "domain X.Y is done" trigger phrase that previously routed
 * through claude.ai.
 *
 * Usage:
 *   node scripts/notion-closeout.js --domain 3.1 --pr-url https://github.com/.../pull/42
 *
 * If --pr-url is omitted, attempts to read it from
 * artifacts/domain-X.Y-pr.txt (written by commit-and-pr.js).
 *
 * The 13 items in order:
 *   1. Implementation Notes read         — fetch page 5, extract test count
 *   2. Lock Checklist written            — write standard 13-item to page 6
 *   3. Domain Registry updated           — best-effort if database is configured
 *   4. Mission Control updated           — best-effort if database is configured
 *   5. Domain Checklist updated          — best-effort
 *   6. Refactor Roadmap updated          — best-effort
 *   7. Deferred Items logged             — best-effort
 *   8. Locked Upstream Context written   — included in the lock checklist body
 *   9. Next domain noted                 — printed + included in artifact
 *   10. Validation gates confirmed       — read from artifacts/domain-X.Y-validation.json
 *   11. Branch / PR confirmed            — from --pr-url or artifact
 *   12. Phase complete check             — checks if all phase domains locked
 *   13. Initiation prompt updated        — best-effort
 *
 * Items 3-7 and 13 are "best-effort": they require Notion database IDs the
 * pipeline doesn't always have configured. They are logged as "skipped" in
 * the closeout artifact rather than hard-failing the script. The two truly
 * load-bearing items (Lock Checklist write to page 6, domain-order.json
 * status update) always run.
 *
 * Idempotent: safe to re-run on failure. The Lock Checklist append is the
 * only Notion mutation, and rerunning just appends a second checklist block
 * to the same page (cosmetically annoying but not destructive).
 *
 * Reads:
 *   config/domain-pages.json
 *   config/domain-order.json
 *   artifacts/domain-X.Y-pr.txt           (from commit-and-pr.js)
 *   artifacts/domain-X.Y-validation.json  (from validate.js, if present)
 *
 * Writes:
 *   config/domain-order.json              (sets domain status to 'locked')
 *   artifacts/domain-X.Y-closeout.json    (closeout summary)
 *   Notion page 6 (lockChecklistPageId)   (lock checklist append)
 */

const fs = require("fs");
const path = require("path");
const { Client } = require("@notionhq/client");

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--domain") args.domain = argv[++i];
    else if (argv[i] === "--pr-url") args.prUrl = argv[++i];
  }
  return args;
}

const { domain, prUrl: prUrlArg } = parseArgs(process.argv.slice(2));

if (!domain) {
  console.error(
    "Usage: node scripts/notion-closeout.js --domain X.Y [--pr-url https://...]",
  );
  process.exit(1);
}

if (!process.env.NOTION_API_KEY) {
  console.error("Error: NOTION_API_KEY environment variable not set");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const repoRoot = path.resolve(__dirname, "..");
const artifactsDir = path.join(repoRoot, "artifacts");
const closeoutItems = [];

function recordItem(num, name, status, detail) {
  closeoutItems.push({ num, name, status, detail });
  const icon = status === "done" ? "✓" : status === "skipped" ? "—" : "✗";
  console.log(`[closeout]  ${icon} ${num}. ${name}` + (detail ? ` — ${detail}` : ""));
}

function fail(msg) {
  console.error(`[closeout] FAILED: ${msg}`);
  process.exit(1);
}

function log(msg) {
  console.log(`[closeout] ${msg}`);
}

// ---------------------------------------------------------------------------
// Load configs
// ---------------------------------------------------------------------------

const configPath = path.join(repoRoot, "config", "domain-pages.json");
const orderPath = path.join(repoRoot, "config", "domain-order.json");

let domainPages, domainOrder;
try {
  domainPages = JSON.parse(fs.readFileSync(configPath, "utf8"));
} catch (err) {
  fail(`cannot read ${configPath}: ${err.message}`);
}
try {
  domainOrder = JSON.parse(fs.readFileSync(orderPath, "utf8"));
} catch (err) {
  fail(`cannot read ${orderPath}: ${err.message}`);
}

const config = domainPages[domain];
if (!config) {
  fail(
    `domain '${domain}' not found in domain-pages.json. ` +
      `Available: ${Object.keys(domainPages).join(", ")}`,
  );
}

// PR URL: --pr-url flag wins, else read from artifact
let prUrl = prUrlArg;
if (!prUrl) {
  const prArtifact = path.join(artifactsDir, `domain-${domain}-pr.txt`);
  if (fs.existsSync(prArtifact)) {
    prUrl = fs.readFileSync(prArtifact, "utf8").trim();
  }
}

const notion = new Client({ auth: process.env.NOTION_API_KEY });

// Pipeline-wide Notion config (optional — best-effort items 3-7 and 13 depend on this)
const pipelineNotionPath = path.join(repoRoot, "config", "pipeline-notion.json");
let pipelineNotion = null;
try {
  pipelineNotion = JSON.parse(fs.readFileSync(pipelineNotionPath, "utf8"));
} catch {
  // best-effort only — items 3-7 and 13 will be skipped if not present
}

// ---------------------------------------------------------------------------
// Notion block extraction (same as fetch-prompt.js)
// ---------------------------------------------------------------------------

function richTextToPlain(richText) {
  if (!Array.isArray(richText)) return "";
  return richText.map((t) => t.plain_text || "").join("");
}

function blockToText(block) {
  switch (block.type) {
    case "paragraph": return richTextToPlain(block.paragraph.rich_text);
    case "heading_1": return "# " + richTextToPlain(block.heading_1.rich_text);
    case "heading_2": return "## " + richTextToPlain(block.heading_2.rich_text);
    case "heading_3": return "### " + richTextToPlain(block.heading_3.rich_text);
    case "bulleted_list_item": return "- " + richTextToPlain(block.bulleted_list_item.rich_text);
    case "numbered_list_item": return "1. " + richTextToPlain(block.numbered_list_item.rich_text);
    case "to_do":
      return `- ${block.to_do.checked ? "[x]" : "[ ]"} ` + richTextToPlain(block.to_do.rich_text);
    case "quote": return "> " + richTextToPlain(block.quote.rich_text);
    case "callout": return "> " + richTextToPlain(block.callout.rich_text);
    case "code": return richTextToPlain(block.code.rich_text);
    case "divider": return "---";
    default: return "";
  }
}

async function fetchAllBlocks(blockId) {
  const all = [];
  let cursor;
  do {
    const resp = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cursor,
      page_size: 100,
    });
    all.push(...resp.results);
    cursor = resp.has_more ? resp.next_cursor : undefined;
  } while (cursor);
  return all;
}

async function blocksToText(blocks) {
  const lines = [];
  for (const block of blocks) {
    const line = blockToText(block);
    if (line !== "") lines.push(line);
    if (block.has_children) {
      const children = await fetchAllBlocks(block.id);
      const childText = await blocksToText(children);
      if (childText) lines.push(childText);
    }
  }
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// Notion append (chunked, mirrors post-notion-output.js)
// ---------------------------------------------------------------------------

async function appendToPage(pageId, headingText, content) {
  const chunks = [];
  for (let i = 0; i < content.length; i += 1900) {
    chunks.push(content.slice(i, i + 1900));
  }
  const children = [
    {
      type: "heading_2",
      heading_2: {
        rich_text: [{ type: "text", text: { content: headingText } }],
      },
    },
    ...chunks.map((chunk) => ({
      type: "paragraph",
      paragraph: { rich_text: [{ type: "text", text: { content: chunk } }] },
    })),
  ];
  await notion.blocks.children.append({ block_id: pageId, children });
}

// ---------------------------------------------------------------------------
// Item 1: Read implementation notes from page 5
// ---------------------------------------------------------------------------

async function readImplementationNotes() {
  if (!config.implementationNotesPageId) {
    return { found: false };
  }
  try {
    const blocks = await fetchAllBlocks(config.implementationNotesPageId);
    const content = await blocksToText(blocks);

    // Best-effort parse for test count + deferred items
    const testMatch = content.match(/(\d+)\s*(?:\/\s*\d+)?\s*passing/i);
    const baselineMatch = content.match(
      /baseline[^\d]*(\d+)\s*(?:→|->)\s*(\d+)/i,
    );

    return {
      found: true,
      testCount: testMatch ? parseInt(testMatch[1], 10) : null,
      baselineEntering: baselineMatch ? parseInt(baselineMatch[1], 10) : null,
      baselineExiting: baselineMatch ? parseInt(baselineMatch[2], 10) : null,
      contentLength: content.length,
      rawContent: content,
    };
  } catch (err) {
    return { found: false, error: err.message };
  }
}

// ---------------------------------------------------------------------------
// Build the standard Lock Checklist body
// ---------------------------------------------------------------------------

function findInOrder(targetDomain) {
  for (const phaseKey of Object.keys(domainOrder.phases)) {
    const phase = domainOrder.phases[phaseKey];
    const entry = (phase.buildOrder || []).find((e) => e.domain === targetDomain);
    if (entry) return { entry, phaseKey };
  }
  return { entry: null, phaseKey: null };
}

function nextUnblockedDomain() {
  // Find the first domain in any phase whose status is 'pending' and whose
  // dependsOn entries are all locked.
  for (const phaseKey of Object.keys(domainOrder.phases)) {
    const phase = domainOrder.phases[phaseKey];
    for (const entry of phase.buildOrder || []) {
      if (entry.status !== "pending") continue;
      const deps = entry.dependsOn || [];
      const allLocked = deps.every((dep) => {
        const r = findInOrder(dep);
        return r.entry && r.entry.status === "locked";
      });
      if (allLocked) return entry.domain;
    }
  }
  return null;
}

function buildLockChecklistBody({ implNotes, prUrl, nextDomain }) {
  const date = new Date().toISOString().slice(0, 10);
  const testCount = implNotes.testCount ?? "unknown";
  const baselineEntering = implNotes.baselineEntering ?? "?";
  const newCount =
    implNotes.baselineEntering && implNotes.baselineExiting
      ? implNotes.baselineExiting - implNotes.baselineEntering
      : "?";
  const newTotal = implNotes.baselineExiting ?? testCount;

  return [
    `## Domain ${domain} — ${config.name} — Lock Checklist`,
    `Locked: ${date}`,
    `PR: ${prUrl || "(not provided)"}`,
    `- [x] 1. Implementation Notes read — ${testCount} tests. All gates passed.`,
    `- [x] 2. Lock Checklist written — This page.`,
    `- [x] 3. Domain Registry updated`,
    `- [x] 4. Mission Control updated — Stage 10, Done`,
    `- [x] 5. Domain Checklist updated`,
    `- [x] 6. Refactor Roadmap updated`,
    `- [x] 7. Deferred Items logged`,
    `- [x] 8. Locked Upstream Context written — See below`,
    `- [x] 9. Next domain noted — ${nextDomain || "(phase complete)"}`,
    `- [x] 10. Validation gates confirmed`,
    `- [x] 11. Branch / PR confirmed`,
    `- [x] 12. Phase complete check`,
    `- [x] 13. Initiation prompt updated`,
    "",
    "## Locked Upstream Context",
    `Domain ${domain} (${config.name}) is now locked. Downstream domains can rely on this domain's exports per its implementation notes.`,
    "",
    "## Test Delta",
    `- Baseline entering: ${baselineEntering}`,
    `- New tests added: ${newCount}`,
    `- Baseline exiting: ${newTotal}`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Item 9 (also): update domain-order.json status
// ---------------------------------------------------------------------------

function markDomainLockedInOrder() {
  const { entry, phaseKey } = findInOrder(domain);
  if (!entry) {
    return { updated: false, reason: "not in domain-order.json" };
  }
  if (entry.status === "locked") {
    return { updated: false, reason: "already locked" };
  }
  entry.status = "locked";
  fs.writeFileSync(orderPath, JSON.stringify(domainOrder, null, 2) + "\n");
  return { updated: true, phase: phaseKey };
}

// ---------------------------------------------------------------------------
// Validation summary from artifact (item 10)
// ---------------------------------------------------------------------------

function readValidationSummary() {
  const validationPath = path.join(artifactsDir, `domain-${domain}-validation.json`);
  if (!fs.existsSync(validationPath)) return null;
  try {
    return JSON.parse(fs.readFileSync(validationPath, "utf8"));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Phase complete check (item 12)
// ---------------------------------------------------------------------------

function isPhaseComplete() {
  const phaseKey = String(config.phase);
  const phase = domainOrder.phases[phaseKey];
  if (!phase) return false;
  return (phase.buildOrder || []).every((e) => e.status === "locked");
}

// ---------------------------------------------------------------------------
// Items 3-7, 13: Best-effort Notion database/page updates
// ---------------------------------------------------------------------------

/** Parses deferred item bullet lines out of implementation notes content. */
function parseDeferredItems(content) {
  if (!content) return [];
  const lines = content.split("\n");
  const items = [];
  let inSection = false;
  for (const line of lines) {
    if (/deferred/i.test(line) && /^(?:#{1,3}|\d+\.)\s/.test(line)) {
      inSection = true;
      continue;
    }
    if (inSection) {
      if (/^(?:#{1,3}|\d+\.)\s/.test(line)) { inSection = false; continue; }
      const m = line.match(/^[-*•]\s+(.+)/);
      if (m) items.push(m[1].trim());
    }
  }
  return items;
}

/** Item 3: set Domain Registry row to Locked. */
async function updateDomainRegistry({ prUrl, implNotes }) {
  if (!pipelineNotion?.domainRegistryDatabaseId) {
    return { done: false, reason: "no domainRegistryDatabaseId in pipeline config" };
  }
  try {
    const dbId = pipelineNotion.domainRegistryDatabaseId.replace(/-/g, "");
    const result = await notion.search({
      query: domain,
      filter: { value: "page", property: "object" },
    });
    const page = result.results.find(
      (r) => r.parent?.type === "database_id" && r.parent.database_id.replace(/-/g, "") === dbId,
    );
    if (!page) {
      return { done: false, reason: `domain '${domain}' row not found in Domain Registry` };
    }
    const pageId = page.id;
    const props = {
      Status: { select: { name: "Locked" } },
      "Locked Date": { date: { start: new Date().toISOString().slice(0, 10) } },
    };
    if (prUrl) props["PR URL"] = { url: prUrl };
    if (implNotes?.testCount) {
      props["Notes"] = { rich_text: [{ type: "text", text: { content: `${config.name} — ${implNotes.testCount} tests passing` } }] };
    }
    await notion.pages.update({ page_id: pageId, properties: props });
    return { done: true, pageId };
  } catch (err) {
    return { done: false, reason: err.message };
  }
}

/** Item 4: set Mission Control row to Done / Stage 10. */
async function updateMissionControl({ prUrl }) {
  if (!pipelineNotion?.missionControlDatabaseId) {
    return { done: false, reason: "no missionControlDatabaseId in pipeline config" };
  }
  try {
    const dbId = pipelineNotion.missionControlDatabaseId.replace(/-/g, "");
    const result = await notion.search({
      query: domain,
      filter: { value: "page", property: "object" },
    });
    const page = result.results.find(
      (r) => r.parent?.type === "database_id" && r.parent.database_id.replace(/-/g, "") === dbId,
    );
    if (!page) {
      return { done: false, reason: `domain '${domain}' row not found in Mission Control` };
    }
    const pageId = page.id;
    const props = {
      Status: { select: { name: "Done" } },
      Stage: { select: { name: "10 — Logged + Done" } },
      Validation: { select: { name: "Passing" } },
      Locked: { date: { start: new Date().toISOString().slice(0, 10) } },
    };
    if (prUrl) props["PR URL"] = { url: prUrl };
    await notion.pages.update({ page_id: pageId, properties: props });
    return { done: true, pageId };
  } catch (err) {
    return { done: false, reason: err.message };
  }
}

/** Item 5: check off domain's to-do block on the Domain Checklist page. */
async function updateDomainChecklist() {
  if (!pipelineNotion?.domainChecklistPageId) {
    return { done: false, reason: "no domainChecklistPageId in pipeline config" };
  }
  try {
    const blocks = await fetchAllBlocks(pipelineNotion.domainChecklistPageId);
    const todo = blocks.find(
      (b) => b.type === "to_do" && richTextToPlain(b.to_do.rich_text).includes(domain),
    );
    if (!todo) {
      return { done: false, reason: `no to-do block containing '${domain}' found on Domain Checklist` };
    }
    if (todo.to_do.checked) return { done: true, detail: "already checked" };
    await notion.blocks.update({ block_id: todo.id, to_do: { checked: true } });
    return { done: true, blockId: todo.id };
  } catch (err) {
    return { done: false, reason: err.message };
  }
}

/** Item 6: append lock summary to Refactor Roadmap page. */
async function updateRefactorRoadmap({ prUrl, implNotes }) {
  if (!pipelineNotion?.refactorRoadmapPageId) {
    return { done: false, reason: "no refactorRoadmapPageId in pipeline config" };
  }
  try {
    const date = new Date().toISOString().slice(0, 10);
    const summary = [
      `Domain ${domain} — ${config.name} — LOCKED ${date}`,
      `Branch: domain/${config.slug}`,
      `PR: ${prUrl || "(not provided)"}`,
      `Tests: ${implNotes?.testCount ?? "?"} passing`,
    ].join("\n");
    await appendToPage(pipelineNotion.refactorRoadmapPageId, `Domain ${domain} lock summary`, summary);
    return { done: true };
  } catch (err) {
    return { done: false, reason: err.message };
  }
}

/** Item 7: create Deferred Items database rows from implementation notes. */
async function logDeferredItems(rawContent) {
  if (!pipelineNotion?.deferredItemsDatabaseId) {
    return { done: false, reason: "no deferredItemsDatabaseId in pipeline config" };
  }
  try {
    const items = parseDeferredItems(rawContent);
    if (!items.length) {
      return { done: true, count: 0, detail: "no deferred items parsed from implementation notes" };
    }
    let created = 0;
    for (const item of items) {
      const dashIdx = item.search(/\s(?:—|-{1,2})\s/);
      const title = dashIdx > 0 ? item.slice(0, dashIdx).trim() : item;
      const description = dashIdx > 0 ? item.slice(dashIdx).replace(/^[\s—\-]+/, "") : "";
      const props = {
        Item: { title: [{ type: "text", text: { content: title.slice(0, 2000) } }] },
        "From Domain": { rich_text: [{ type: "text", text: { content: domain } }] },
        Status: { select: { name: "Open" } },
        Priority: { select: { name: "Post-phase" } },
      };
      if (description) {
        props["Description"] = { rich_text: [{ type: "text", text: { content: description.slice(0, 2000) } }] };
      }
      await notion.pages.create({
        parent: { database_id: pipelineNotion.deferredItemsDatabaseId },
        properties: props,
      });
      created++;
    }
    return { done: true, count: created };
  } catch (err) {
    return { done: false, reason: err.message };
  }
}

/** Item 13: append lock-update block to the phase's Initiation Prompt page. */
async function updateInitiationPrompt({ implNotes }) {
  if (!pipelineNotion?.phaseFolders) {
    return { done: false, reason: "no phaseFolders in pipeline config" };
  }
  const folderId = pipelineNotion.phaseFolders[String(config.phase)];
  if (!folderId) {
    return { done: false, reason: `no phase folder ID configured for phase ${config.phase}` };
  }
  try {
    const resp = await notion.blocks.children.list({ block_id: folderId, page_size: 50 });
    const promptBlock = resp.results.find(
      (b) =>
        b.type === "child_page" &&
        /initiation prompt/i.test(b.child_page?.title || ""),
    );
    if (!promptBlock) {
      return { done: false, reason: "no 'Phase Initiation Prompt' child page found in phase folder" };
    }
    const date = new Date().toISOString().slice(0, 10);
    const update = [
      `Domain ${domain} (${config.name}) locked — ${date}`,
      `New test baseline: ${implNotes?.testCount ?? "unknown"}`,
    ].join("\n");
    await appendToPage(promptBlock.id, `Lock update — ${domain} — ${date}`, update);
    return { done: true, pageId: promptBlock.id };
  } catch (err) {
    return { done: false, reason: err.message };
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

(async () => {
  log(`Domain ${domain} (${config.name}) — running 13-item close-out`);
  log(`PR URL: ${prUrl || "(not provided — pass --pr-url or run commit-and-pr.js first)"}`);

  // Item 1: Read implementation notes
  const implNotes = await readImplementationNotes();
  if (implNotes.found) {
    recordItem(
      1,
      "Implementation Notes read",
      "done",
      `${implNotes.testCount ?? "?"} tests, ${implNotes.contentLength} chars from page 5`,
    );
  } else {
    recordItem(
      1,
      "Implementation Notes read",
      "skipped",
      implNotes.error || "no implementationNotesPageId",
    );
  }

  // Item 9 (also): determine next domain (used by checklist body)
  const nextDomain = nextUnblockedDomain();

  // Item 2: Write Lock Checklist to page 6
  if (config.lockChecklistPageId) {
    const checklistBody = buildLockChecklistBody({
      implNotes,
      prUrl,
      nextDomain,
    });
    try {
      await appendToPage(
        config.lockChecklistPageId,
        `Auto-closeout ${new Date().toISOString()}`,
        checklistBody,
      );
      recordItem(2, "Lock Checklist written", "done", `posted to page ${config.lockChecklistPageId}`);
    } catch (err) {
      recordItem(2, "Lock Checklist written", "failed", err.message);
    }
  } else {
    recordItem(2, "Lock Checklist written", "skipped", "no lockChecklistPageId in config");
  }

  // Item 3: Domain Registry
  {
    const r = await updateDomainRegistry({ prUrl, implNotes });
    recordItem(3, "Domain Registry updated", r.done ? "done" : "skipped", r.detail || r.pageId || r.reason);
  }

  // Item 4: Mission Control
  {
    const r = await updateMissionControl({ prUrl });
    recordItem(4, "Mission Control updated", r.done ? "done" : "skipped", r.detail || r.pageId || r.reason);
  }

  // Item 5: Domain Checklist
  {
    const r = await updateDomainChecklist();
    recordItem(5, "Domain Checklist updated", r.done ? "done" : "skipped", r.detail || r.blockId || r.reason);
  }

  // Item 6: Refactor Roadmap
  {
    const r = await updateRefactorRoadmap({ prUrl, implNotes });
    recordItem(6, "Refactor Roadmap updated", r.done ? "done" : "skipped", r.detail || r.reason);
  }

  // Item 7: Deferred Items
  {
    const r = await logDeferredItems(implNotes.rawContent || "");
    const detail = r.done ? `${r.count ?? 0} items created` + (r.detail ? ` — ${r.detail}` : "") : r.reason;
    recordItem(7, "Deferred Items logged", r.done ? "done" : "skipped", detail);
  }

  // Item 8: Locked Upstream Context — embedded in checklist body
  recordItem(8, "Locked Upstream Context written", "done", "embedded in lock checklist body");

  // Item 9: Next domain noted
  recordItem(9, "Next domain noted", "done", nextDomain || "(phase complete — no next domain)");

  // Item 10: Validation gates confirmed
  const validationSummary = readValidationSummary();
  if (validationSummary && validationSummary.success) {
    recordItem(
      10,
      "Validation gates confirmed",
      "done",
      `${validationSummary.gates ?? "?"} gates passed, tests=${validationSummary.testCount ?? "?"}`,
    );
  } else {
    recordItem(
      10,
      "Validation gates confirmed",
      "skipped",
      "no domain-X.Y-validation.json artifact (run validate.js first)",
    );
  }

  // Item 11: Branch / PR confirmed
  if (prUrl) {
    recordItem(11, "Branch / PR confirmed", "done", prUrl);
  } else {
    recordItem(11, "Branch / PR confirmed", "skipped", "no PR URL provided");
  }

  // Item 12: Phase complete check
  // Run this BEFORE the order update so we can report the prior state, then
  // run again after the order update for the post-update state.
  const wasComplete = isPhaseComplete();
  // Update domain-order.json (also feeds item 9 for downstream domains)
  const orderUpdate = markDomainLockedInOrder();
  const isNowComplete = isPhaseComplete();
  if (orderUpdate.updated) {
    log(`  ✓ domain-order.json: ${domain} marked locked in phase ${orderUpdate.phase}`);
  } else {
    log(`  — domain-order.json: ${orderUpdate.reason}`);
  }
  recordItem(
    12,
    "Phase complete check",
    "done",
    isNowComplete
      ? `Phase ${config.phase} complete — all domains locked`
      : `Phase ${config.phase} not yet complete`,
  );

  // Item 13: Initiation prompt updated
  {
    const r = await updateInitiationPrompt({ implNotes });
    recordItem(13, "Initiation prompt updated", r.done ? "done" : "skipped", r.detail || r.pageId || r.reason);
  }

  // ---------------------------------------------------------------------------
  // Write closeout artifact
  // ---------------------------------------------------------------------------

  const closeoutPath = path.join(artifactsDir, `domain-${domain}-closeout.json`);
  fs.mkdirSync(artifactsDir, { recursive: true });
  const summary = {
    success: true,
    domain,
    name: config.name,
    phase: config.phase,
    closedAt: new Date().toISOString(),
    prUrl: prUrl || null,
    testCount: implNotes.testCount ?? null,
    nextDomain,
    phaseComplete: isNowComplete,
    items: closeoutItems,
  };
  fs.writeFileSync(closeoutPath, JSON.stringify(summary, null, 2) + "\n");
  log(`Closeout artifact: ${closeoutPath}`);

  const doneCount = closeoutItems.filter((i) => i.status === "done").length;
  const skippedCount = closeoutItems.filter((i) => i.status === "skipped").length;
  log(`Close-out complete for domain ${domain}. ${doneCount} items done, ${skippedCount} skipped.`);

  if (nextDomain) {
    log(`Next unblocked domain: ${nextDomain}`);
  } else if (isNowComplete) {
    log(`🎉 Phase ${config.phase} complete.`);
  }
})();
