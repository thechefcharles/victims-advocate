#!/usr/bin/env node
/**
 * Auto Pipeline 2.0 — fetch-prompt.js
 *
 * Reads a Notion page (analysis prompt or execution prompt) for a given
 * domain and prints its plain-text content to stdout. Also writes a copy
 * to /tmp/nxtstps-current-prompt.txt for downstream scripts.
 *
 * Usage:
 *   node scripts/fetch-prompt.js --domain 2.1 --stage analysis
 *
 * Requires: NOTION_API_KEY environment variable
 *
 * Notion block types handled:
 *   paragraph, code, heading_1/2/3, bulleted_list_item, numbered_list_item,
 *   quote, callout, divider, to_do, toggle.
 *
 * Code blocks are critical — that's where the prompts live.
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
    else if (argv[i] === "--stage") args.stage = argv[++i];
  }
  return args;
}

const { domain, stage } = parseArgs(process.argv.slice(2));

if (!domain || !stage) {
  console.error("Usage: node scripts/fetch-prompt.js --domain X.Y --stage analysis");
  console.error("Example: node scripts/fetch-prompt.js --domain 2.1 --stage analysis");
  process.exit(1);
}

if (stage !== "analysis") {
  console.error(`Error: --stage must be 'analysis', got '${stage}'`);
  process.exit(1);
}

if (!process.env.NOTION_API_KEY) {
  console.error("Error: NOTION_API_KEY environment variable not set");
  console.error("Add to ~/.zshrc: export NOTION_API_KEY=secret_...");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Load domain config
// ---------------------------------------------------------------------------

const configPath = path.join(__dirname, "..", "config", "domain-pages.json");
let domainPages;
try {
  domainPages = JSON.parse(fs.readFileSync(configPath, "utf8"));
} catch (err) {
  console.error(`Error reading ${configPath}: ${err.message}`);
  process.exit(1);
}

const config = domainPages[domain];
if (!config) {
  console.error(`Error: Domain '${domain}' not found in config/domain-pages.json`);
  console.error(`Available domains: ${Object.keys(domainPages).join(", ")}`);
  process.exit(1);
}

const stageMap = {
  analysis: config.analysisPromptPageId,
};

const pageId = stageMap[stage];
if (!pageId) {
  console.error(`Error: Domain ${domain} has no ${stage}PromptPageId configured`);
  console.error(`(Phase 0 and Phase 1 domains predate the pipeline and have no Notion pages.)`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Notion block extraction
// ---------------------------------------------------------------------------

const notion = new Client({ auth: process.env.NOTION_API_KEY });

/** Extracts plain text from a rich_text array. */
function richTextToPlain(richText) {
  if (!Array.isArray(richText)) return "";
  return richText.map((t) => t.plain_text || "").join("");
}

/**
 * Converts a single Notion block to plain text. Returns empty string for
 * unrecognized types so they don't break the output.
 */
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
      // Unknown / unsupported type — emit empty so output is clean
      return "";
  }
}

/**
 * Recursively fetches all child blocks of a page or block, paginating as
 * needed. Returns a flat array of blocks in document order.
 */
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

/**
 * Walks the block tree and emits a flat plain-text string. Recurses into
 * children when block.has_children is true so nested code blocks under
 * toggles or callouts are not lost.
 */
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
// Main
// ---------------------------------------------------------------------------

(async () => {
  try {
    const blocks = await fetchAllBlocks(pageId);
    const content = await blocksToText(blocks);

    // Write to temp file for downstream scripts
    const tmpPath = "/tmp/nxtstps-current-prompt.txt";
    fs.writeFileSync(tmpPath, content);

    // Print to stdout
    process.stdout.write(content);
    if (!content.endsWith("\n")) process.stdout.write("\n");
  } catch (err) {
    console.error(`fetch-prompt failed: ${err.message}`);
    process.exit(1);
  }
})();
