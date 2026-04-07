---
description: Show the output of a finished or in-progress Copilot job
argument-hint: '[job-id]'
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/copilot-companion.mjs" result $ARGUMENTS`

Present the full output verbatim. Do not summarize or condense. Preserve:
- Job ID and status
- The complete Copilot output
- Any error messages
- Follow-up commands such as `/copilot:status <id>`
