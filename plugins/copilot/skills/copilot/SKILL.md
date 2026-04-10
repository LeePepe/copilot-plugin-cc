---
name: copilot
description: Delegate coding tasks and review prompts to the local Copilot CLI through the copilot-companion script.
metadata:
  author: tianpli
  version: "0.2.0"
---

# Copilot Skill

Use this skill when the user asks to hand work to local Copilot, run Copilot-based review prompts, or manage Copilot background jobs.

## Script path

Resolve the companion script once and reuse it:

```bash
SCRIPT="plugins/copilot/scripts/copilot-companion.mjs"
```

## Workflow

1. Validate availability first:

```bash
node "$SCRIPT" setup --json
```

2. Delegate implementation or investigation tasks:

```bash
node "$SCRIPT" rescue "<task prompt>"
```

3. Run in background when requested:

```bash
node "$SCRIPT" rescue --background "<task prompt>"
node "$SCRIPT" status
node "$SCRIPT" result <job-id>
```

4. Continue prior context when requested:

```bash
node "$SCRIPT" rescue --resume <job-id> "<follow-up task>"
```

5. Cancel active work:

```bash
node "$SCRIPT" cancel <job-id>
```

## Operating rules

- Prefer foreground execution unless the user explicitly requests background mode.
- If setup reports `available: false`, stop and surface the setup error to the user.
- Return Copilot output directly; do not paraphrase unless the user asks for a summary.
