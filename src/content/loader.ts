import { readFileSync } from "node:fs";
import { join } from "node:path";
import { parse as parseYaml } from "yaml";
import { marked } from "marked";

type SchemaEntry = { type: "text" | "markdown"; maxLength: number };
type Schema = Record<string, SchemaEntry>;

const CONTENT_DIR = join(process.cwd(), "src/content");

function readJson<T>(name: string): T {
  return JSON.parse(readFileSync(join(CONTENT_DIR, name), "utf8")) as T;
}

const schema = readJson<Schema>("content.schema.json");
const yamlRaw = readFileSync(join(CONTENT_DIR, "content.yml"), "utf8");
const yamlData = parseYaml(yamlRaw) as Record<string, unknown>;

function flatten(obj: Record<string, unknown>, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(obj)) {
    const next = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(out, flatten(value as Record<string, unknown>, next));
    } else if (value != null) {
      out[next] = String(value);
    }
  }
  return out;
}

const flat = flatten(yamlData);

// Build-time validation: every schema key must be present.
for (const key of Object.keys(schema)) {
  if (!(key in flat)) {
    throw new Error(`content.yml missing key: ${key}`);
  }
}

export const content = yamlData as {
  home: {
    hero: { title: string; subtitle: string };
    feature_one: { title: string; description: string };
    feature_two: { title: string; description: string };
    cta: { button_label: string };
  };
  about: { heading: string; intro: string; mission_body: string };
  features: { heading: string; subtitle: string; footer_note: string };
  layout: { footer: { copyright: string }; nav: { tagline: string } };
};

export function renderMarkdown(md: string): string {
  return marked.parse(md, { async: false }) as string;
}

export { schema };
