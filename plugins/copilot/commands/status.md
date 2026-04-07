---
description: Show active and recent Copilot jobs for this session
argument-hint: '[job-id] [--all]'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/copilot-companion.mjs" status $ARGUMENTS`

If the user did not pass a job ID:
- Render the output as a compact Markdown table with columns: Job ID, Status, Kind, Prompt (truncated).
- Do not add extra prose outside the table.

If the user passed a job ID:
- Present the full output. Do not summarize.
