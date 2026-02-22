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

# Last resort: try to install tsup in root and use it
# This ensures tsup can find typescript from workspace
echo "TSUP_WRAPPER: tsup not found in any location, installing in root..." >&2
cd "$ROOT_DIR"

# Check if tsup is in root package.json devDependencies
if grep -q '"tsup"' "$ROOT_DIR/package.json"; then
  echo "TSUP_WRAPPER: tsup found in root package.json, installing..." >&2
  # Install tsup in root if not already installed
  if [ ! -d "$ROOT_DIR/node_modules/tsup" ]; then
    yarn add -D tsup --ignore-workspace-root-check 2>&1 || true
  fi
  
  # Try to use tsup from root after installation
  if [ -f "$ROOT_DIR/node_modules/tsup/dist/cli-default.js" ]; then
    echo "TSUP_WRAPPER: Using tsup from root after installation" >&2
    node "$ROOT_DIR/node_modules/tsup/dist/cli-default.js" "$@" 2>&1
    exit $?
  fi
fi

# Final fallback: use yarn to run tsup from workspace
# This should work because yarn will resolve tsup from workspace dependencies
echo "TSUP_WRAPPER: Final fallback: yarn tsup from root with workspace context" >&2
cd "$ROOT_DIR"
yarn tsup "$@" 2>&1
exit $?
