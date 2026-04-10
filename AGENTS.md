# Repository Guidelines

## Project Structure & Module Organization
This repository is a Claude Code plugin that routes work to a local Copilot CLI.

- `plugins/copilot/scripts/copilot-companion.mjs`: single runtime entry point (`setup`, `rescue/task`, `status`, `result`, `cancel`).
- `plugins/copilot/commands/*.md`: slash-command definitions with frontmatter.
- `plugins/copilot/agents/*.md`: thin forwarding agents (for example `copilot-rescue.md`).
- `plugins/copilot/hooks/hooks.json`: session lifecycle hook wiring.
- `plugins/copilot/.claude-plugin/plugin.json`: plugin metadata.
- `.claude-plugin/marketplace.json`: local marketplace registration.

Keep command and agent docs focused; put behavior changes in `copilot-companion.mjs`.

## Build, Test, and Development Commands
No build step is required (Node ESM script).

- `npm test`: runs unit tests via Node’s built-in runner (`node --test tests/*.test.mjs`).
- `node plugins/copilot/scripts/copilot-companion.mjs setup`: verifies Copilot CLI availability.
- `node plugins/copilot/scripts/copilot-companion.mjs rescue "<task>"`: runs a foreground rescue task.
- `node plugins/copilot/scripts/copilot-companion.mjs status`: lists recent jobs.

When testing locally in Claude Code, reload and verify with `/reload-plugins` then `/copilot:setup`.

## Coding Style & Naming Conventions
- JavaScript: ESM (`"type": "module"`), 2-space indentation, semicolons, double quotes.
- Prefer small pure helpers for parsing, persistence, and command dispatch.
- File naming: kebab-case for command/agent docs (for example `adversarial-review.md`).
- Keep slash-command Markdown frontmatter explicit (`description`, `allowed-tools`, `argument-hint`).

## Testing Guidelines
- Framework: Node test runner (`node:test`) with `*.test.mjs` files under `tests/`.
- Name tests by command behavior (example: `rescue-background.test.mjs`, `status-json.test.mjs`).
- Cover happy path and failure path for each command, including missing binary, bad args, and resume behavior.

## Commit & Pull Request Guidelines
Use Conventional Commit prefixes aligned with repository history:
- `feat: ...`, `fix: ...`, `docs: ...`, `test: ...`, `chore: ...`.

PRs should include:
- concise problem/solution summary,
- before/after behavior for affected commands,
- test evidence (exact command and result),
- linked issue (if applicable).

## Security & Configuration Tips
- Override binary path with `COPILOT_BIN` when needed.
- Do not commit machine-local paths or job artifacts from `~/.claude/copilot-jobs/`.
