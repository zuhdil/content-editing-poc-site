#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { merge } from "./lib/merge.mjs";
import { readSnapshot, writeSnapshot } from "./lib/snapshot.mjs";
import { readConflicts, writeConflicts, hasActiveConflicts } from "./lib/conflicts.mjs";
import { readContentRepo, writeContentRepoFiles } from "./lib/content-repo-io.mjs";
import { readYamlFile, writeYamlFile, flatten, unflatten } from "./lib/yaml-io.mjs";
import * as git from "./lib/git.mjs";
import { exportSchema } from "./export-schema.mjs";

function log(...args) { console.log("[sync]", ...args); }

/**
 * Pure-ish orchestrator entrypoint. Does git I/O via the git wrapper
 * (push is gated by SYNC_SKIP_PUSH), but takes paths as parameters
 * so it's trivially callable from tests.
 */
export async function runSync({ siteRoot, contentRepoPath }) {
  const SITE_CONTENT_DIR = join(siteRoot, "src/content");
  const YAML_PATH = join(SITE_CONTENT_DIR, "content.yml");
  const SCHEMA_PATH = join(SITE_CONTENT_DIR, "content.schema.json");
  const SNAPSHOT_PATH = join(SITE_CONTENT_DIR, "content.snapshot.json");
  const CONFLICTS_PATH = join(SITE_CONTENT_DIR, "content.conflicts.json");

  log(`site=${siteRoot}`);
  log(`content=${contentRepoPath}`);

  const schema = JSON.parse(readFileSync(SCHEMA_PATH, "utf8"));
  const schemaKeys = Object.keys(schema);

  // Gate: if there are unresolved conflicts, halt cleanly.
  const conflictsBefore = readConflicts(CONFLICTS_PATH);
  if (hasActiveConflicts(conflictsBefore)) {
    log(`unresolved conflicts at: ${conflictsBefore.entries.map((e) => e.key).join(", ")}`);
    log("run `npm run content:resolve` to fix; halting.");
    return;
  }

  const snapshot = readSnapshot(SNAPSHOT_PATH);
  const yaml = readYamlFile(YAML_PATH);
  const contentRepo = readContentRepo(contentRepoPath, schema);

  const result = merge({ snapshot, contentRepo, yaml, schemaKeys });

  if (result.conflicts.length > 0) {
    log(`conflicts on: ${result.conflicts.map((c) => c.key).join(", ")}`);
    // Roll the conflicting keys in content.yml back to their last-agreed
    // (snapshot) value before committing. Deploy fires on every push to
    // main, so without this the conflicting yaml-side edit would stay live
    // on the site until a human resolved it. Rolling back means the deploy
    // triggered by this commit republishes the previous agreed content.
    // Keys with no prior agreed value (bootstrap conflicts) are left as-is —
    // there is nothing to roll back to.
    const yamlFlat = flatten(yaml);
    for (const c of result.conflicts) {
      if (c.snapshotValue != null) yamlFlat[c.key] = c.snapshotValue;
    }
    writeYamlFile(YAML_PATH, unflatten(yamlFlat));
    writeConflicts(CONFLICTS_PATH, result.conflicts);
    writeSnapshot(SNAPSHOT_PATH, result.newSnapshot);
    if (git.hasChanges(siteRoot)) {
      git.add(siteRoot, [YAML_PATH, SNAPSHOT_PATH, CONFLICTS_PATH]);
      git.commit(siteRoot, "Record content conflicts and hold yaml at last agreed value");
      git.push(siteRoot);
    }
    await openConflictIssue(result.conflicts);
    return;
  }

  let siteChanged = false;
  let contentChanged = false;

  const yamlBeforeText = readFileSync(YAML_PATH, "utf8");
  writeYamlFile(YAML_PATH, result.newYaml);
  if (readFileSync(YAML_PATH, "utf8") !== yamlBeforeText) siteChanged = true;

  const snapBeforeText = readFileSync(SNAPSHOT_PATH, "utf8");
  writeSnapshot(SNAPSHOT_PATH, result.newSnapshot);
  if (readFileSync(SNAPSHOT_PATH, "utf8") !== snapBeforeText) siteChanged = true;

  if (result.contentRepoWrites.length > 0) {
    writeContentRepoFiles(contentRepoPath, schema, result.contentRepoWrites);
    contentChanged = true;
  }

  exportSchema(siteRoot, contentRepoPath);
  if (git.hasChanges(contentRepoPath)) contentChanged = true;

  if (siteChanged) {
    git.add(siteRoot, [YAML_PATH, SNAPSHOT_PATH]);
    git.commit(siteRoot, "Sync content from content repo");
    git.push(siteRoot);
  } else {
    log("no site-side changes");
  }

  if (contentChanged) {
    git.add(contentRepoPath, ["."]);
    git.commit(contentRepoPath, "Sync content from dashboard yaml");
    git.push(contentRepoPath);
  } else {
    log("no content-repo changes");
  }
}

async function openConflictIssue(conflicts) {
  if (!process.env.GH_TOKEN && !process.env.GITHUB_TOKEN) {
    log("no GH_TOKEN/GITHUB_TOKEN, skipping issue creation");
    return;
  }
  const body = [
    "Content sync detected conflicting edits on the keys below.",
    "",
    ...conflicts.map((c) => [
      `### \`${c.key}\``,
      "",
      "| side | value |",
      "|------|-------|",
      `| snapshot     | \`${escapeMd(c.snapshotValue)}\` |`,
      `| content repo | \`${escapeMd(c.contentRepoValue)}\` |`,
      `| yaml         | \`${escapeMd(c.yamlValue)}\` |`,
    ].join("\n")),
    "",
    "To resolve, in a checkout of the site repo:",
    "",
    "```",
    "git pull",
    "npm run content:resolve",
    "```",
    "",
    "The CLI will walk you through each conflict and produce a single resolution commit.",
  ].join("\n");
  try {
    execFileSync("gh", [
      "issue", "create",
      "--title", `Content sync conflicts: ${conflicts.map((c) => c.key).join(", ")}`,
      "--body", body,
    ], { stdio: "inherit", env: process.env });
  } catch (err) {
    log("gh issue create failed:", err.message);
  }
}

function escapeMd(s) {
  return String(s ?? "").replace(/`/g, "\\`").replace(/\n/g, "\\n").slice(0, 200);
}

// CLI shim — only runs when invoked directly via `node scripts/sync.mjs`.
const invokedAsScript = import.meta.url === `file://${process.argv[1]}`;
if (invokedAsScript) {
  const siteRoot = process.cwd();
  const contentRepoPath = process.env.CONTENT_REPO_PATH
    ? resolve(process.env.CONTENT_REPO_PATH)
    : resolve(siteRoot, "..", "content");
  runSync({ siteRoot, contentRepoPath }).catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
