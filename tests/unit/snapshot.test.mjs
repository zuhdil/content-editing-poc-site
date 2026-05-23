import { mkdtempSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readSnapshot, writeSnapshot } from "../../scripts/lib/snapshot.mjs";

function tmp() {
  return mkdtempSync(join(tmpdir(), "snap-"));
}

describe("snapshot", () => {
  it("returns {} when the file does not exist", () => {
    const dir = tmp();
    expect(readSnapshot(join(dir, "missing.json"))).toEqual({});
  });

  it("returns {} when the file is empty / whitespace", () => {
    const dir = tmp();
    const p = join(dir, "snap.json");
    writeFileSync(p, "");
    expect(readSnapshot(p)).toEqual({});
  });

  it("reads a populated snapshot", () => {
    const dir = tmp();
    const p = join(dir, "snap.json");
    writeFileSync(p, JSON.stringify({ "a.b": "x", "c.d": "y" }));
    expect(readSnapshot(p)).toEqual({ "a.b": "x", "c.d": "y" });
  });

  it("writes a stable, sorted JSON", () => {
    const dir = tmp();
    const p = join(dir, "snap.json");
    writeSnapshot(p, { "c.d": "y", "a.b": "x" });
    const text = readFileSync(p, "utf8");
    expect(text).toBe("{\n  \"a.b\": \"x\",\n  \"c.d\": \"y\"\n}\n");
  });

  it("round-trips", () => {
    const dir = tmp();
    const p = join(dir, "snap.json");
    const input = { foo: "bar", baz: "qux" };
    writeSnapshot(p, input);
    expect(existsSync(p)).toBe(true);
    expect(readSnapshot(p)).toEqual(input);
  });
});
