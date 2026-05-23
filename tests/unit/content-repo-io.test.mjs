import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readContentRepo, writeContentRepoFiles, pathForKey } from "../../scripts/lib/content-repo-io.mjs";

const SCHEMA = {
  "home.hero.title": { type: "text", maxLength: 80 },
  "home.feature_one.description": { type: "markdown", maxLength: 600 },
  "layout.footer.copyright": { type: "text", maxLength: 100 },
};

function setupRepo() {
  const dir = mkdtempSync(join(tmpdir(), "cri-"));
  mkdirSync(join(dir, "home"), { recursive: true });
  mkdirSync(join(dir, "layout"), { recursive: true });
  writeFileSync(join(dir, "home", "hero.title.txt"), "Hi there\n");
  writeFileSync(join(dir, "home", "feature_one.description.md"), "Some **markdown**\n");
  writeFileSync(join(dir, "layout", "footer.copyright.txt"), "© 2026\n");
  return dir;
}

describe("content-repo-io", () => {
  it("pathForKey maps key → relative path with the right extension", () => {
    expect(pathForKey("home.hero.title", SCHEMA["home.hero.title"]))
      .toBe("home/hero.title.txt");
    expect(pathForKey("home.feature_one.description", SCHEMA["home.feature_one.description"]))
      .toBe("home/feature_one.description.md");
    expect(pathForKey("layout.footer.copyright", SCHEMA["layout.footer.copyright"]))
      .toBe("layout/footer.copyright.txt");
  });

  it("readContentRepo returns a flat key → value map, trimmed", () => {
    const dir = setupRepo();
    const map = readContentRepo(dir, SCHEMA);
    expect(map).toEqual({
      "home.hero.title": "Hi there",
      "home.feature_one.description": "Some **markdown**",
      "layout.footer.copyright": "© 2026",
    });
  });

  it("readContentRepo skips keys whose file is missing", () => {
    const dir = setupRepo();
    const schemaWithExtra = { ...SCHEMA, "about.heading": { type: "text", maxLength: 80 } };
    const map = readContentRepo(dir, schemaWithExtra);
    expect(map["about.heading"]).toBeUndefined();
  });

  it("writeContentRepoFiles creates folders and writes a trailing newline", () => {
    const dir = mkdtempSync(join(tmpdir(), "criw-"));
    writeContentRepoFiles(dir, SCHEMA, [
      { key: "home.hero.title", value: "Hello" },
      { key: "home.feature_one.description", value: "**Bold**" },
    ]);
    expect(readFileSync(join(dir, "home", "hero.title.txt"), "utf8")).toBe("Hello\n");
    expect(readFileSync(join(dir, "home", "feature_one.description.md"), "utf8")).toBe("**Bold**\n");
  });

  it("writeContentRepoFiles overwrites existing files", () => {
    const dir = setupRepo();
    writeContentRepoFiles(dir, SCHEMA, [{ key: "home.hero.title", value: "New" }]);
    expect(readFileSync(join(dir, "home", "hero.title.txt"), "utf8")).toBe("New\n");
  });
});
