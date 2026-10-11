#!/usr/bin/env bash
# #727 every Android flow in order, one summary at the end. The API restarts between flows (login rate limit ~10 / 15 min / IP).
#
#   source <env: E2E_DATABASE_URL, E2E_API_PORT, E2E_API_DIR, E2E_OUT, E2E_AVD(_PORT), JAVA_HOME>
#   scripts/mobile-e2e/seed-local.sh && scripts/mobile-e2e/prepare-accounts.sh create && scripts/mobile-e2e/api-local.sh start
#   scripts/mobile-e2e/android-e2e.sh --fresh        # boots the AVD (a window), builds and installs the app, first walk
#   tests/e2e/mobile/android-all.sh [flow ...]       # flows: overview stock calendar todo role sub limit (default: all)
#   LANGS="en vi" tests/e2e/mobile/android-all.sh sub
. "$(dirname "${BASH_SOURCE[0]}")/android-lib.sh"
F="$ROOT/tests/e2e/mobile/android-flows.sh"; API="$ROOT/scripts/mobile-e2e/api-local.sh"
LANGS="${LANGS:-en vi}"
SUB_SLUGS="${SUB_SLUGS:-expired-trial expired-active cancelled-ended paused past-due}"
[ -n "${KEEP_NOTES:-}" ] || rm -f "$OUT/notes.txt"   # KEEP_NOTES=1 appends to the notes of an earlier run
api_restart() { "$API" stop >/dev/null 2>&1; sleep 2; "$API" start >/dev/null 2>&1 || echo "API did not start"; }
run() { echo "=== $*"; api_restart; "$@" 2>&1 | grep -v "^tap: \|^wait: "; }
FLOWS=("$@"); [ ${#FLOWS[@]} -eq 0 ] && FLOWS=(overview stock calendar todo role sub limit)
has() { local f; for f in "${FLOWS[@]}"; do [ "$f" = "$1" ] && return 0; done; return 1; }

if has overview; then
  echo "=== overview"; "$API" stop >/dev/null 2>&1; sleep 2; "$API" start >/dev/null 2>&1
  MOBILE_STAT_API_URL="http://localhost:$E2E_API_PORT" node "$ROOT/tests/e2e/mobile/android-overview-api.js" > "$E2E_OUT/overview-api.json" && \
    { LANG_E2E=en; set_lang en; "$F" login "$E2E_MERCHANT_EMAIL" "$E2E_MERCHANT_PASSWORD" >/dev/null 2>&1; "$ROOT/tests/e2e/mobile/android-overview.sh" "$E2E_OUT/overview-api.json" 2>&1 | grep -v "^tap: \|^wait: "; }
fi
for l in $LANGS; do
  export LANG_E2E=$l
  has stock && [ "$l" = en ] && run "$F" stock
  has calendar && run "$F" calendar
  has todo && run "$F" todo
  if has role; then for r in staff kho; do run "$F" role $r; done; fi
  if has limit; then for r in owner staff kho; do [ "$l" = vi ] && [ "$r" != owner ] && continue; run "$F" limit $r; done; fi
  if has sub; then for s in $SUB_SLUGS; do for r in owner staff kho; do [ "$l" = vi ] && [ "$r" != owner ] && continue; run "$F" sub $s $r; done; done; fi
done
echo
echo "================ summary"
grep -c "ANDROID_NOTE: PASS" "$OUT/notes.txt" | sed 's/^/PASS  /'
grep "ANDROID_NOTE: KNOWN" "$OUT/notes.txt" | cut -c15-
grep "ANDROID_NOTE: FAIL" "$OUT/notes.txt" | cut -c15- | sed 's/^/FAIL  /'
