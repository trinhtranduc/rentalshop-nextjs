#!/usr/bin/env bash
# Shared defaults for the mobile end-to-end scripts (#395). Source it, or run it to print the values.
# Every value can be overridden from the environment. Pick values no other agent is using:
# a simulator, an AVD + port, an API port and a database of your own.
set -euo pipefail

E2E_ROOT="${E2E_ROOT:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

# Database. E2E_DATABASE_URL (not DATABASE_URL) so a production URL exported in your shell is never picked up.
E2E_DATABASE_URL="${E2E_DATABASE_URL:-postgresql://postgres@127.0.0.1:54343/anyrent_mobile_e2e}"

# Local API.
E2E_API_PORT="${E2E_API_PORT:-3180}"
E2E_API_DIR="${E2E_API_DIR:-$E2E_ROOT/apps/api}"   # a prebuilt apps/api from another checkout also works
MOBILE_FEATURES="${MOBILE_FEATURES:-newOrders,newOrderDetail,newProducts,newCalendar,newOverview,newSettings}"

# node_modules used by seed-local.sh (prisma CLI, @prisma/client, bcryptjs). Point it at another checkout
# with the same prisma/schema.prisma when this one has no node_modules.
E2E_NODE_MODULES="${E2E_NODE_MODULES:-$E2E_ROOT/node_modules}"

# Devices. Never the user's emulators vm_pos / vm_kitchen (ports 5554 / 5556).
E2E_SIMULATOR="${E2E_SIMULATOR:-iPhone 17 Pro Max}"
E2E_AVD="${E2E_AVD:-anyrent_e2e}"
E2E_AVD_PORT="${E2E_AVD_PORT:-5570}"

# Output: logs, pid file, screenshots, derived data.
E2E_OUT="${E2E_OUT:-${TMPDIR:-/tmp}/anyrent-mobile-e2e}"

# Seed accounts (scripts/regenerate-entire-system-2025.js). Logins are single-session: one run per account.
E2E_MERCHANT_EMAIL="${E2E_MERCHANT_EMAIL:-merchant1@example.com}"
E2E_MERCHANT_PASSWORD="${E2E_MERCHANT_PASSWORD:-merchant123}"
E2E_STAFF_EMAIL="${E2E_STAFF_EMAIL:-staff.outlet1@example.com}"
E2E_STAFF_PASSWORD="${E2E_STAFF_PASSWORD:-staff123}"
# #682 Nhân viên kho (OUTLET_INVENTORY)
E2E_INVENTORY_EMAIL="${E2E_INVENTORY_EMAIL:-inventory.outlet1@example.com}"
E2E_INVENTORY_PASSWORD="${E2E_INVENTORY_PASSWORD:-inventory123}"
E2E_ACCOUNT="${E2E_ACCOUNT:-merchant}"   # merchant | staff | inventory

export E2E_ROOT E2E_DATABASE_URL E2E_API_PORT E2E_API_DIR MOBILE_FEATURES E2E_NODE_MODULES \
  E2E_SIMULATOR E2E_AVD E2E_AVD_PORT E2E_OUT \
  E2E_MERCHANT_EMAIL E2E_MERCHANT_PASSWORD E2E_STAFF_EMAIL E2E_STAFF_PASSWORD E2E_INVENTORY_EMAIL E2E_INVENTORY_PASSWORD E2E_ACCOUNT

# Credentials for the selected account.
e2e_account_credentials() {
  case "$E2E_ACCOUNT" in
    merchant) E2E_EMAIL="$E2E_MERCHANT_EMAIL"; E2E_PASSWORD="$E2E_MERCHANT_PASSWORD" ;;
    staff) E2E_EMAIL="$E2E_STAFF_EMAIL"; E2E_PASSWORD="$E2E_STAFF_PASSWORD" ;;
    inventory) E2E_EMAIL="$E2E_INVENTORY_EMAIL"; E2E_PASSWORD="$E2E_INVENTORY_PASSWORD" ;;
    *) echo "E2E_ACCOUNT must be merchant, staff or inventory (got '$E2E_ACCOUNT')" >&2; return 1 ;;
  esac
  export E2E_EMAIL E2E_PASSWORD
}

# postgresql://user:secret@host:port/db -> postgresql://user:***@host:port/db
e2e_mask_url() {
  printf '%s\n' "$1" | sed -E 's#(://[^:/@]+):[^@]*@#\1:***@#'
}

e2e_db_host() { printf '%s\n' "$1" | sed -E 's#^[a-z]+://([^@/]*@)?(\[[^]]*\]|[^:/?]*).*#\2#'; }
e2e_db_name() { printf '%s\n' "$1" | sed -E 's#^[a-z]+://[^/]*/?##; s#[?].*$##'; }

# Refuse anything that is not a named database on this machine. The seed wipes every table.
e2e_require_local_db() {
  local url="$1" host name
  host="$(e2e_db_host "$url")"
  name="$(e2e_db_name "$url")"
  echo "DATABASE_URL: $(e2e_mask_url "$url")"
  if [ "$host" != "127.0.0.1" ] && [ "$host" != "localhost" ]; then
    echo "REFUSED: database host '$host' is not 127.0.0.1 or localhost." >&2
    return 1
  fi
  if [ -z "$name" ]; then
    echo "REFUSED: the database name is empty." >&2
    return 1
  fi
}

e2e_api_base_url() { printf 'http://localhost:%s\n' "$E2E_API_PORT"; }

if [ "${BASH_SOURCE[0]}" = "$0" ]; then
  case "${1:-}" in
    -h|--help)
      cat <<'EOF'
Usage: scripts/mobile-e2e/env.sh [--help]
       source scripts/mobile-e2e/env.sh

Shared defaults for scripts/mobile-e2e/*. Run it to print the effective values.
Override any of these in the environment:
  E2E_DATABASE_URL   local Postgres URL (default postgresql://postgres@127.0.0.1:54343/anyrent_mobile_e2e)
  E2E_API_PORT       local API port (default 3180)
  E2E_API_DIR        apps/api to run (default this checkout; a prebuilt one from another checkout works)
  MOBILE_FEATURES    comma list of app-config flags turned on
  E2E_NODE_MODULES   node_modules for the seed (default this checkout)
  E2E_SIMULATOR      iOS simulator name (default "iPhone 17 Pro Max")
  E2E_AVD, E2E_AVD_PORT  Android AVD and console port (default anyrent_e2e / 5570; never vm_pos, vm_kitchen)
  E2E_OUT            output dir for logs, screenshots and derived data
  E2E_ACCOUNT        merchant | staff
  E2E_MERCHANT_EMAIL / E2E_MERCHANT_PASSWORD, E2E_STAFF_EMAIL / E2E_STAFF_PASSWORD
EOF
      exit 0 ;;
  esac
  for v in E2E_ROOT E2E_API_PORT E2E_API_DIR MOBILE_FEATURES E2E_NODE_MODULES E2E_SIMULATOR E2E_AVD \
    E2E_AVD_PORT E2E_OUT E2E_ACCOUNT E2E_MERCHANT_EMAIL E2E_STAFF_EMAIL; do
    printf '%s=%s\n' "$v" "${!v}"
  done
  printf 'E2E_DATABASE_URL=%s\n' "$(e2e_mask_url "$E2E_DATABASE_URL")"
fi
