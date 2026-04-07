---
description: Check whether the local Copilot CLI is ready
argument-hint: ''
allowed-tools: Bash(node:*)
---

Run:

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/copilot-companion.mjs" setup --json
```

Parse the JSON result:

- If `available` is true: report "✓ Copilot CLI ready" and show the binary path and version.
- If `available` is false: report that Copilot is not available, show the expected binary path, and tell the user to set `COPILOT_BIN` environment variable if the binary is in a non-standard location.
