---
description: Run a Copilot adversarial review that challenges implementation approach and design choices
argument-hint: '[--wait|--background] [--base <ref>] [focus ...]'
disable-model-invocation: true
allowed-tools: Bash(node:*), Bash(git:*)
---

Run an adversarial Copilot review that challenges the chosen approach, not just finds bugs.

Raw arguments:
`$ARGUMENTS`

## Steps

1. Determine diff scope:
   - If `--base <ref>` is provided, use `git diff <ref>...HEAD`
   - Otherwise, use `git diff HEAD`

2. Capture the diff:
```bash
git diff HEAD
```

3. Build an adversarial review prompt:

```
You are a skeptical senior engineer performing an adversarial review.
Do not just look for bugs — challenge the fundamental approach.

Challenge dimensions:
1. Is this the right solution? Are there simpler alternatives?
2. What assumptions does this code make that could be wrong?
3. Where will this fail under real-world conditions?
4. What unnecessary complexity was introduced?
5. What edge cases are completely unhandled?

Focus areas: <any focus words from arguments, or "general adversarial review">

Changes:
<diff output>

If the approach is sound despite the challenges, say so — but be specific about what held up to scrutiny.
```

4. Run Copilot:
```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/copilot-companion.mjs" rescue \
  "<the combined adversarial review prompt>"
```

5. Return Copilot's output verbatim. Do not fix issues — this command is review-only.
