import { existsSync, readFileSync, writeFileSync } from "node:fs";

export function readConflicts(path) {
  if (!existsSync(path)) return { createdAt: null, entries: [] };
  const text = readFileSync(path, "utf8").trim();
  if (text === "") return { createdAt: null, entries: [] };
  const parsed = JSON.parse(text);
  return {
    createdAt: parsed.createdAt ?? null,
    entries: Array.isArray(parsed.entries) ? parsed.entries : [],
  };
}

export function writeConflicts(path, entries) {
  const payload = {
    createdAt: entries.length > 0 ? new Date().toISOString() : null,
    entries,
  };
  writeFileSync(path, JSON.stringify(payload, null, 2) + "\n");
}

export function hasActiveConflicts(conflicts) {
  return !!(conflicts && Array.isArray(conflicts.entries) && conflicts.entries.length > 0);
}
