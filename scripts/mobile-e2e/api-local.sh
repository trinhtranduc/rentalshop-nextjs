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
stop      stop the API started on $E2E_API_PORT (only that port).
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

listener_pids() { lsof -nP -tiTCP:"$E2E_API_PORT" -sTCP:LISTEN 2>/dev/null || true; }

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
  mkdir -p "$E2E_OUT"
  if [ -n "$(listener_pids)" ]; then
    echo "Port $E2E_API_PORT is already in use (pid $(listener_pids | tr '\n' ' ')). Pick another E2E_API_PORT or run stop." >&2
    exit 1
  fi
  if [ "$build" = 1 ]; then build_api; fi
  [ -d "$E2E_API_DIR/.next" ] || { echo "No build in $E2E_API_DIR/.next. Use --build or E2E_API_DIR." >&2; exit 1; }

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
  for _ in $(seq 1 90); do
    if healthy; then
      echo "API healthy: $BASE (pid $(cat "$PID_FILE"), log $LOG_FILE)"
      return 0
    fi
    sleep 1
  done
  echo "API did not become healthy in 90 s. Last log lines:" >&2
  tail -20 "$LOG_FILE" >&2 || true
  stop
  exit 1
}

stop() {
  local pids
  if [ -f "$PID_FILE" ]; then
    kill "$(cat "$PID_FILE")" 2>/dev/null || true
    rm -f "$PID_FILE"
  fi
  # npx forks node; whatever still listens on OUR port goes too.
  pids="$(listener_pids)"
  if [ -n "$pids" ]; then
    # shellcheck disable=SC2086
    kill $pids 2>/dev/null || true
    sleep 1
  fi
  if [ -n "$(listener_pids)" ]; then
    echo "Port $E2E_API_PORT still in use." >&2
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
