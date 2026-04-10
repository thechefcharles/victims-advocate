#!/usr/bin/env node
/**
 * Posts stdin content to a Notion page.
 * Usage: echo "content" | node scripts/post-notion-output.js <page-id>
 * Requires: NOTION_API_KEY environment variable
 */

const { Client } = require("@notionhq/client");

const PAGE_ID = process.argv[2];

if (!PAGE_ID) {
  console.error("Usage: node scripts/post-notion-output.js <page-id>");
  console.error("Example: node scripts/post-notion-output.js 339f6ea8...");
  process.exit(1);
}

if (!process.env.NOTION_API_KEY) {
  console.error("Error: NOTION_API_KEY environment variable not set");
  console.error("Add to ~/.zshrc: export NOTION_API_KEY=secret_...");
  process.exit(1);
}

const notion = new Client({ auth: process.env.NOTION_API_KEY });

let input = "";
process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  input += chunk;
});
process.stdin.on("end", async () => {
  if (!input.trim()) {
    console.error("Error: No input received on stdin");
    process.exit(1);
  }

  // Split into 1900-char chunks (Notion block limit is 2000)
  const chunks = [];
  for (let i = 0; i < input.length; i += 1900) {
    chunks.push(input.slice(i, i + 1900));
  }

  const children = [
    {
      type: "heading_3",
      heading_3: {
        rich_text: [
          {
            type: "text",
            text: { content: `Auto-posted: ${new Date().toISOString()}` },
          },
        ],
      },
    },
    ...chunks.map((chunk) => ({
      type: "paragraph",
      paragraph: {
        rich_text: [{ type: "text", text: { content: chunk } }],
      },
    })),
  ];

  try {
    await notion.blocks.children.append({
      block_id: PAGE_ID,
      children,
    });
    console.log(`✅ Analysis posted to Notion page ${PAGE_ID}`);
    console.log('Go to claude.ai and say: "review Domain X.Y analysis"');
  } catch (err) {
    console.error("Failed to post to Notion:", err.message);
    process.exit(1);
  }
});
