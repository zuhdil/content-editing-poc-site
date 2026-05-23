import { readFileSync, writeFileSync } from "node:fs";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

// NOTE: this flatten intentionally does NOT trim trailing whitespace,
// because its callers (resolver, bootstrap) round-trip values straight
// back through the YAML serialiser, where the trailing newline is
// preserved consistently. merge.mjs has its OWN internal flatten that
// DOES trim, because it compares yaml values against content-repo file
// contents (which are read trimmed). Do not "unify" these two by
// removing the trim in merge.mjs — that would make markdown values
// appear permanently diverged. See merge.mjs for the matching note.
export function flatten(obj, prefix = "") {
  const out = {};
  for (const [key, value] of Object.entries(obj ?? {})) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(out, flatten(value, next));
    } else if (value != null) {
      out[next] = String(value);
    }
  }
  return out;
}

export function unflatten(flat) {
  const out = {};
  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split(".");
    let cursor = out;
    for (let i = 0; i < parts.length - 1; i += 1) {
      const p = parts[i];
      if (cursor[p] === undefined || typeof cursor[p] !== "object") cursor[p] = {};
      cursor = cursor[p];
    }
    cursor[parts[parts.length - 1]] = value;
  }
  return out;
}

export function parseYamlText(text) {
  return parseYaml(text);
}

export function serializeYaml(obj) {
  return stringifyYaml(obj, { lineWidth: 0, blockQuote: "literal" });
}

export function readYamlFile(path) {
  return parseYamlText(readFileSync(path, "utf8"));
}

export function writeYamlFile(path, obj) {
  writeFileSync(path, serializeYaml(obj));
}
