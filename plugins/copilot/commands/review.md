---
description: Run a Copilot code review against local git changes
argument-hint: '[--wait|--background] [--base <ref>] [focus ...]'
disable-model-invocation: true
allowed-tools: Bash(node:*), Bash(git:*)
---

Run a Copilot review of local git changes.

Raw arguments:
`$ARGUMENTS`

## Steps

1. Determine the diff scope:
   - If `--base <ref>` is provided, use `git diff <ref>...HEAD`
   - Otherwise, use `git diff HEAD` (working tree + staged changes)

2. Capture the diff:
```bash
git diff HEAD
```

3. Build a review prompt combining the diff and any focus areas from `$ARGUMENTS`:

```
Review the following code changes for correctness, bugs, missing error handling,
and style issues. Report findings as [CRITICAL], [HIGH], [MEDIUM], [LOW].

Focus areas: <any focus words from arguments, or "general review">

Changes:
<diff output>
```

4. Run Copilot:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/copilot-companion.mjs" rescue \
  "<the combined review prompt>"
```

5. Return Copilot's output verbatim. Do not fix issues — this command is review-only.
