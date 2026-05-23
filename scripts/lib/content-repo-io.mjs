import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

/**
 * Translate a dotted content key + its schema entry into the
 * relative path used inside the content repo. First segment is the
 * page folder; remaining segments stay dotted in the filename.
 */
export function pathForKey(key, schemaEntry) {
  const segments = key.split(".");
  if (segments.length < 2) {
    throw new Error(`Key must have at least two segments: ${key}`);
  }
  const folder = segments[0];
  const filename = segments.slice(1).join(".");
  const ext = schemaEntry.type === "markdown" ? "md" : "txt";
  return `${folder}/${filename}.${ext}`;
}

/**
 * Read the on-disk content repo into a flat key → value map.
 * Files are trimmed of trailing whitespace so newline differences
 * between editor commits don't manifest as spurious diffs.
 */
export function readContentRepo(repoPath, schema) {
  const out = {};
  for (const [key, entry] of Object.entries(schema)) {
    const file = join(repoPath, pathForKey(key, entry));
    if (!existsSync(file)) continue;
    out[key] = readFileSync(file, "utf8").replace(/\s+$/u, "");
  }
  return out;
}

/**
 * Write a list of [{ key, value }] entries into the content repo,
 * creating parent folders as needed. Always ends each file with a
 * single trailing newline so GitHub's web editor doesn't churn it.
 */
export function writeContentRepoFiles(repoPath, schema, writes) {
  for (const { key, value } of writes) {
    const entry = schema[key];
    if (!entry) throw new Error(`Unknown schema key: ${key}`);
    const file = join(repoPath, pathForKey(key, entry));
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, value.replace(/\s+$/u, "") + "\n");
  }
}
