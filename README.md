# Copilot Bridge for Claude Code and Codex

Use the local Copilot CLI from Claude Code or Codex — delegate coding tasks, run review prompts, and manage background jobs.

Mirrors the structure of [codex-plugin-cc](https://github.com/openai/codex-plugin-cc).

## Claude Commands

| Command | Description |
|---------|-------------|
| `/copilot:setup` | Check local Copilot CLI availability |
| `/copilot:rescue [task]` | Delegate a coding task to Copilot |
| `/copilot:review` | Review current git changes |
| `/copilot:adversarial-review` | Challenge approach and design choices |
| `/copilot:status [job-id]` | Show active and recent jobs |
| `/copilot:result [job-id]` | Get the output of a finished job |
| `/copilot:cancel [job-id]` | Cancel a background job |

## Codex Support

This repo now includes Codex-compatible artifacts:

- Plugin manifest: `plugins/copilot/.codex-plugin/plugin.json`
- Skill: `plugins/copilot/skills/copilot/SKILL.md`
- Repo marketplace entry: `.agents/plugins/marketplace.json`

To install into a home Codex marketplace:

```bash
bash scripts/install-codex-plugin.sh
```

Optional override (install to a different home root):

```bash
HOME_DIR=/tmp/test-home bash scripts/install-codex-plugin.sh
```

Or install manually by ensuring `~/.agents/plugins/marketplace.json` contains this entry:

```json
{
  "name": "copilot",
  "source": {
    "source": "local",
    "path": "./.agents/plugins/copilot"
  },
  "policy": {
    "installation": "AVAILABLE",
    "authentication": "ON_INSTALL"
  },
  "category": "Productivity"
}
```

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

Set `COPILOT_BIN` to override the binary path.
Optionally set `COPILOT_JOBS_ROOT` to override where tracked jobs are persisted.

```json
// ~/.claude/settings.json or your Codex env config
{
  "env": {
    "COPILOT_BIN": "/path/to/your/copilot",
    "COPILOT_JOBS_ROOT": "/custom/job/storage/root"
  }
}
```

## Architecture

```
Claude plugin / Codex skill
    ↓ node scripts/copilot-companion.mjs
Local Copilot CLI  (copilot -p "<prompt>" --yolo)
    ↓
Job state in:
  - ~/.claude/copilot-jobs/<session-id>/ (Claude runtime)
  - ~/.codex/copilot-jobs/<session-id>/ (Codex runtime)
```

Jobs are tracked as JSON files per session. Background jobs run as detached processes with output captured to a file.
