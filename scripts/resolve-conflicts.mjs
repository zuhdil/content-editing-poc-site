#!/usr/bin/env node
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { join } from "node:path";
import { readConflicts, writeConflicts, hasActiveConflicts } from "./lib/conflicts.mjs";
import { readYamlFile, writeYamlFile } from "./lib/yaml-io.mjs";
import { applyChoices } from "./lib/resolve-core.mjs";
import * as git from "./lib/git.mjs";

const siteRoot = process.cwd();
const SITE_CONTENT_DIR = join(siteRoot, "src/content");
const YAML_PATH = join(SITE_CONTENT_DIR, "content.yml");
const CONFLICTS_PATH = join(SITE_CONTENT_DIR, "content.conflicts.json");

async function main() {
  const conflicts = readConflicts(CONFLICTS_PATH);
  if (!hasActiveConflicts(conflicts)) {
    console.log("No conflicts to resolve.");
    return;
  }

  const rl = createInterface({ input: stdin, output: stdout });

  const choices = {};
  let i = 0;
  for (const entry of conflicts.entries) {
    i += 1;
    console.log("");
    console.log(`Conflict ${i} of ${conflicts.entries.length} — ${entry.key}`);
    console.log("");
    console.log(`  [s] snapshot value:     ${JSON.stringify(entry.snapshotValue)}`);
    console.log(`  [c] content repo value: ${JSON.stringify(entry.contentRepoValue)}`);
    console.log(`  [y] yaml value:         ${JSON.stringify(entry.yamlValue)}`);
    console.log(`  [t] type a custom value`);
    console.log(`  [q] quit (discard all selections from this run)`);
    console.log("");

    let answer = "";
    while (!["s", "c", "y", "t", "q"].includes(answer)) {
      answer = (await rl.question("Choice [s/c/y/t/q]: ")).trim().toLowerCase();
    }

    if (answer === "q") {
      rl.close();
      console.log("Aborted. No files written.");
      return;
    }

    if (answer === "s") choices[entry.key] = entry.snapshotValue ?? "";
    if (answer === "c") choices[entry.key] = entry.contentRepoValue;
    if (answer === "y") choices[entry.key] = entry.yamlValue;
    if (answer === "t") {
      console.log("Type the custom value. Finish with a line containing only 'EOF'.");
      const lines = [];
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const line = await rl.question("> ");
        if (line === "EOF") break;
        lines.push(line);
      }
      choices[entry.key] = lines.join("\n");
    }
  }

  rl.close();

  const yaml = readYamlFile(YAML_PATH);
  const updated = applyChoices(yaml, choices);
  writeYamlFile(YAML_PATH, updated);
  writeConflicts(CONFLICTS_PATH, []);

  const keys = Object.keys(choices);
  git.add(siteRoot, [YAML_PATH, CONFLICTS_PATH]);
  const message = [
    "Resolve content conflicts",
    "",
    `Resolved keys: ${keys.join(", ")}`,
  ].join("\n");
  git.commit(siteRoot, message);
  git.push(siteRoot);

  console.log("");
  console.log(`Resolved ${keys.length} conflict(s). Committed and pushed.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
