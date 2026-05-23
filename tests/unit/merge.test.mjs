import { describe, expect, it } from "vitest";
import { merge } from "../../scripts/lib/merge.mjs";

const KEY = "home.hero.title";
const SCHEMA_KEYS = [KEY];

function run({ snapshot, contentRepo, yaml }) {
  return merge({
    snapshot,
    contentRepo,
    yaml: yaml === undefined ? {} : { home: { hero: { title: yaml } } },
    schemaKeys: SCHEMA_KEYS,
  });
}

describe("merge — single-key outcomes", () => {
  it("no change when all three are equal", () => {
    const r = run({ snapshot: { [KEY]: "A" }, contentRepo: { [KEY]: "A" }, yaml: "A" });
    expect(r.contentRepoWrites).toEqual([]);
    expect(r.conflicts).toEqual([]);
    expect(r.newSnapshot[KEY]).toBe("A");
    expect(r.newYaml.home.hero.title).toBe("A");
  });

  it("yaml won — content repo gets the yaml value", () => {
    const r = run({ snapshot: { [KEY]: "A" }, contentRepo: { [KEY]: "A" }, yaml: "C" });
    expect(r.contentRepoWrites).toEqual([{ key: KEY, value: "C" }]);
    expect(r.conflicts).toEqual([]);
    expect(r.newSnapshot[KEY]).toBe("C");
    expect(r.newYaml.home.hero.title).toBe("C");
  });

  it("content repo won — yaml gets the content value", () => {
    const r = run({ snapshot: { [KEY]: "A" }, contentRepo: { [KEY]: "B" }, yaml: "A" });
    expect(r.contentRepoWrites).toEqual([]);
    expect(r.conflicts).toEqual([]);
    expect(r.newSnapshot[KEY]).toBe("B");
    expect(r.newYaml.home.hero.title).toBe("B");
  });

  it("convergent change — both sides moved to the same value", () => {
    const r = run({ snapshot: { [KEY]: "A" }, contentRepo: { [KEY]: "B" }, yaml: "B" });
    expect(r.contentRepoWrites).toEqual([]);
    expect(r.conflicts).toEqual([]);
    expect(r.newSnapshot[KEY]).toBe("B");
    expect(r.newYaml.home.hero.title).toBe("B");
  });

  it("conflict — both sides diverged to different values", () => {
    const r = run({ snapshot: { [KEY]: "A" }, contentRepo: { [KEY]: "B" }, yaml: "C" });
    expect(r.contentRepoWrites).toEqual([]);
    expect(r.conflicts).toEqual([
      { key: KEY, snapshotValue: "A", contentRepoValue: "B", yamlValue: "C" },
    ]);
    expect(r.newSnapshot[KEY]).toBe("B");
    expect(r.newYaml.home.hero.title).toBe("C");
  });

  it("missing on content repo is treated as 'equal to snapshot'", () => {
    const r = run({ snapshot: { [KEY]: "A" }, contentRepo: {}, yaml: "C" });
    expect(r.contentRepoWrites).toEqual([{ key: KEY, value: "C" }]);
    expect(r.conflicts).toEqual([]);
  });

  it("missing on yaml is treated as 'equal to snapshot'", () => {
    const r = run({ snapshot: { [KEY]: "A" }, contentRepo: { [KEY]: "B" }, yaml: undefined });
    expect(r.contentRepoWrites).toEqual([]);
    expect(r.conflicts).toEqual([]);
    expect(r.newYaml.home.hero.title).toBe("B");
  });

  it("bootstrap — empty snapshot, both sides populated identically", () => {
    const r = run({ snapshot: {}, contentRepo: { [KEY]: "A" }, yaml: "A" });
    expect(r.contentRepoWrites).toEqual([]);
    expect(r.conflicts).toEqual([]);
    expect(r.newSnapshot[KEY]).toBe("A");
  });

  it("bootstrap — empty snapshot, yaml only", () => {
    const r = run({ snapshot: {}, contentRepo: {}, yaml: "A" });
    expect(r.contentRepoWrites).toEqual([{ key: KEY, value: "A" }]);
    expect(r.conflicts).toEqual([]);
    expect(r.newSnapshot[KEY]).toBe("A");
  });
});
