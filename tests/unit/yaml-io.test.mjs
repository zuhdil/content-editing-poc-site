import { describe, expect, it } from "vitest";
import { flatten, unflatten, parseYamlText, serializeYaml } from "../../scripts/lib/yaml-io.mjs";

describe("flatten", () => {
  it("turns nested objects into dotted keys", () => {
    const nested = { home: { hero: { title: "Hi", subtitle: "There" } }, layout: { nav: { tagline: "Tag" } } };
    expect(flatten(nested)).toEqual({
      "home.hero.title": "Hi",
      "home.hero.subtitle": "There",
      "layout.nav.tagline": "Tag",
    });
  });

  it("preserves multi-line strings", () => {
    const nested = { a: { b: "line one\nline two" } };
    expect(flatten(nested)).toEqual({ "a.b": "line one\nline two" });
  });
});

describe("unflatten", () => {
  it("rebuilds nested objects from dotted keys", () => {
    const flat = {
      "home.hero.title": "Hi",
      "home.hero.subtitle": "There",
      "layout.nav.tagline": "Tag",
    };
    expect(unflatten(flat)).toEqual({
      home: { hero: { title: "Hi", subtitle: "There" } },
      layout: { nav: { tagline: "Tag" } },
    });
  });

  it("is the inverse of flatten", () => {
    const nested = { home: { hero: { title: "T" }, cta: { button_label: "Go" } }, layout: { footer: { copyright: "(c)" } } };
    expect(unflatten(flatten(nested))).toEqual(nested);
  });
});

describe("parseYamlText / serializeYaml", () => {
  it("round-trips a small document", () => {
    const text = "home:\n  hero:\n    title: \"Hi\"\n";
    const obj = parseYamlText(text);
    expect(obj).toEqual({ home: { hero: { title: "Hi" } } });
    const serialised = serializeYaml(obj);
    expect(parseYamlText(serialised)).toEqual(obj);
  });
});
