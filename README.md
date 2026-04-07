# Copilot Plugin for Claude Code

Use the local Copilot CLI from inside Claude Code — delegate coding tasks, get code reviews, and manage background jobs.

Mirrors the structure of [codex-plugin-cc](https://github.com/openai/codex-plugin-cc).

## Commands

| Command | Description |
|---------|-------------|
| `/copilot:setup` | Check local Copilot CLI availability |
| `/copilot:rescue [task]` | Delegate a coding task to Copilot |
| `/copilot:review` | Review current git changes |
| `/copilot:adversarial-review` | Challenge approach and design choices |
| `/copilot:status [job-id]` | Show active and recent jobs |
| `/copilot:result [job-id]` | Get the output of a finished job |
| `/copilot:cancel [job-id]` | Cancel a background job |

## Requirements

- Local Copilot CLI at `~/.superset/bin/copilot` (or set `COPILOT_BIN` env var)
- Node.js 18.18+

## Install

```bash
# Add this repo as a marketplace (local path)
/plugin marketplace add local:/path/to/copilot-plugin-cc

# Install the plugin
/plugin install copilot@copilot-local

# Reload
/reload-plugins

# Verify
/copilot:setup
```

## Usage

### Rescue (foreground)
```
/copilot:rescue implement the login flow in src/auth/login.ts following the pattern in src/auth/register.ts
```

### Rescue (background)
```
/copilot:rescue --background refactor the entire payment module
/copilot:status
/copilot:result
```

### Resume a previous job
```
/copilot:rescue --resume now fix the edge case in the validation logic
```

### Code review
```
/copilot:review
/copilot:review --base main security
/copilot:adversarial-review --base main
```

## Configuration

Set `COPILOT_BIN` to override the binary path:

```json
// ~/.claude/settings.json
{
  "env": {
    "COPILOT_BIN": "/path/to/your/copilot"
  }
}
```

## Architecture

```
Claude Code plugin
    ↓ node scripts/copilot-companion.mjs
Local Copilot CLI  (copilot -p "<prompt>" --yolo)
    ↓
Job state in ~/.claude/copilot-jobs/<session-id>/
```

Jobs are tracked as JSON files per session. Background jobs run as detached processes with output captured to a file.
