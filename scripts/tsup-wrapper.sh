#!/bin/sh
# Wrapper script to run tsup from root node_modules
# This ensures tsup is found on Vercel where yarn hoisting may not work correctly

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Try to find tsup in multiple locations
TSUP_BIN="$ROOT_DIR/node_modules/.bin/tsup"
TSUP_PKG_CLI="$ROOT_DIR/node_modules/tsup/dist/cli.mjs"
TSUP_PKG_BIN="$ROOT_DIR/node_modules/tsup/bin/tsup"

# Debug: Print paths for troubleshooting
echo "TSUP_WRAPPER: SCRIPT_DIR=$SCRIPT_DIR" >&2
echo "TSUP_WRAPPER: ROOT_DIR=$ROOT_DIR" >&2
echo "TSUP_WRAPPER: Checking for tsup..." >&2
echo "TSUP_WRAPPER: TSUP_BIN=$TSUP_BIN" >&2
echo "TSUP_WRAPPER: TSUP_PKG_CLI=$TSUP_PKG_CLI" >&2
echo "TSUP_WRAPPER: TSUP_PKG_BIN=$TSUP_PKG_BIN" >&2

if [ -f "$TSUP_BIN" ]; then
  echo "TSUP_WRAPPER: Found tsup at $TSUP_BIN, using it" >&2
  node "$TSUP_BIN" "$@"
  exit $?
elif [ -f "$TSUP_PKG_CLI" ]; then
  echo "TSUP_WRAPPER: Found tsup package CLI at $TSUP_PKG_CLI, using it" >&2
  node "$TSUP_PKG_CLI" "$@"
  exit $?
elif [ -f "$TSUP_PKG_BIN" ]; then
  echo "TSUP_WRAPPER: Found tsup package bin at $TSUP_PKG_BIN, using it" >&2
  node "$TSUP_PKG_BIN" "$@"
  exit $?
elif [ -d "$ROOT_DIR/node_modules/tsup" ]; then
  echo "TSUP_WRAPPER: Found tsup package directory, trying to find entry point" >&2
  # Try to find the entry point in the package
  if [ -f "$ROOT_DIR/node_modules/tsup/dist/cli.js" ]; then
    node "$ROOT_DIR/node_modules/tsup/dist/cli.js" "$@"
    exit $?
  elif [ -f "$ROOT_DIR/node_modules/tsup/dist/index.js" ]; then
    node "$ROOT_DIR/node_modules/tsup/dist/index.js" "$@"
    exit $?
  fi
fi

# Last resort: try to use yarn to run tsup from workspace
echo "TSUP_WRAPPER: Trying yarn tsup from workspace root" >&2
cd "$ROOT_DIR" && yarn tsup "$@" 2>&1
exit $?
