#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Reads the site's content.schema.json and writes a sorted copy
 * to <contentRepoPath>/schema.json. The content repo's schema is
 * a flat key → constraints map — exactly the same shape, just
 * sorted by key for diff-stability.
 *
 * Invocation:
 *   node scripts/export-schema.mjs <contentRepoPath>
 *
 * Or programmatically: import { exportSchema } from "./export-schema.mjs".
 */

export function exportSchema(siteRoot, contentRepoPath) {
  const srcPath = join(siteRoot, "src/content/content.schema.json");
  const dstPath = join(contentRepoPath, "schema.json");
  const schema = JSON.parse(readFileSync(srcPath, "utf8"));
  const sorted = Object.fromEntries(
    Object.entries(schema).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
  writeFileSync(dstPath, JSON.stringify(sorted, null, 2) + "\n");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const target = process.argv[2];
  if (!target) {
    console.error("Usage: node scripts/export-schema.mjs <contentRepoPath>");
    process.exit(1);
  }
  exportSchema(process.cwd(), target);
  console.log(`Wrote ${target}/schema.json`);
}
