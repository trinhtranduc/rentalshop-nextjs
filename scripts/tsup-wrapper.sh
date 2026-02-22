#!/bin/sh
# Wrapper script to run tsup from root node_modules
# This ensures tsup is found on Vercel where yarn hoisting may not work correctly

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Try to find tsup in root node_modules
TSUP_BIN="$ROOT_DIR/node_modules/.bin/tsup"

# Debug: Print paths for troubleshooting
echo "TSUP_WRAPPER: SCRIPT_DIR=$SCRIPT_DIR" >&2
echo "TSUP_WRAPPER: ROOT_DIR=$ROOT_DIR" >&2
echo "TSUP_WRAPPER: TSUP_BIN=$TSUP_BIN" >&2
echo "TSUP_WRAPPER: Checking if tsup exists..." >&2

if [ -f "$TSUP_BIN" ]; then
  echo "TSUP_WRAPPER: Found tsup at $TSUP_BIN, using it" >&2
  # Found in root node_modules, use it
  node "$TSUP_BIN" "$@"
  exit $?
elif [ -f "$ROOT_DIR/node_modules/tsup/dist/cli.mjs" ]; then
  echo "TSUP_WRAPPER: Found tsup package, using node to run it" >&2
  # Found tsup package, run it directly
  node "$ROOT_DIR/node_modules/tsup/dist/cli.mjs" "$@"
  exit $?
elif command -v tsup >/dev/null 2>&1; then
  echo "TSUP_WRAPPER: Found tsup in PATH, using it" >&2
  # Found in PATH, use it
  tsup "$@"
  exit $?
else
  echo "TSUP_WRAPPER: tsup not found, trying npx as fallback" >&2
  # Not found, try npx as fallback
  npx --yes tsup "$@"
  exit $?
fi
