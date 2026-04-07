---
description: Delegate a coding task, investigation, or fix to the local Copilot CLI
argument-hint: "[--background|--wait] [--resume <jobId>|--fresh] [what Copilot should implement, fix, or investigate]"
context: fork
allowed-tools: Bash(node:*), AskUserQuestion
---

Route this request to the `copilot:copilot-rescue` subagent.
The final user-visible response must be Copilot's output verbatim.

Raw user request:
$ARGUMENTS

Execution mode:

- If the request includes `--background`, run the subagent in the background.
- If the request includes `--wait`, run the subagent in the foreground.
- If neither flag is present, default to foreground.
- `--background` and `--wait` are execution flags. Do not forward them to the subagent task text.

Resume logic:

- If the request includes `--resume`, do not ask. Forward `--resume` to the subagent.
- If the request includes `--fresh`, do not ask. Forward `--fresh` to the subagent.
- Otherwise, check for a resumable job:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/copilot-companion.mjs" task-resume-candidate --json
```

- If `available: true`, use `AskUserQuestion` exactly once with these two choices:
  - `Continue current Copilot job` (put first if the user's message reads like a follow-up)
  - `Start a new Copilot job` (put first otherwise)
- If the user picks continue, add `--resume <jobId>` to the forwarded call.
- If `available: false`, route normally.

Operating rules:

- The subagent uses one `Bash` call to invoke `node "${CLAUDE_PLUGIN_ROOT}/scripts/copilot-companion.mjs" task ...` and returns stdout as-is.
- Return Copilot's output verbatim. Do not summarize, paraphrase, or add commentary.
- If Copilot is unavailable, stop and tell the user to run `/copilot:setup`.
- If the user provided no task description, ask what Copilot should do.
