import fs from "fs";
import path from "path";

const filePath = process.argv[2];
if (!filePath) {
  console.error("Usage: node generate-frontmatter.mjs <file>");
  process.exit(1);
}

const SLUG = path.basename(path.dirname(filePath));
const LANG = path.basename(filePath, ".md");
const FULL_TEXT = fs.readFileSync(filePath, "utf-8");

// ---------- parse existing frontmatter ----------
const FM_RE = /^---\n([\s\S]*?)\n---\n/;
const match = FULL_TEXT.match(FM_RE);

let existingFM = {};
let body = FULL_TEXT;

if (match) {
  const yamlBlock = match[1];
  body = FULL_TEXT.slice(match[0].length);
  // simple line-by-line YAML parse (handles flat key: value and tags: [a, b])
  for (const line of yamlBlock.split("\n")) {
    const kvMatch = line.match(/^(\w+):\s*(.+)$/);
    if (kvMatch) {
      let val = kvMatch[2].trim();
      // handle quoted strings
      if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
      if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
      // handle arrays [a, b, c]
      if (val.startsWith("[") && val.endsWith("]")) {
        val = val.slice(1, -1).split(",").map((s) => s.trim().replace(/^["']|["']$/g, ""));
      }
      existingFM[kvMatch[1]] = val;
    }
  }
}

// ---------- call GitHub Models API ----------
const PROMPT = `You are analyzing a technical article. Return ONLY valid JSON with these fields:
{
  "title": "the article title",
  "description": "a 1-2 sentence summary",
  "tags": ["tag1", "tag2"],
  "readTime": "X min",
  "slug": "url-friendly-slug"
}

Rules:
- title: compelling, descriptive. Max 80 chars.
- description: clear summary. Max 160 chars.
- tags: 2-5 relevant tags from: Architecture, Backend, Career, CSS, Database, DevOps, Docker, Frontend, Go, JavaScript, Kubernetes, MongoDB, NestJS, Next.js, Node.js, PostgreSQL, Python, React, Rust, Security, Testing, TypeScript, Vue, Web, Other.
- readTime: estimate based on ~200 words per minute. Format: "X min" or "X min".
- slug: lowercase, hyphens, based on title.

Article language: ${LANG}
Article content:

${body.slice(0, 8000)}`;

const response = await fetch(
  "https://models.inference.ai.azure.com/chat/completions",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GH_TOKEN}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: PROMPT }],
      temperature: 0.3,
      max_tokens: 500,
    }),
  }
);

if (!response.ok) {
  console.error(`API error: ${response.status} ${await response.text()}`);
  process.exit(1);
}

const result = await response.json();
const content = result.choices?.[0]?.message?.content;
if (!content) {
  console.error("No content in AI response:", JSON.stringify(result));
  process.exit(1);
}

// extract JSON from response (handle markdown-wrapped responses)
const jsonMatch = content.match(/\{[\s\S]*\}/);
if (!jsonMatch) {
  console.error("No JSON found in AI response:", content);
  process.exit(1);
}

const aiFM = JSON.parse(jsonMatch[0]);

// ---------- merge (manual title/description take priority) ----------
const merged = {
  title: existingFM.title || aiFM.title,
  description: existingFM.description || aiFM.description,
  date: existingFM.date || new Date().toISOString().split("T")[0],
  tags: existingFM.tags || aiFM.tags || [],
  readTime: existingFM.readTime || aiFM.readTime || "5 min",
  slug: existingFM.slug || aiFM.slug || SLUG,
};

// update "updated" field on every run
merged.updated = new Date().toISOString().split("T")[0];

// ---------- write file ----------
function toYAML(val) {
  if (Array.isArray(val)) return `[${val.map((s) => `"${s}"`).join(", ")}]`;
  if (typeof val === "string" && val.includes(":")) return `"${val}"`;
  return val;
}

const frontmatter = `---
title: ${merged.title}
description: ${merged.description}
date: ${merged.date}
updated: ${merged.updated}
tags: ${toYAML(merged.tags)}
readTime: ${merged.readTime}
slug: ${merged.slug}
---`;

fs.writeFileSync(filePath, `${frontmatter}\n${body.trim()}\n`);
console.log(`  -> wrote frontmatter: ${merged.title}`);
