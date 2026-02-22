#!/bin/sh
# Wrapper script to run tsup from root node_modules
# This ensures tsup is found on Vercel where yarn hoisting may not work correctly

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Try to find tsup in root node_modules
TSUP_BIN="$ROOT_DIR/node_modules/.bin/tsup"

# Debug: Print paths (commented out for production)
# echo "SCRIPT_DIR: $SCRIPT_DIR" >&2
# echo "ROOT_DIR: $ROOT_DIR" >&2
# echo "TSUP_BIN: $TSUP_BIN" >&2

if [ -f "$TSUP_BIN" ]; then
  # Found in root node_modules, use it
  node "$TSUP_BIN" "$@"
  exit $?
elif command -v tsup >/dev/null 2>&1; then
  # Found in PATH, use it
  tsup "$@"
  exit $?
else
  # Not found, try npx as fallback
  npx --yes tsup "$@"
  exit $?
fi
