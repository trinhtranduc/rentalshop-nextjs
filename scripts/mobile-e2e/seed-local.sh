#!/usr/bin/env bash
# Create (if missing) and seed a dedicated LOCAL database for mobile e2e runs (#395).
# scripts/regenerate-entire-system-2025.js deletes every Payment, Subscription, Plan, OrderItem, Order,
# OutletStock, Product, Category, Customer, User, Outlet and Merchant row before it seeds, so this script
# refuses any DATABASE_URL that is not on 127.0.0.1/localhost or has no database name.
set -euo pipefail
# shellcheck source=env.sh
. "$(dirname "${BASH_SOURCE[0]}")/env.sh"

usage() {
  cat <<'EOF'
Usage: scripts/mobile-e2e/seed-local.sh [--help] [--no-push]

Seeds E2E_DATABASE_URL (default postgresql://postgres@127.0.0.1:54343/anyrent_mobile_e2e):
  1. refuses unless the host is 127.0.0.1 or localhost and the database name is set
  2. creates the database if it does not exist
  3. prisma db push (skip with --no-push)
  4. CREATE EXTENSION unaccent (production has it; db push does not), warns if not possible
  5. node scripts/regenerate-entire-system-2025.js  -- WIPES all business tables, then seeds
  6. prints row counts and the seed accounts

Needs psql, node, and node_modules with prisma + @prisma/client generated for this schema
(E2E_NODE_MODULES, default <repo>/node_modules). Never point it at a shared database other agents use.
EOF
}

PUSH=1
for arg in "$@"; do
  case "$arg" in
    -h|--help) usage; exit 0 ;;
    --no-push) PUSH=0 ;;
    *) echo "Unknown argument: $arg" >&2; usage >&2; exit 64 ;;
  esac
done

URL="$E2E_DATABASE_URL"
e2e_require_local_db "$URL"
DB_NAME="$(e2e_db_name "$URL")"
# Same server, maintenance database "postgres".
ADMIN_URL="$(printf '%s\n' "$URL" | sed -E "s#/${DB_NAME}([?].*)?\$#/postgres\\1#")"

PRISMA="$E2E_NODE_MODULES/.bin/prisma"
for need in psql node; do
  command -v "$need" >/dev/null || { echo "Missing $need on PATH" >&2; exit 1; }
done
[ -x "$PRISMA" ] || { echo "Missing $PRISMA. Run 'yarn install --frozen-lockfile && yarn db:generate' or set E2E_NODE_MODULES." >&2; exit 1; }
[ -d "$E2E_NODE_MODULES/.prisma/client" ] || { echo "No generated prisma client in $E2E_NODE_MODULES/.prisma/client (yarn db:generate)." >&2; exit 1; }

if [ "$(psql "$ADMIN_URL" -tAc "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME'")" != "1" ]; then
  echo "Creating database $DB_NAME"
  psql "$ADMIN_URL" -qc "CREATE DATABASE \"$DB_NAME\""
else
  echo "Database $DB_NAME exists"
fi

export DATABASE_URL="$URL"
cd "$E2E_ROOT"

if [ "$PUSH" = 1 ]; then
  echo "prisma db push"
  "$PRISMA" db push --schema prisma/schema.prisma --skip-generate --accept-data-loss
fi

if psql "$URL" -qc 'CREATE EXTENSION IF NOT EXISTS unaccent' 2>/dev/null; then
  echo "unaccent extension: ok"
else
  echo "WARN: could not create the unaccent extension; accent-insensitive search falls back." >&2
fi

echo "Seeding (wipes and regenerates all business data in $DB_NAME)"
NODE_PATH="$E2E_NODE_MODULES" node scripts/regenerate-entire-system-2025.js

echo
echo "Row counts:"
psql "$URL" -c "SELECT 'Merchant' AS table, count(*) FROM \"Merchant\"
  UNION ALL SELECT 'Outlet', count(*) FROM \"Outlet\"
  UNION ALL SELECT 'User', count(*) FROM \"User\"
  UNION ALL SELECT 'Category', count(*) FROM \"Category\"
  UNION ALL SELECT 'Product', count(*) FROM \"Product\"
  UNION ALL SELECT 'Customer', count(*) FROM \"Customer\"
  UNION ALL SELECT 'Order', count(*) FROM \"Order\"
  UNION ALL SELECT 'OrderItem', count(*) FROM \"OrderItem\""

echo "Seed accounts (passwords: ADMIN admin123, MERCHANT merchant123, OUTLET_ADMIN admin123, OUTLET_STAFF staff123, OUTLET_INVENTORY inventory123):"
psql "$URL" -c "SELECT u.email, u.role, o.name AS outlet
  FROM \"User\" u LEFT JOIN \"Outlet\" o ON o.id = u.\"outletId\" ORDER BY u.role, u.email"
