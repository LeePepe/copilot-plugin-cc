# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Run tests
node --test tests/*.test.mjs

# Test the companion script directly
node plugins/copilot/scripts/copilot-companion.mjs setup
node plugins/copilot/scripts/copilot-companion.mjs rescue "do something"
node plugins/copilot/scripts/copilot-companion.mjs status
node plugins/copilot/scripts/copilot-companion.mjs result
node plugins/copilot/scripts/copilot-companion.mjs cancel
```

## Architecture

This repository primarily hosts a **Claude Code plugin**, and now also includes a Codex plugin manifest + skill wrapper that target the same companion script.

### Plugin structure

```
.claude-plugin/marketplace.json       # Marketplace registration (name: copilot-local)
.agents/plugins/marketplace.json      # Codex marketplace registration
plugins/copilot/
  .claude-plugin/plugin.json          # Plugin metadata
  .codex-plugin/plugin.json           # Codex plugin metadata
  skills/copilot/SKILL.md             # Codex skill entry
  scripts/copilot-companion.mjs       # All job logic (single entry point)
  commands/                           # Slash command definitions (Markdown)
  agents/copilot-rescue.md            # Thin forwarder subagent
  hooks/hooks.json                    # SessionStart: runs setup --json silently
```

### Execution flow

```
/copilot:rescue [args]
  → commands/rescue.md        (route to subagent, handle resume logic)
    → agents/copilot-rescue.md (one Bash call to copilot-companion.mjs task ...)
      → copilot-companion.mjs  (spawns: copilot -p "<prompt>" --yolo)
```

### Job state

- Jobs stored as JSON in:
  - Claude runtime: `~/.claude/copilot-jobs/<SESSION_ID>/<jobId>.json`
  - Codex runtime: `~/.codex/copilot-jobs/<SESSION_ID>/<jobId>.json`
- Background job stdout captured to `<jobId>.out` in the same dir
- `SESSION_ID` is selected from `CLAUDE_SESSION_ID`, then `CODEX_THREAD_ID`, then `CODEX_SESSION_ID`
- Background jobs are detached processes; status is checked via `process.kill(pid, 0)`

### Copilot binary resolution

1. `COPILOT_BIN` env var (override via `~/.claude/settings.json`)
2. `~/.superset/bin/copilot`
3. `/usr/local/bin/copilot`
4. `/opt/homebrew/bin/copilot`
5. `copilot` (PATH fallback)

### Command routing

All commands (`setup`, `rescue`/`task`, `task-resume-candidate`, `status`, `result`, `cancel`) go through `copilot-companion.mjs` as the sole entry point. The slash command `.md` files delegate to it via `node "${CLAUDE_PLUGIN_ROOT}/scripts/copilot-companion.mjs"`.

### Adding a new command

1. Add a `commands/<name>.md` with frontmatter (`description`, `allowed-tools`, etc.)
2. If it needs a subagent, add `agents/<name>.md`
3. The command invokes `copilot-companion.mjs` via Bash — add a new `cmd*` function there if needed
