#!/usr/bin/env bash
# #727 Android flows driven with adb-ui.sh (emulator-$E2E_AVD_PORT). Every result is an `ANDROID_NOTE: ...` line (PASS / FAIL / KNOWN
# / data) in the same format as the iOS notes, so tests/e2e/mobile/{stock-flow,calendar,todo,detail}-check.js read the output too.
# LANG_E2E=vi|en (default en) sets the app language through the per-app locale: no emulator locale change.
#
#   android-flows.sh login <email> <password>        log in (logs out first when another account is in)
#   android-flows.sh tabs <tag>                      visit every tab, note its texts, flag raw API codes
#   android-flows.sh sub <slug> <owner|staff|kho>    broken subscription -> tabs -> create attempts -> fixed -> Home lists again
#   android-flows.sh stock                           the stock scenario: initial lines, a sale, a rent, Out tag, free days; then stock-flow-check.js
#   android-flows.sh calendar                        the ops scenario calendar, every day -5..+4 vs the API (calendar-check.js)
#   android-flows.sh todo                            the ops scenario Today card and lists vs outlet-operations (todo-check.js)
#   android-flows.sh limit <owner|staff|kho>         at-limit: add product / customer / order -> readable limit message, nothing created
#   android-flows.sh role <staff|kho>                ops scenario role screens: no revenue, no delete, orders / calendar load
#
# Install the app first: scripts/mobile-e2e/android-e2e.sh --fresh. Emulator text cannot be typed in Vietnamese: only ASCII is typed.
. "$(dirname "${BASH_SOURCE[0]}")/android-lib.sh"
CHK="$ROOT/tests/e2e/mobile"
RAW='(^|[ |¦])[A-Z][A-Z0-9]*(_[A-Z0-9]+)+([ |¦]|$)|SUBSCRIPTION_|PLAN_LIMIT|PERIOD_ENDED|NO_SUBSCRIPTION|INSUFFICIENT_PERMISSIONS|VALIDATION_ERROR|errors\.[a-zA-Z]|auth\.[a-z]+\.'
psqlc() { psql "$E2E_DATABASE_URL" -qAt -F ' ' "$@"; }
tabs_specs() { echo "$(L home)|$(L orders)|$(L calendar)|$(L overview)|$(L settings)"; }

do_tabs() { # do_tabs <tag>: visit every tab, note the texts, flag raw keys; returns 1 when a raw key shows
  local tag="$1" n=0 raw=0 spec t IFS_=$IFS
  note "SUB $tag after-login | $(texts)"
  IFS='|'; for spec in $(tabs_specs); do
    IFS=$IFS_; n=$((n + 1))
    if tap_any "$spec"; then
      sleep 4; "$U" shot "a-${tag//\//-}-tab$n" >/dev/null
      t="$(texts)"; note "SUB $tag tab$n ($spec) | $t"
      if echo "$t" | grep -Eq "$RAW"; then note "RAWKEY $tag tab$n | $(echo "$t" | grep -Eo "$RAW" | head -3 | tr '\n' ' ')"; raw=1; fi
    else
      note "SUB $tag tab$n | tab not offered ($spec)"
    fi
    IFS='|'
  done; IFS=$IFS_
  return $raw
}
counts() { psqlc -c "SELECT (SELECT count(*) FROM \"Product\" WHERE \"merchantId\"=m.id),(SELECT count(*) FROM \"Customer\" WHERE \"merchantId\"=m.id),(SELECT count(*) FROM \"Order\" o JOIN \"Outlet\" t ON t.id=o.\"outletId\" WHERE t.\"merchantId\"=m.id) FROM \"Merchant\" m WHERE m.email='$1.owner@e2e-sub.test'"; }
role_pw() { case "$1" in staff) echo staff123 ;; kho) echo inventory123 ;; *) echo merchant123 ;; esac; }

reset_stock() { # the stock scenario back to its first state: only the seeded order of E2E Het, stock untouched
  psqlc <<'SQL' >/dev/null
DO $$ DECLARE m int; keep int; BEGIN
  SELECT id INTO m FROM "Merchant" WHERE email = 'stock.owner@e2e-sub.test';
  SELECT min(o.id) INTO keep FROM "Order" o JOIN "Outlet" t ON t.id = o."outletId" WHERE t."merchantId" = m;
  DELETE FROM "OrderItem" WHERE "orderId" IN (SELECT o.id FROM "Order" o JOIN "Outlet" t ON t.id = o."outletId" WHERE t."merchantId" = m AND o.id <> keep);
  DELETE FROM "Payment" WHERE "orderId" IN (SELECT o.id FROM "Order" o JOIN "Outlet" t ON t.id = o."outletId" WHERE t."merchantId" = m AND o.id <> keep);
  DELETE FROM "Order" WHERE id IN (SELECT o.id FROM "Order" o JOIN "Outlet" t ON t.id = o."outletId" WHERE t."merchantId" = m AND o.id <> keep);
  -- a sale takes units out of the stock for good: put the seeded numbers back
  UPDATE "Product" SET "totalStock" = CASE name WHEN 'E2E Con5' THEN 5 ELSE 1 END WHERE "merchantId" = m AND name IN ('E2E Con5', 'E2E Con1');
  UPDATE "OutletStock" s SET stock = p."totalStock", available = p."totalStock", renting = 0 FROM "Product" p WHERE p.id = s."productId" AND p."merchantId" = m AND p.name IN ('E2E Con5', 'E2E Con1');
END $$;
SQL
}

