import { existsSync, readFileSync, writeFileSync } from "node:fs";

export function readSnapshot(path) {
  if (!existsSync(path)) return {};
  const text = readFileSync(path, "utf8").trim();
  if (text === "") return {};
  return JSON.parse(text);
}

export function writeSnapshot(path, snapshot) {
  // Stable, sorted output so commits diff cleanly.
  const sorted = Object.fromEntries(
    Object.entries(snapshot).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)),
  );
  writeFileSync(path, JSON.stringify(sorted, null, 2) + "\n");
}
