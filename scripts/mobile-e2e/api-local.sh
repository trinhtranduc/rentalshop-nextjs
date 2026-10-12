#!/usr/bin/env bash
# Start, stop or check a local AnyRent API for mobile e2e runs (#395).
set -euo pipefail
# shellcheck source=env.sh
. "$(dirname "${BASH_SOURCE[0]}")/env.sh"

usage() {
  cat <<'EOF'
Usage: scripts/mobile-e2e/api-local.sh start [--build] | stop | status | --help

start     next start -p $E2E_API_PORT in $E2E_API_DIR with DATABASE_URL=$E2E_DATABASE_URL, test JWT secrets,
          SKIP_ENV_VALIDATION=true, NODE_ENV=production and MOBILE_FEATURES. Waits for /api/health.
          Writes $E2E_OUT/api-<port>.pid and $E2E_OUT/api-<port>.log.
  --build build the API of THIS checkout first: yarn install --frozen-lockfile --prefer-offline,
          prisma generate, turbo build of @rentalshop/api, copy the prisma client into
          apps/api/node_modules/.prisma/client, then restore the tracked packages/*/dist files.
          Fails when the port is already in use, or when the process answering on it is not the one started.
stop      stop the API this script started on $E2E_API_PORT (its pid file); another process is left alone.
status    print pid, URL and the /api/mobile/app-config flags.

Two ways to get a built API:
  1. this checkout:   scripts/mobile-e2e/api-local.sh start --build
  2. a prebuilt one:  E2E_API_DIR=/path/to/other-checkout/apps/api scripts/mobile-e2e/api-local.sh start
     (same prisma/schema.prisma; that checkout is only read, never rebuilt)
iOS/Android cache /api/mobile/app-config for up to 5 minutes: after changing MOBILE_FEATURES reinstall the app.
EOF
}

PID_FILE="$E2E_OUT/api-$E2E_API_PORT.pid"
LOG_FILE="$E2E_OUT/api-$E2E_API_PORT.log"
BASE="$(e2e_api_base_url)"

# lsof lives in /usr/sbin on macOS, which is not always on PATH (#924: an empty answer meant "port free").
LSOF="$(command -v lsof 2>/dev/null || true)"
if [ -z "$LSOF" ] && [ -x /usr/sbin/lsof ]; then LSOF=/usr/sbin/lsof; fi

require_lsof() {
  if [ -z "$LSOF" ]; then
    echo "lsof not found (looked on PATH and in /usr/sbin); cannot check who owns port $E2E_API_PORT." >&2
    exit 1
  fi
}

listener_pids() { "$LSOF" -nP -tiTCP:"$E2E_API_PORT" -sTCP:LISTEN 2>/dev/null | sort -u || true; }

# Fail when anything listens on the port: its /api/health would look like ours (#924).
require_port_free() {
  local pids
  pids="$(listener_pids | tr '\n' ' ')"
  pids="${pids% }"
  if [ -n "$pids" ]; then
    echo "Port $E2E_API_PORT is already in use (pid $pids). Pick another E2E_API_PORT, or run stop if it is yours." >&2
    exit 1
  fi
}

# Is $1 the process $2 or one of its descendants? (npx forks node, next may fork again)
is_descendant() {
  local p="$1" i=0
  while [ -n "$p" ] && [ "$p" -gt 1 ] && [ "$i" -lt 64 ]; do
    if [ "$p" = "$2" ]; then return 0; fi
    p="$(ps -o ppid= -p "$p" 2>/dev/null | tr -d ' ' || true)"
    i=$((i + 1))
  done
  return 1
}

# A listener on the port that is not $1 or its descendant (empty when all are ours; "?" when none listens).
foreign_listener() {
  local pid
  local pids
  pids="$(listener_pids)"
  if [ -z "$pids" ]; then echo "?"; return 0; fi
  for pid in $pids; do
    if ! is_descendant "$pid" "$1"; then echo "$pid"; return 0; fi
  done
}

# Kill $1 and its descendants, children first.
kill_tree() {
  local child
  for child in $(pgrep -P "$1" 2>/dev/null || true); do kill_tree "$child"; done
  kill "$1" 2>/dev/null || true
}

healthy() { curl -fsS -m 3 "$BASE/api/health" >/dev/null 2>&1; }

build_api() {
  if [ "$E2E_API_DIR" != "$E2E_ROOT/apps/api" ]; then
    echo "--build only builds this checkout's apps/api; unset E2E_API_DIR or drop --build." >&2
    exit 64
  fi
  cd "$E2E_ROOT"
  yarn install --frozen-lockfile --prefer-offline
  npx prisma generate --schema=./prisma/schema.prisma
  SKIP_ENV_VALIDATION=true npx turbo run build --filter=@rentalshop/api
  mkdir -p apps/api/node_modules/.prisma
  rm -rf apps/api/node_modules/.prisma/client
  cp -R node_modules/.prisma/client apps/api/node_modules/.prisma/client
  # The build rewrites tracked dist files; keep the working tree clean.
  local f
  git ls-files -m -- 'packages/*/dist' | while IFS= read -r f; do git checkout -- "$f"; done
}

