#!/usr/bin/env node
/**
 * Auto Pipeline 2.0 — generate-execution-prompt.js
 *
 * Replaces the manual "review Domain X.Y analysis" step that previously ran
 * at claude.ai. Reads the analysis output from Notion page 3 for a domain,
 * sends it through the Anthropic API with the architectural reviewer system
 * prompt, and posts the resulting execution prompt to Notion page 4.
 *
 * Usage:
 *   node scripts/generate-execution-prompt.js --domain 3.1
 *   node scripts/generate-execution-prompt.js --domain 3.1 --dry-run
 *
 * --dry-run: fetches the analysis + calls the API + writes the artifact,
 *            but does NOT post to Notion page 4. Useful for testing the
 *            review prompt without polluting the page.
 *
 * Requires:
 *   NOTION_API_KEY     — for the Notion fetch + (non-dry-run) post
 *   ANTHROPIC_API_KEY  — for the model call
 *
 * Reads:
 *   config/domain-pages.json
 *   config/prompt-templates/execution-review.txt
 *
 * Writes:
 *   artifacts/domain-X.Y-execution-prompt.txt
 */

const fs = require("fs");
const path = require("path");
const { Client } = require("@notionhq/client");
const Anthropic = require("@anthropic-ai/sdk");

// ---------------------------------------------------------------------------
// CLI parsing
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--domain") args.domain = argv[++i];
    else if (argv[i] === "--dry-run") args.dryRun = true;
  }
  return args;
}

const { domain, dryRun } = parseArgs(process.argv.slice(2));

if (!domain) {
  console.error(
    "Usage: node scripts/generate-execution-prompt.js --domain X.Y [--dry-run]",
  );
  console.error("Example: node scripts/generate-execution-prompt.js --domain 3.1");
  process.exit(1);
}

if (!process.env.NOTION_API_KEY) {
  console.error("Error: NOTION_API_KEY environment variable not set");
  process.exit(1);
}

