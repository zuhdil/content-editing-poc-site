import { mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readConflicts, writeConflicts, hasActiveConflicts } from "../../scripts/lib/conflicts.mjs";

function tmp() {
  return mkdtempSync(join(tmpdir(), "conf-"));
}

const sample = [
  { key: "home.hero.title", snapshotValue: "A", contentRepoValue: "B", yamlValue: "C" },
];

describe("conflicts", () => {
  it("returns an empty entries list when the file does not exist", () => {
    const dir = tmp();
    const { entries } = readConflicts(join(dir, "missing.json"));
    expect(entries).toEqual([]);
  });

  it("reads an existing conflicts file", () => {
    const dir = tmp();
    const p = join(dir, "c.json");
    writeFileSync(p, JSON.stringify({ createdAt: "2026-05-23T00:00:00Z", entries: sample }));
    const out = readConflicts(p);
    expect(out.entries).toEqual(sample);
    expect(out.createdAt).toBe("2026-05-23T00:00:00Z");
  });

  it("writes a conflicts file with a fresh createdAt", () => {
    const dir = tmp();
    const p = join(dir, "c.json");
    writeConflicts(p, sample);
    const out = JSON.parse(readFileSync(p, "utf8"));
    expect(out.entries).toEqual(sample);
    expect(typeof out.createdAt).toBe("string");
    expect(Number.isNaN(Date.parse(out.createdAt))).toBe(false);
  });

  it("writes an empty entries array with a null createdAt when given []", () => {
    const dir = tmp();
    const p = join(dir, "c.json");
    writeConflicts(p, []);
    const out = JSON.parse(readFileSync(p, "utf8"));
    expect(out.entries).toEqual([]);
    expect(out.createdAt).toBeNull();
  });

  it("hasActiveConflicts is true iff entries.length > 0", () => {
    expect(hasActiveConflicts({ entries: [] })).toBe(false);
    expect(hasActiveConflicts({ entries: sample })).toBe(true);
    expect(hasActiveConflicts(null)).toBe(false);
  });
});
