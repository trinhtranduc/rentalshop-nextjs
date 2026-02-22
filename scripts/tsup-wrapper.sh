#!/bin/sh
# Wrapper script to run tsup from root node_modules
# This ensures tsup is found on Vercel where yarn hoisting may not work correctly

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Try to find tsup in root node_modules
TSUP_BIN="$ROOT_DIR/node_modules/.bin/tsup"

if [ -f "$TSUP_BIN" ]; then
  # Found in root node_modules, use it
  exec node "$TSUP_BIN" "$@"
elif command -v tsup >/dev/null 2>&1; then
  # Found in PATH, use it
  exec tsup "$@"
else
  # Not found, try npx as fallback
  exec npx --yes tsup "$@"
fi