if (!process.env.ANTHROPIC_API_KEY) {
  console.error("Error: ANTHROPIC_API_KEY environment variable not set");
  console.error("Add to ~/.zshrc: export ANTHROPIC_API_KEY=sk-ant-...");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const repoRoot = path.resolve(__dirname, "..");
const artifactsDir = path.join(repoRoot, "artifacts");

function fail(msg) {
  console.error(`[generate-execution-prompt] FAILED: ${msg}`);
  process.exit(1);
}

function log(msg) {
  console.log(`[generate-execution-prompt] ${msg}`);
}

// ---------------------------------------------------------------------------
// Load config and system prompt
// ---------------------------------------------------------------------------

const configPath = path.join(repoRoot, "config", "domain-pages.json");
let domainPages;
try {
  domainPages = JSON.parse(fs.readFileSync(configPath, "utf8"));
} catch (err) {
  fail(`cannot read ${configPath}: ${err.message}`);
}

const config = domainPages[domain];
if (!config) {
  fail(
    `domain '${domain}' not found in domain-pages.json. ` +
      `Available: ${Object.keys(domainPages).join(", ")}`,
  );
}

if (!config.analysisOutputPageId) {
  fail(`domain ${domain} has no analysisOutputPageId — analysis not yet posted`);
}
if (!dryRun && !config.executionPromptPageId) {
  fail(`domain ${domain} has no executionPromptPageId — cannot post result`);
}

const systemPromptPath = path.join(
  repoRoot,
  "config",
  "prompt-templates",
  "execution-review.txt",
);
let systemPrompt;
try {
  systemPrompt = fs.readFileSync(systemPromptPath, "utf8");
} catch (err) {
  fail(`cannot read ${systemPromptPath}: ${err.message}`);
}

// ---------------------------------------------------------------------------
// Notion fetch (same block-extraction pattern as fetch-prompt.js)
// ---------------------------------------------------------------------------

const notion = new Client({ auth: process.env.NOTION_API_KEY });

function richTextToPlain(richText) {
  if (!Array.isArray(richText)) return "";
  return richText.map((t) => t.plain_text || "").join("");
}

function blockToText(block) {
  switch (block.type) {
    case "paragraph":
      return richTextToPlain(block.paragraph.rich_text);
    case "heading_1":
      return "# " + richTextToPlain(block.heading_1.rich_text);
    case "heading_2":
      return "## " + richTextToPlain(block.heading_2.rich_text);
    case "heading_3":
      return "### " + richTextToPlain(block.heading_3.rich_text);
    case "bulleted_list_item":
      return "- " + richTextToPlain(block.bulleted_list_item.rich_text);
    case "numbered_list_item":
      return "1. " + richTextToPlain(block.numbered_list_item.rich_text);
    case "to_do": {
      const checked = block.to_do.checked ? "[x]" : "[ ]";
      return `- ${checked} ` + richTextToPlain(block.to_do.rich_text);
    }
    case "toggle":
      return richTextToPlain(block.toggle.rich_text);
    case "quote":
      return "> " + richTextToPlain(block.quote.rich_text);
    case "callout":
      return "> " + richTextToPlain(block.callout.rich_text);
    case "code":
      return richTextToPlain(block.code.rich_text);
    case "divider":
      return "---";
    default:
      return "";
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
// Notion post (mirrors post-notion-output.js chunking + heading)
// ---------------------------------------------------------------------------

async function postToNotionPage(pageId, content) {
  const chunks = [];
  for (let i = 0; i < content.length; i += 1900) {
    chunks.push(content.slice(i, i + 1900));
  }
  const children = [
    {
      type: "heading_3",
      heading_3: {
        rich_text: [
          {
            type: "text",
            text: {
              content: `Auto-posted by generate-execution-prompt.js: ${new Date().toISOString()}`,
            },
          },
        ],
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
// Main
// ---------------------------------------------------------------------------

(async () => {
  log(`Domain ${domain} (${config.name}) — ${dryRun ? "DRY RUN" : "LIVE"}`);

  // 1. Fetch analysis output from Notion page 3
  log(`Fetching analysis from Notion page ${config.analysisOutputPageId}...`);
  let analysisContent;
  try {
    const blocks = await fetchAllBlocks(config.analysisOutputPageId);
    analysisContent = await blocksToText(blocks);
  } catch (err) {
    fail(`Notion fetch failed: ${err.message}`);
  }

  if (!analysisContent || analysisContent.trim().length < 100) {
    fail(
      `analysis output is empty or too short (${analysisContent?.length || 0} chars). ` +
        `Has the analysis been posted to page 3 yet?`,
    );
  }
  log(`  ✓ fetched ${analysisContent.length} characters`);

  // 2. Call Anthropic API
  const ANTHROPIC_MODEL = "claude-sonnet-4-6";
  const ANTHROPIC_MAX_TOKENS = 32000;
  log(`Calling Anthropic API (${ANTHROPIC_MODEL}, max_tokens=${ANTHROPIC_MAX_TOKENS})...`);
  const client = new Anthropic();
  let executionPrompt = "";
  let stopReason = "unknown";
  let inputTokens = 0;
  let outputTokens = 0;
  try {
    const stream = await client.messages.stream({
      model: ANTHROPIC_MODEL,
      max_tokens: ANTHROPIC_MAX_TOKENS,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Review this analysis for Domain ${domain} — ${config.name} and generate the complete execution prompt.\n\n${analysisContent}`,
        },
      ],
    });
    const response = await stream.finalMessage();
    executionPrompt = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    stopReason = response.stop_reason ?? "unknown";
    inputTokens = response.usage?.input_tokens ?? 0;
    outputTokens = response.usage?.output_tokens ?? 0;
  } catch (err) {
    fail(`Anthropic API call failed: ${err.message}`);
  }

  if (!executionPrompt || executionPrompt.trim().length < 100) {
    fail(`Anthropic returned empty or trivial response (${executionPrompt.length} chars)`);
  }
  log(`  ✓ received ${executionPrompt.length} characters`);
  log(
    `  ✓ usage: input=${inputTokens}, output=${outputTokens}, stop_reason=${stopReason}`,
  );

  // 3. Write artifact
  fs.mkdirSync(artifactsDir, { recursive: true });
  const artifactPath = path.join(artifactsDir, `domain-${domain}-execution-prompt.txt`);
  fs.writeFileSync(artifactPath, executionPrompt);
  log(`  ✓ artifact written: ${artifactPath}`);

  // 4. Post to Notion page 4 (skipped in dry-run)
  if (dryRun) {
    log("DRY RUN — skipping Notion post. First 500 chars of generated prompt:");
    console.log("---");
    console.log(executionPrompt.slice(0, 500));
    console.log("---");
    console.log(
      JSON.stringify({ success: true, domain, dryRun: true, length: executionPrompt.length }),
    );
    return;
  }

  log(`Posting execution prompt to Notion page ${config.executionPromptPageId}...`);
  try {
    await postToNotionPage(config.executionPromptPageId, executionPrompt);
  } catch (err) {
    fail(`Notion post failed: ${err.message}`);
  }
  log("  ✓ posted to Notion page 4");

  console.log(
    JSON.stringify({
      success: true,
      domain,
      dryRun: false,
      length: executionPrompt.length,
      artifactPath,
    }),
  );
})();
