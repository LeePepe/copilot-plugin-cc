#!/usr/bin/env node
/**
 * copilot-companion.mjs
 * Job tracking and execution wrapper for the local Copilot CLI.
 *
 * Commands:
 *   setup [--json]
 *   rescue [--background] [--resume <jobId>|--fresh] [--effort <level>] "<prompt>"
 *   task   [same as rescue]
 *   task-resume-candidate [--json]
 *   status [jobId] [--json] [--all]
 *   result [jobId]
 *   cancel [jobId]
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const COPILOT_BIN =
  process.env.COPILOT_BIN ||
  (() => {
    const candidates = [
      `${os.homedir()}/.superset/bin/copilot`,
      "/usr/local/bin/copilot",
      "/opt/homebrew/bin/copilot",
    ];
    for (const c of candidates) {
      if (fs.existsSync(c)) return c;
    }
    return "copilot";
  })();

const RUNTIME =
  process.env.CLAUDE_SESSION_ID || process.env.CLAUDE_PLUGIN_ROOT ? "claude" : "codex";
const SESSION_ID =
  process.env.CLAUDE_SESSION_ID || process.env.CODEX_THREAD_ID || process.env.CODEX_SESSION_ID || "default";
const JOBS_ROOT =
  process.env.COPILOT_JOBS_ROOT ||
  path.join(os.homedir(), RUNTIME === "claude" ? ".claude" : ".codex");
const JOBS_DIR = path.join(JOBS_ROOT, "copilot-jobs", SESSION_ID);

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function ensureJobsDir() {
  fs.mkdirSync(JOBS_DIR, { recursive: true });
}

function jobPath(jobId) {
  return path.join(JOBS_DIR, `${jobId}.json`);
}

function loadJob(jobId) {
  const p = jobPath(jobId);
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function saveJob(job) {
  ensureJobsDir();
  fs.writeFileSync(jobPath(job.id), JSON.stringify(job, null, 2));
}

function listJobs() {
  ensureJobsDir();
  return fs
    .readdirSync(JOBS_DIR)
    .filter((f) => f.endsWith(".json"))
    .map((f) => JSON.parse(fs.readFileSync(path.join(JOBS_DIR, f), "utf8")))
    .sort((a, b) => new Date(b.startedAt) - new Date(a.startedAt));
}

function latestJob() {
  const jobs = listJobs();
  return jobs[0] ?? null;
}

function parseArgs(argv) {
  const args = { flags: {}, positional: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args.flags[key] = next;
        i++;
      } else {
        args.flags[key] = true;
      }
    } else {
      args.positional.push(a);
    }
  }
  return args;
}

function isProcessRunning(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function copilotAvailable() {
  if (!fs.existsSync(COPILOT_BIN) && COPILOT_BIN === "copilot") {
    try {
      spawnSync("which", ["copilot"], { stdio: "ignore" });
    } catch {
      return { available: false, detail: "copilot binary not found" };
    }
  }
  const r = spawnSync(COPILOT_BIN, ["--version"], {
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf8",
  });
  if (r.error || r.status !== 0) {
    return { available: false, detail: r.stderr?.trim() || "copilot --version failed" };
  }
  return { available: true, detail: r.stdout?.trim() || "ok" };
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

function cmdSetup(args) {
  const asJson = args.flags["json"];
  const avail = copilotAvailable();

  if (asJson) {
    console.log(
      JSON.stringify(
        {
          ...avail,
          bin: COPILOT_BIN,
          runtime: RUNTIME,
          sessionId: SESSION_ID,
          jobsDir: JOBS_DIR,
        },
        null,
        2
      )
    );
    return;
  }

  if (avail.available) {
    console.log(`✓ Copilot CLI ready: ${COPILOT_BIN}`);
    console.log(`  ${avail.detail}`);
  } else {
    console.log(`✗ Copilot CLI not available: ${avail.detail}`);
    console.log(`  Expected binary at: ${COPILOT_BIN}`);
    console.log(`  Set COPILOT_BIN env var to override.`);
    process.exitCode = 1;
  }
}

function buildCopilotArgs(prompt) {
  return ["-p", prompt, "--yolo"];
}

function cmdRescue(args) {
  const avail = copilotAvailable();
  if (!avail.available) {
    console.error(`Copilot not available: ${avail.detail}\nRun /copilot:setup for details.`);
    process.exitCode = 1;
    return;
  }

  const isBackground = Boolean(args.flags["background"]);
  const resumeJobId = args.flags["resume"];
  const isFresh = Boolean(args.flags["fresh"]);
  const promptText = args.positional.join(" ").trim();

  if (!promptText) {
    console.error("Error: prompt is required.");
    process.exitCode = 1;
    return;
  }

  // Build effective prompt
  let effectivePrompt = promptText;
  if (resumeJobId && !isFresh) {
    const prev = loadJob(resumeJobId);
    if (prev?.output) {
      effectivePrompt = `Previous context:\n${prev.output.slice(-2000)}\n\nContinue: ${promptText}`;
    }
  }

  const jobId = randomUUID().slice(0, 8);
  const outputFile = path.join(JOBS_DIR, `${jobId}.out`);
  ensureJobsDir();

  const job = {
    id: jobId,
    kind: "rescue",
    status: "running",
    prompt: promptText,
    effectivePrompt,
    bin: COPILOT_BIN,
    startedAt: new Date().toISOString(),
    endedAt: null,
    pid: null,
    exitCode: null,
    output: "",
    outputFile,
    resumedFrom: resumeJobId ?? null,
  };

  if (isBackground) {
    const outFd = fs.openSync(outputFile, "w");
    const child = spawn(COPILOT_BIN, buildCopilotArgs(effectivePrompt), {
      cwd: process.cwd(),
      stdio: ["ignore", outFd, outFd],
      detached: true,
    });
    child.unref();
    fs.closeSync(outFd);

    job.pid = child.pid;
    saveJob(job);

    console.log(`Job ${jobId} started in background (PID ${child.pid}).`);
    console.log(`Check progress: /copilot:status ${jobId}`);
    console.log(`Get result:     /copilot:result ${jobId}`);
  } else {
    // Foreground: stream output
    job.pid = process.pid;
    saveJob(job);

    console.log(`Running Copilot (job ${jobId})...\n`);

    const result = spawnSync(COPILOT_BIN, buildCopilotArgs(effectivePrompt), {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      encoding: "utf8",
      maxBuffer: 50 * 1024 * 1024,
    });

    const combinedOutput = (result.stdout || "") + (result.stderr || "");
    process.stdout.write(combinedOutput);

    job.status = result.status === 0 ? "completed" : "failed";
    job.exitCode = result.status;
    job.endedAt = new Date().toISOString();
    job.output = combinedOutput;
    saveJob(job);

    // Also write output file for consistency
    fs.writeFileSync(outputFile, combinedOutput);

    if (result.status !== 0) {
      process.exitCode = 1;
    }
  }
}

function cmdTaskResumeCandidate(args) {
  const asJson = args.flags["json"];
  const jobs = listJobs().filter(
    (j) => j.kind === "rescue" && (j.status === "completed" || j.status === "running")
  );
  const candidate = jobs[0] ?? null;

  if (asJson) {
    console.log(
      JSON.stringify({
        available: Boolean(candidate),
        jobId: candidate?.id ?? null,
        summary: candidate ? `${candidate.status} — ${candidate.prompt.slice(0, 72)}` : null,
      })
    );
  } else {
    if (candidate) {
      console.log(`Resumable job: ${candidate.id} (${candidate.status})`);
      console.log(`  ${candidate.prompt.slice(0, 120)}`);
    } else {
      console.log("No resumable job found.");
    }
  }
}

function cmdStatus(args) {
  const asJson = Boolean(args.flags["json"]);
  const showAll = Boolean(args.flags["all"]);
  const jobId = args.positional[0];

  if (jobId) {
    const job = loadJob(jobId);
    if (!job) {
      console.error(`Job ${jobId} not found.`);
      process.exitCode = 1;
      return;
    }

    // Refresh running status
    if (job.status === "running" && job.pid) {
      if (!isProcessRunning(job.pid)) {
        // Check output file for completion
        if (fs.existsSync(job.outputFile)) {
          job.output = fs.readFileSync(job.outputFile, "utf8");
        }
        job.status = "completed";
        job.endedAt = new Date().toISOString();
        saveJob(job);
      }
    }

    if (asJson) {
      console.log(JSON.stringify(job, null, 2));
    } else {
      console.log(`Job:     ${job.id}`);
      console.log(`Status:  ${job.status}`);
      console.log(`Kind:    ${job.kind}`);
      console.log(`Started: ${job.startedAt}`);
      if (job.endedAt) console.log(`Ended:   ${job.endedAt}`);
      if (job.pid) console.log(`PID:     ${job.pid}`);
      console.log(`Prompt:  ${job.prompt.slice(0, 100)}`);
      if (job.resumedFrom) console.log(`Resumed: ${job.resumedFrom}`);
    }
    return;
  }

  // List all
  let jobs = listJobs();
  if (!showAll) jobs = jobs.slice(0, 10);

  // Refresh running jobs
  for (const job of jobs) {
    if (job.status === "running" && job.pid && !isProcessRunning(job.pid)) {
      if (fs.existsSync(job.outputFile)) {
        job.output = fs.readFileSync(job.outputFile, "utf8");
      }
      job.status = "completed";
      job.endedAt = new Date().toISOString();
      saveJob(job);
    }
  }

  if (asJson) {
    console.log(JSON.stringify(jobs, null, 2));
    return;
  }

  if (jobs.length === 0) {
    console.log("No jobs in this session.");
    return;
  }

  const col = (s, n) => String(s ?? "").slice(0, n).padEnd(n);
  console.log(`${col("ID", 10)} ${col("STATUS", 10)} ${col("KIND", 8)} ${col("PROMPT", 60)}`);
  console.log("-".repeat(92));
  for (const j of jobs) {
    console.log(`${col(j.id, 10)} ${col(j.status, 10)} ${col(j.kind, 8)} ${col(j.prompt, 60)}`);
  }
}

function cmdResult(args) {
  const jobId = args.positional[0] ?? latestJob()?.id;
  if (!jobId) {
    console.error("No job found. Run /copilot:rescue first.");
    process.exitCode = 1;
    return;
  }

  const job = loadJob(jobId);
  if (!job) {
    console.error(`Job ${jobId} not found.`);
    process.exitCode = 1;
    return;
  }

  // Try to read output file if job may have completed in background
  if (job.status === "running" && job.pid) {
    if (!isProcessRunning(job.pid)) {
      if (fs.existsSync(job.outputFile)) {
        job.output = fs.readFileSync(job.outputFile, "utf8");
      }
      job.status = "completed";
      job.endedAt = new Date().toISOString();
      saveJob(job);
    }
  }

  console.log(`Job:    ${job.id}`);
  console.log(`Status: ${job.status}`);
  console.log(`Kind:   ${job.kind}`);
  console.log("");

  if (job.status === "running") {
    // Stream current output
    if (fs.existsSync(job.outputFile)) {
      const partial = fs.readFileSync(job.outputFile, "utf8");
      console.log(`--- Output so far (${partial.length} bytes) ---`);
      console.log(partial.slice(-3000));
    } else {
      console.log("Job is still running. Check back with /copilot:status.");
    }
    return;
  }

  const output = job.output || (fs.existsSync(job.outputFile) ? fs.readFileSync(job.outputFile, "utf8") : "");
  if (output) {
    console.log("--- Output ---");
    console.log(output);
  } else {
    console.log("(no output captured)");
  }
}

function cmdCancel(args) {
  const jobId = args.positional[0] ?? latestJob()?.id;
  if (!jobId) {
    console.error("No job found.");
    process.exitCode = 1;
    return;
  }

  const job = loadJob(jobId);
  if (!job) {
    console.error(`Job ${jobId} not found.`);
    process.exitCode = 1;
    return;
  }

  if (job.status !== "running") {
    console.log(`Job ${jobId} is not running (status: ${job.status}).`);
    return;
  }

  if (!job.pid) {
    console.error("No PID recorded for this job.");
    process.exitCode = 1;
    return;
  }

  try {
    process.kill(job.pid, "SIGTERM");
    job.status = "cancelled";
    job.endedAt = new Date().toISOString();
    saveJob(job);
    console.log(`Job ${jobId} (PID ${job.pid}) cancelled.`);
  } catch (e) {
    console.error(`Failed to cancel: ${e.message}`);
    process.exitCode = 1;
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const [, , command, ...rest] = process.argv;
const args = parseArgs(rest);

switch (command) {
  case "setup":
    cmdSetup(args);
    break;
  case "rescue":
  case "task":
    cmdRescue(args);
    break;
  case "task-resume-candidate":
    cmdTaskResumeCandidate(args);
    break;
  case "status":
    cmdStatus(args);
    break;
  case "result":
    cmdResult(args);
    break;
  case "cancel":
    cmdCancel(args);
    break;
  default:
    console.error(`Unknown command: ${command}`);
    console.error("Usage: copilot-companion.mjs <setup|rescue|task|status|result|cancel> [args]");
    process.exitCode = 1;
}
