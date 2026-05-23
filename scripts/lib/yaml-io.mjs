import { readFileSync, writeFileSync } from "node:fs";
import { parse as parseYaml, stringify as stringifyYaml } from "yaml";

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
