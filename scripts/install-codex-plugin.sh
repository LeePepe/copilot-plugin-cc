#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PLUGIN_NAME="copilot"
HOME_DIR="${HOME_DIR:-$HOME}"
AGENTS_PLUGINS_DIR="$HOME_DIR/.agents/plugins"
TARGET_PLUGIN_DIR="$AGENTS_PLUGINS_DIR/$PLUGIN_NAME"
MARKETPLACE_PATH="$AGENTS_PLUGINS_DIR/marketplace.json"

if [ ! -d "$REPO_ROOT/plugins/$PLUGIN_NAME" ]; then
  echo "Source plugin directory not found: $REPO_ROOT/plugins/$PLUGIN_NAME" >&2
  exit 1
fi

mkdir -p "$AGENTS_PLUGINS_DIR"
rm -rf "$TARGET_PLUGIN_DIR"
cp -R "$REPO_ROOT/plugins/$PLUGIN_NAME" "$TARGET_PLUGIN_DIR"

node --input-type=module - "$MARKETPLACE_PATH" "$PLUGIN_NAME" <<'NODE'
import fs from "node:fs";

const marketplacePath = process.argv[2];
const pluginName = process.argv[3];

let marketplace = { name: "home", plugins: [] };
if (fs.existsSync(marketplacePath)) {
  const raw = fs.readFileSync(marketplacePath, "utf8").trim();
  if (raw) {
    marketplace = JSON.parse(raw);
  }
}

if (!marketplace || typeof marketplace !== "object") {
  marketplace = { name: "home", plugins: [] };
}
if (!Array.isArray(marketplace.plugins)) {
  marketplace.plugins = [];
}
if (!marketplace.name) {
  marketplace.name = "home";
}

const entry = {
  name: pluginName,
  source: {
    source: "local",
    path: `./.agents/plugins/${pluginName}`,
  },
  policy: {
    installation: "AVAILABLE",
    authentication: "ON_INSTALL",
  },
  category: "Productivity",
};

const idx = marketplace.plugins.findIndex((p) => p && p.name === pluginName);
if (idx >= 0) {
  marketplace.plugins[idx] = { ...marketplace.plugins[idx], ...entry };
} else {
  marketplace.plugins.push(entry);
}

fs.writeFileSync(marketplacePath, `${JSON.stringify(marketplace, null, 2)}\n`);
NODE

echo "Installed plugin to: $TARGET_PLUGIN_DIR"
echo "Updated marketplace: $MARKETPLACE_PATH"
echo "Next: restart Codex to reload plugin/skill discovery."
