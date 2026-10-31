#!/usr/bin/env bash
# Registers a truly empty new shop on the local API (#1393): what a new customer gets from POST /api/auth/register.
# Prints E2E_EMAIL=... and E2E_PASSWORD=... so a run can log in with it. Local API only.
set -euo pipefail
# shellcheck source=env.sh
. "$(dirname "${BASH_SOURCE[0]}")/env.sh"

case "$(e2e_api_base_url)" in
  http://localhost:*|http://127.0.0.1:*) ;;
  *) echo "REFUSED: this script only registers on a local API." >&2; exit 1 ;;
esac

stamp="$(date +%s)"
email="newshop${stamp}@example.com"
password="newshop123"
phone="09$(printf '%08d' $((stamp % 100000000)))"
answer="$(curl -fsS -m 30 -X POST "$(e2e_api_base_url)/api/auth/register" -H 'Content-Type: application/json' \
  -d "{\"email\":\"$email\",\"password\":\"$password\",\"firstName\":\"Chu\",\"lastName\":\"Shop\",\"businessName\":\"Shop $stamp\",\"phone\":\"$phone\",\"role\":\"MERCHANT\"}")"
printf '%s' "$answer" | grep -q '"success":true' || { echo "Register failed: $answer" >&2; exit 1; }
echo "E2E_EMAIL=$email"
echo "E2E_PASSWORD=$password"
