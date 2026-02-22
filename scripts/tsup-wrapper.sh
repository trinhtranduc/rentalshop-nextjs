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
echo "TSUP_WRAPPER: Checking if $ROOT_DIR/node_modules/tsup exists..." >&2

# Check if tsup package exists in root
if [ -d "$ROOT_DIR/node_modules/tsup" ]; then
  echo "TSUP_WRAPPER: Found tsup package directory in root" >&2
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

# Try to find tsup in package-level node_modules (if not hoisted)
echo "TSUP_WRAPPER: tsup not found in root, checking package-level node_modules..." >&2
CURRENT_PKG_DIR="$(pwd)"
echo "TSUP_WRAPPER: CURRENT_PKG_DIR=$CURRENT_PKG_DIR" >&2

# Check package-level node_modules
if [ -d "$CURRENT_PKG_DIR/node_modules/tsup" ]; then
  echo "TSUP_WRAPPER: Found tsup in package node_modules" >&2
  if [ -f "$CURRENT_PKG_DIR/node_modules/tsup/dist/cli-default.js" ]; then
    echo "TSUP_WRAPPER: Using package-level tsup at $CURRENT_PKG_DIR/node_modules/tsup/dist/cli-default.js" >&2
    node "$CURRENT_PKG_DIR/node_modules/tsup/dist/cli-default.js" "$@"
    exit $?
  fi
fi

# Try to find tsup in any package's node_modules
echo "TSUP_WRAPPER: Searching for tsup in all packages..." >&2
for pkg_dir in "$ROOT_DIR/packages"/*; do
  if [ -d "$pkg_dir/node_modules/tsup" ]; then
    echo "TSUP_WRAPPER: Found tsup in $pkg_dir/node_modules/tsup" >&2
    if [ -f "$pkg_dir/node_modules/tsup/dist/cli-default.js" ]; then
      echo "TSUP_WRAPPER: Using tsup from $pkg_dir" >&2
      node "$pkg_dir/node_modules/tsup/dist/cli-default.js" "$@"
      exit $?
    fi
  fi
done

# Last resort: use npx with NODE_PATH to find typescript from workspace
# This ensures tsup can find typescript even when installed by npx
echo "TSUP_WRAPPER: tsup not found in any location, using npx with NODE_PATH" >&2
cd "$ROOT_DIR"

# Set NODE_PATH to include root node_modules so typescript can be found
# This allows npx-installed tsup to find typescript from workspace
export NODE_PATH="$ROOT_DIR/node_modules:${NODE_PATH:-}"

# Also add package node_modules to NODE_PATH if it exists
if [ -d "$CURRENT_PKG_DIR/node_modules" ]; then
  export NODE_PATH="$CURRENT_PKG_DIR/node_modules:$NODE_PATH"
fi

echo "TSUP_WRAPPER: NODE_PATH=$NODE_PATH" >&2
echo "TSUP_WRAPPER: Using npx --yes tsup with workspace typescript resolution" >&2

# Use npx --yes to auto-install tsup, but with NODE_PATH set so it can find typescript
npx --yes tsup "$@" 2>&1
exit $?
