import { execFileSync } from "node:child_process";

function run(args, opts = {}) {
  return execFileSync("git", args, { stdio: "inherit", ...opts });
}

function runQuiet(args, opts = {}) {
  return execFileSync("git", args, { stdio: "pipe", encoding: "utf8", ...opts }).trim();
}

/**
 * Returns true iff the working tree at `cwd` has uncommitted changes.
 */
export function hasChanges(cwd) {
  const out = runQuiet(["status", "--porcelain"], { cwd });
  return out !== "";
}

export function add(cwd, paths) {
  if (paths.length === 0) return;
  run(["add", ...paths], { cwd });
}

export function commit(cwd, message) {
  run(["commit", "-m", message], { cwd });
}

export function push(cwd, remote = "origin", branch = "main") {
  // Skip pushing when running in test or dry-run contexts. The SYNC_SKIP_PUSH
  // env var lets the CI bootstrap workflow and local test runs avoid pushing
  // to the content repo without having to mock the git binary.
  if (process.env.SYNC_SKIP_PUSH === "1") {
    console.log(`[git] SYNC_SKIP_PUSH=1, skipping push in ${cwd}`);
    return;
  }
  run(["push", remote, branch], { cwd });
}

export function currentSha(cwd) {
  return runQuiet(["rev-parse", "HEAD"], { cwd });
}