case "${1:-}" in
  login) do_login "${2:?email}" "${3:?password}" ;;
  tabs) do_tabs "${2:?tag}" ;;
  sub)
    slug="${2:?slug}"; role="${3:?role}"; PREP="$ROOT/scripts/mobile-e2e/prepare-accounts.sh"; ATT="$LANG_E2E-$slug-$role"; tag="[$LANG_E2E $slug/$role]"
    set_lang; "$PREP" break "$slug" >/dev/null; before="$(counts "$slug")"
    do_login "$slug.$role@e2e-sub.test" "$(role_pw "$role")"; rc=0; clear_cart; do_tabs "$LANG_E2E/$slug/$role/broken" || rc=1
    [ $rc = 0 ] && pass "$tag no raw key on any tab" || fail "$tag a raw key shows on a tab"
    # the screens say why (Home / Orders / Overview show the API error text)
    shown="$(grep -h "SUB $LANG_E2E/$slug/$role/broken tab[124]" "$OUT/notes.txt" | tail -3)"
    if echo "$shown" | grep -Eq "$(L api_error_subscription_expired)|$(L api_error_trial_expired)"; then pass "$tag a tab names the reason: $(L api_error_subscription_expired)"
    else note "NOREASON? $tag no tab shows the expired text; texts: $(echo "$shown" | cut -c1-500)"; fi
    for what in product customer order; do
      MSG=""; case $what in product) attempt_product ;; customer) attempt_customer ;; order) attempt_order "E2E SP 1" ;; esac
      note "ATTEMPT $tag $what | msg=$MSG"
      case "$MSG" in "<no "*|"<form did not"*) note "SKIP $tag add $what: ${MSG:0:80}" ;;
        "<order created>") fail "$tag an order was created in a broken state" ;;
        *) msg_readable "$MSG" && pass "$tag add $what -> readable message: $MSG" || fail "$tag add $what -> message not readable in $LANG_E2E: '$MSG'" ;; esac
    done
    [ "$(counts "$slug")" = "$before" ] && pass "$tag nothing created ($before)" || { fail "$tag rows changed: $before -> $(counts "$slug")"; rc=1; }
    "$PREP" fix "$slug" >/dev/null
    restart_app; sleep 8; go_home; sleep 4; "$U" shot "a-$ATT-fixed-home" >/dev/null
    t="$(texts)"; note "SUB $slug/$role fixed home | $t"
    echo "$t" | grep -q "E2E SP" && pass "$tag fixed: Home lists the products again" || { fail "$tag fixed: Home shows no product"; rc=1; }
    "$PREP" break "$slug" >/dev/null
    exit $((FAILS > 0)) ;;
  limit)
    role="${2:?role}"; slug=at-limit; ATT="$LANG_E2E-$slug-$role"; tag="[$LANG_E2E $slug/$role]"; want="$(L api_error_plan_limit_exceeded)"
    set_lang; before="$(counts "$slug")"; do_login "$slug.$role@e2e-sub.test" "$(role_pw "$role")"; clear_cart
    for what in product customer order; do
      MSG=""; case $what in product) attempt_product ;; customer) attempt_customer ;; order) attempt_order "E2E SP 1" ;; esac
      note "ATTEMPT $tag $what | msg=$MSG"
      case "$MSG" in "<no "*|"<form did not"*) note "SKIP $tag add $what: ${MSG:0:120}" ;;
        "<order created>") fail "$tag an order was created at the limit" ;;
        "$want") pass "$tag add $what -> '$MSG'" ;;
        *) msg_readable "$MSG" && fail "$tag add $what -> readable but not the plan-limit message: '$MSG' (want '$want')" || fail "$tag add $what -> message not readable in $LANG_E2E: '$MSG'" ;; esac
    done
    [ "$(counts "$slug")" = "$before" ] && pass "$tag nothing created ($before)" || fail "$tag rows changed: $before -> $(counts "$slug")"
    exit $((FAILS > 0)) ;;
  calendar) source "$CHK/android-flow-calendar.sh" ;;
  todo) source "$CHK/android-flow-todo.sh" ;;
  role) source "$CHK/android-flow-role.sh" "$@" ;;
  stock) source "$CHK/android-flow-stock.sh" ;;
  *) sed -n 2,19p "$0"; exit 64 ;;
esac
