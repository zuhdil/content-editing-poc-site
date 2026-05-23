import { describe, expect, it } from "vitest";
import { applyChoices } from "../../scripts/lib/resolve-core.mjs";

describe("applyChoices", () => {
  it("rewrites nested yaml values for each chosen key", () => {
    const yaml = { home: { hero: { title: "Old", subtitle: "Sub" } } };
    const choices = { "home.hero.title": "New title" };
    const out = applyChoices(yaml, choices);
    expect(out).toEqual({ home: { hero: { title: "New title", subtitle: "Sub" } } });
  });

  it("creates intermediate nested keys when missing", () => {
    const yaml = { home: {} };
    const choices = { "home.hero.title": "X" };
    const out = applyChoices(yaml, choices);
    expect(out).toEqual({ home: { hero: { title: "X" } } });
  });

  it("does not mutate the input yaml object", () => {
    const yaml = { home: { hero: { title: "Old" } } };
    const choices = { "home.hero.title": "New" };
    const out = applyChoices(yaml, choices);
    expect(yaml.home.hero.title).toBe("Old");
    expect(out.home.hero.title).toBe("New");
  });

  it("returns the input unchanged when there are no choices", () => {
    const yaml = { a: { b: "c" } };
    expect(applyChoices(yaml, {})).toEqual({ a: { b: "c" } });
  });
});