start() {
  local build=0
  for arg in "$@"; do
    case "$arg" in
      --build) build=1 ;;
      *) echo "Unknown argument: $arg" >&2; usage >&2; exit 64 ;;
    esac
  done
  e2e_require_local_db "$E2E_DATABASE_URL"
  require_lsof
  mkdir -p "$E2E_OUT"
  require_port_free
  if [ "$build" = 1 ]; then build_api; fi
  [ -d "$E2E_API_DIR/.next" ] || { echo "No build in $E2E_API_DIR/.next. Use --build or E2E_API_DIR." >&2; exit 1; }
  # Again: the build takes minutes and another agent may have taken the port meanwhile.
  require_port_free

  local pid foreign
  echo "Starting API on $BASE from $E2E_API_DIR"
  echo "MOBILE_FEATURES=$MOBILE_FEATURES"
  (
    cd "$E2E_API_DIR"
    DATABASE_URL="$E2E_DATABASE_URL" \
    JWT_SECRET="e2e-local-jwt-secret" JWT_REFRESH_SECRET="e2e-local-jwt-refresh-secret" \
    SKIP_ENV_VALIDATION=true NODE_ENV=production MOBILE_FEATURES="$MOBILE_FEATURES" \
      nohup npx next start -p "$E2E_API_PORT" >"$LOG_FILE" 2>&1 &
    echo $! >"$PID_FILE"
  )
  pid="$(cat "$PID_FILE")"
  echo "Waiting for /api/health (started pid $pid)"
  for _ in $(seq 1 90); do
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "API process $pid exited before it became healthy (listening now: $(listener_pids | tr '\n' ' ')). Last log lines:" >&2
      tail -20 "$LOG_FILE" >&2 || true
      rm -f "$PID_FILE"
      exit 1
    fi
    if healthy; then
      # #924 /api/health answering is not enough: the listener must be the process started above.
      foreign="$(foreign_listener "$pid")"
      if [ -n "$foreign" ]; then
        echo "Port $E2E_API_PORT answered but pid $foreign is not the API this script started (started pid $pid)." >&2
        echo "Another process owns the port; stopping only ours. Pick another E2E_API_PORT." >&2
        kill_tree "$pid"
        rm -f "$PID_FILE"
        exit 1
      fi
      echo "API healthy: $BASE (pid $pid, log $LOG_FILE)"
      return 0
    fi
    sleep 1
  done
  echo "API did not become healthy in 90 s. Last log lines:" >&2
  tail -20 "$LOG_FILE" >&2 || true
  kill_tree "$pid"
  rm -f "$PID_FILE"
  exit 1
}

stop() {
  local pids
  require_lsof
  if [ -f "$PID_FILE" ]; then
    # npx forks node: stop the whole tree we started, never another process on the port (#924).
    kill_tree "$(cat "$PID_FILE")"
    rm -f "$PID_FILE"
    sleep 1
  fi
  pids="$(listener_pids | tr '\n' ' ')"
  pids="${pids% }"
  if [ -n "$pids" ]; then
    echo "Port $E2E_API_PORT still in use by pid $pids, not started by this script (no $PID_FILE); left running." >&2
    exit 1
  fi
  echo "API on port $E2E_API_PORT stopped"
}

status() {
  if healthy; then
    echo "API up: $BASE (pid $(cat "$PID_FILE" 2>/dev/null || echo '?'))"
    curl -fsS -m 3 "$BASE/api/mobile/app-config" || true
    echo
  else
    echo "API down on port $E2E_API_PORT"
    return 1
  fi
}

case "${1:-}" in
  start) shift; start "$@" ;;
  stop) stop ;;
  status) status ;;
  -h|--help) usage ;;
  *) usage >&2; exit 64 ;;
esac
