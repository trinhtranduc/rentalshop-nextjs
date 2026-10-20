#!/usr/bin/env bash
# Online booking end-to-end run (#1124) on a LOCAL seeded database and a LOCAL API.
# Runs tests/e2e/business/online-booking.e2e.test.js through scripts/e2e/business-e2e.sh (seed, API start per time
# zone, TZ=UTC and TZ=Asia/Ho_Chi_Minh, summary). API-only: no browser, no simulator. Never dev-api or production.
#
#   scripts/e2e/booking-e2e.sh [--no-seed] [--build] [--tz "UTC Asia/Ho_Chi_Minh"]
#
# Own defaults (override in the environment): E2E_DATABASE_URL=postgresql://postgres@127.0.0.1:54343/anyrent_booking_e2e,
# E2E_API_PORT=3195. The seed WIPES that local database. Steps covered: booking switch, public free/full calendar,
# public create (valid, honeypot, rate limits, full product), tracking by code (masked phone), shop list scope,
# prepare, confirm through POST /api/orders bookingRequestId (second confirm 409), reject, 24 h expiry (psql fixture).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
export E2E_DATABASE_URL="${E2E_DATABASE_URL:-postgresql://postgres@127.0.0.1:54343/anyrent_booking_e2e}"
export E2E_API_PORT="${E2E_API_PORT:-3195}"

case "${1:-}" in
  -h|--help) sed -n '2,12p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
esac

exec "$HERE/business-e2e.sh" "$@" -- online-booking.e2e
