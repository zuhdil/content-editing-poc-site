import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, copyFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { parse as parseYaml } from "yaml";
import { runSync } from "../../scripts/sync.mjs";

const SITE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

beforeAll(() => { process.env.SYNC_SKIP_PUSH = "1"; });

function freshSite() {
  const dir = mkdtempSync(join(tmpdir(), "sync-site-"));
  mkdirSync(join(dir, "src/content"), { recursive: true });
  copyFileSync(
    join(SITE_ROOT, "src/content/content.schema.json"),
    join(dir, "src/content/content.schema.json"),
  );
  writeFileSync(join(dir, "src/content/content.snapshot.json"), "{}\n");
  writeFileSync(
    join(dir, "src/content/content.conflicts.json"),
    JSON.stringify({ createdAt: null, entries: [] }, null, 2) + "\n",
  );
  return dir;
}

function gitInit(dir) {
  execFileSync("git", ["init", "-b", "main"], { cwd: dir, stdio: "ignore" });
  execFileSync("git", ["config", "user.email", "t@e.st"], { cwd: dir });
  execFileSync("git", ["config", "user.name", "Tester"], { cwd: dir });
  execFileSync("git", ["add", "-A"], { cwd: dir });
  execFileSync("git", ["commit", "-m", "init"], { cwd: dir, stdio: "ignore" });
}

function flatten(obj, prefix = "", out = {}) {
  for (const [k, v] of Object.entries(obj ?? {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) flatten(v, key, out);
    else if (v != null) out[key] = String(v);
  }
  return out;
}

function seedContentRepo(values) {
  const dir = mkdtempSync(join(tmpdir(), "sync-content-"));
  const schema = JSON.parse(
    readFileSync(join(SITE_ROOT, "src/content/content.schema.json"), "utf8"),
  );
  for (const [key, value] of Object.entries(values)) {
    const segments = key.split(".");
    const folder = segments[0];
    const filename = segments.slice(1).join(".");
    const ext = schema[key].type === "markdown" ? "md" : "txt";
    mkdirSync(join(dir, folder), { recursive: true });
    writeFileSync(join(dir, folder, `${filename}.${ext}`), value + "\n");
  }
  gitInit(dir);
  return dir;
}

describe("orchestrator — happy path", () => {
  it("absorbs an edit from the content repo into content.yml + snapshot", async () => {
    const site = freshSite();
    const initialYaml = readFileSync(join(SITE_ROOT, "src/content/content.yml"), "utf8");
    writeFileSync(join(site, "src/content/content.yml"), initialYaml);
    // Seed snapshot to match yaml — i.e. "a prior sync already converged here".
    const flat = flatten(parseYaml(initialYaml));
    writeFileSync(
      join(site, "src/content/content.snapshot.json"),
      JSON.stringify(flat, null, 2) + "\n",
    );
    gitInit(site);

    const seed = { ...flat, "home.hero.title": "Edited via web UI" };
    const content = seedContentRepo(seed);

    await runSync({ siteRoot: site, contentRepoPath: content });

    const yamlAfter = readFileSync(join(site, "src/content/content.yml"), "utf8");
    expect(yamlAfter).toContain("Edited via web UI");

    const snap = JSON.parse(readFileSync(join(site, "src/content/content.snapshot.json"), "utf8"));
    expect(snap["home.hero.title"]).toBe("Edited via web UI");
  });
});

describe("orchestrator — conflict path", () => {
  it("detects a 3-way divergence and writes conflicts.json + bumped snapshot", async () => {
    const site = freshSite();
    const yamlText = readFileSync(join(SITE_ROOT, "src/content/content.yml"), "utf8");
    writeFileSync(
      join(site, "src/content/content.yml"),
      yamlText.replace("Welcome to the Content POC", "Yaml-side change"),
    );
    // Snapshot reflects the ORIGINAL value.
    writeFileSync(
      join(site, "src/content/content.snapshot.json"),
      JSON.stringify({ "home.hero.title": "Welcome to the Content POC" }, null, 2) + "\n",
    );
    gitInit(site);

    const flat = flatten(parseYaml(yamlText));
    const seed = { ...flat, "home.hero.title": "Content-side change" };
    const content = seedContentRepo(seed);

    await runSync({ siteRoot: site, contentRepoPath: content });

    const conflicts = JSON.parse(readFileSync(join(site, "src/content/content.conflicts.json"), "utf8"));
    expect(conflicts.entries).toHaveLength(1);
    expect(conflicts.entries[0]).toMatchObject({
      key: "home.hero.title",
      snapshotValue: "Welcome to the Content POC",
      contentRepoValue: "Content-side change",
      yamlValue: "Yaml-side change",
    });

    const snap = JSON.parse(readFileSync(join(site, "src/content/content.snapshot.json"), "utf8"));
    // Snapshot was bumped to the content-repo side per the spec.
    expect(snap["home.hero.title"]).toBe("Content-side change");

    // content.yml's conflicting key is rolled back to the last-agreed
    // (snapshot) value, so the live deploy never publishes an unreconciled
    // edit. The yaml-side value must NOT remain in content.yml.
    const yamlAfter = readFileSync(join(site, "src/content/content.yml"), "utf8");
    expect(yamlAfter).toContain("Welcome to the Content POC");
    expect(yamlAfter).not.toContain("Yaml-side change");
  });

  it("the gate halts further syncs while conflicts are active", async () => {
    const site = freshSite();
    const yamlText = readFileSync(join(SITE_ROOT, "src/content/content.yml"), "utf8");
    writeFileSync(join(site, "src/content/content.yml"), yamlText);
    writeFileSync(
      join(site, "src/content/content.conflicts.json"),
      JSON.stringify({
        createdAt: new Date().toISOString(),
        entries: [
          { key: "home.hero.title", snapshotValue: "A", contentRepoValue: "B", yamlValue: "C" },
        ],
      }, null, 2) + "\n",
    );
    gitInit(site);

    const content = seedContentRepo({ "home.hero.title": "anything" });

    await runSync({ siteRoot: site, contentRepoPath: content });

    const conflicts = JSON.parse(readFileSync(join(site, "src/content/content.conflicts.json"), "utf8"));
    expect(conflicts.entries).toHaveLength(1);
    expect(readFileSync(join(site, "src/content/content.yml"), "utf8")).toBe(yamlText);
  });
});
