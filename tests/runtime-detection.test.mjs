import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const SCRIPT = path.resolve("plugins/copilot/scripts/copilot-companion.mjs");

function makeFakeCopilot(tmpDir) {
  const binPath = path.join(tmpDir, "copilot");
  fs.writeFileSync(
    binPath,
    `#!/bin/sh
if [ "$1" = "--version" ]; then
  echo "copilot 0.0.0-test"
  exit 0
fi
if [ "$1" = "-p" ]; then
  echo "ok"
  exit 0
fi
exit 0
`
  );
  fs.chmodSync(binPath, 0o755);
  return binPath;
}

function runSetup(extraEnv = {}, homeDir) {
  const tmpDir = homeDir || fs.mkdtempSync(path.join(os.tmpdir(), "copilot-companion-test-"));
  const fakeCopilot = makeFakeCopilot(tmpDir);

  const env = {
    ...process.env,
    HOME: tmpDir,
    COPILOT_BIN: fakeCopilot,
    ...extraEnv,
  };

  const result = spawnSync("node", [SCRIPT, "setup", "--json"], {
    env,
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  return { json: JSON.parse(result.stdout), tmpDir };
}

test("uses Codex runtime defaults when CODEX_THREAD_ID is present", () => {
  const { json, tmpDir } = runSetup({
    CODEX_THREAD_ID: "codex-thread-1",
    CLAUDE_SESSION_ID: "",
    CLAUDE_PLUGIN_ROOT: "",
  });

  assert.equal(json.available, true);
  assert.equal(json.runtime, "codex");
  assert.equal(json.sessionId, "codex-thread-1");
  assert.equal(json.jobsDir, path.join(tmpDir, ".codex", "copilot-jobs", "codex-thread-1"));
});

test("prefers Claude session when CLAUDE_SESSION_ID is present", () => {
  const { json, tmpDir } = runSetup({
    CLAUDE_SESSION_ID: "claude-session-1",
    CODEX_THREAD_ID: "codex-thread-2",
  });

  assert.equal(json.runtime, "claude");
  assert.equal(json.sessionId, "claude-session-1");
  assert.equal(json.jobsDir, path.join(tmpDir, ".claude", "copilot-jobs", "claude-session-1"));
});

test("uses COPILOT_JOBS_ROOT override for job storage", () => {
  const homeDir = fs.mkdtempSync(path.join(os.tmpdir(), "copilot-companion-test-"));
  const customRoot = path.join(homeDir, "custom-root");
  const { json } = runSetup({
    CODEX_THREAD_ID: "codex-thread-3",
    COPILOT_JOBS_ROOT: customRoot,
  }, homeDir);

  assert.equal(json.runtime, "codex");
  assert.equal(json.jobsDir, path.join(homeDir, "custom-root", "copilot-jobs", "codex-thread-3"));
});
