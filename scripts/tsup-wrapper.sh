#!/bin/sh
# Wrapper script to run tsup from root node_modules
# This ensures tsup is found on Vercel where yarn hoisting may not work correctly

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Try to find tsup in multiple locations
TSUP_BIN="$ROOT_DIR/node_modules/.bin/tsup"
TSUP_DEFAULT_CLI="$ROOT_DIR/node_modules/tsup/dist/cli-default.js"
TSUP_PKG_CLI="$ROOT_DIR/node_modules/tsup/dist/cli.mjs"
TSUP_PKG_BIN="$ROOT_DIR/node_modules/tsup/bin/tsup"

# Debug: Print paths for troubleshooting
echo "TSUP_WRAPPER: SCRIPT_DIR=$SCRIPT_DIR" >&2
echo "TSUP_WRAPPER: ROOT_DIR=$ROOT_DIR" >&2
echo "TSUP_WRAPPER: Checking for tsup..." >&2

# Check if tsup package exists
if [ -d "$ROOT_DIR/node_modules/tsup" ]; then
  echo "TSUP_WRAPPER: Found tsup package directory" >&2
  
  # Try cli-default.js first (this is what .bin/tsup symlinks to)
  if [ -f "$TSUP_DEFAULT_CLI" ]; then
    echo "TSUP_WRAPPER: Found tsup at $TSUP_DEFAULT_CLI, using it" >&2
    node "$TSUP_DEFAULT_CLI" "$@"
    exit $?
  fi
  
  # Try other entry points
  if [ -f "$TSUP_PKG_CLI" ]; then
    echo "TSUP_WRAPPER: Found tsup at $TSUP_PKG_CLI, using it" >&2
    node "$TSUP_PKG_CLI" "$@"
    exit $?
  fi
  
  if [ -f "$TSUP_PKG_BIN" ]; then
    echo "TSUP_WRAPPER: Found tsup at $TSUP_PKG_BIN, using it" >&2
    node "$TSUP_PKG_BIN" "$@"
    exit $?
  fi
  
  if [ -f "$ROOT_DIR/node_modules/tsup/dist/cli.js" ]; then
    echo "TSUP_WRAPPER: Found tsup at dist/cli.js, using it" >&2
    node "$ROOT_DIR/node_modules/tsup/dist/cli.js" "$@"
    exit $?
  fi
  
  if [ -f "$ROOT_DIR/node_modules/tsup/dist/index.js" ]; then
    echo "TSUP_WRAPPER: Found tsup at dist/index.js, using it" >&2
    node "$ROOT_DIR/node_modules/tsup/dist/index.js" "$@"
    exit $?
  fi
fi

# Try .bin symlink (may not work on Vercel)
if [ -f "$TSUP_BIN" ] || [ -L "$TSUP_BIN" ]; then
  echo "TSUP_WRAPPER: Found tsup symlink at $TSUP_BIN, using it" >&2
  node "$TSUP_BIN" "$@"
  exit $?
fi

# Last resort: try to use yarn to run tsup from workspace
echo "TSUP_WRAPPER: tsup not found in any location, trying yarn tsup from workspace root" >&2
cd "$ROOT_DIR" && yarn tsup "$@" 2>&1
exit $?
