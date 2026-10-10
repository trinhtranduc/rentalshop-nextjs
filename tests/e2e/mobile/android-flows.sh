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
reason_re() { case "$1" in expired-*) echo "$(L api_error_subscription_expired)|$(L api_error_trial_expired)" ;; *) echo "subscription|payment is overdue|đăng ký|gói|thanh toán" ;; esac; }   # the API text of a blocked shop names the subscription
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
    # log in while the shop is healthy and leave a ready cart (product, customer, dates), then break the subscription: the order
    # attempt below submits that kept cart (Home lists nothing in a broken state, so a cart cannot be built there)
    set_lang; "$PREP" fix "$slug" >/dev/null; before="$(counts "$slug")"
    do_login "$slug.$role@e2e-sub.test" "$(role_pw "$role")"; rc=0; clear_cart; go_home
    add_to_cart "E2E SP 1" 1 && { open_cart; pick_customer "Khách E2E 1"; pick_dates 0 1; tap_any "$(L v2_cart_back)"; sleep 1; }
    "$PREP" break "$slug" >/dev/null; restart_app; sleep 8
    do_tabs "$LANG_E2E/$slug/$role/broken" || rc=1
    [ $rc = 0 ] && pass "$tag no raw key on any tab" || fail "$tag a raw key shows on a tab"
    # the screens say why (Home / Orders / Overview show the API error text), in the app language
    shown="$(grep -h "SUB $LANG_E2E/$slug/$role/broken tab[124]" "$OUT/notes.txt" | tail -3)"
    seg="$(echo "$shown" | sed -E 's/^[^|]*\| //' | tr '¦' '\n' | sed -E 's/ \| *$//' | grep -Ei "$(reason_re "$slug")" | head -1)"
    if [ -z "$seg" ]; then fail "$tag no tab says why the shop is blocked (looked for /$(reason_re "$slug")/): $(echo "$shown" | cut -c1-300)"
    elif msg_readable "$seg"; then pass "$tag a tab says why: '$seg'"
    else
      if [ "$LANG_E2E" = vi ] && [ "$slug" != expired-trial ] && [ "$slug" != expired-active ]; then known 758 "$tag the reason is not translated: '$seg'"
      else fail "$tag the reason is not readable in $LANG_E2E: '$seg'"; fi
    fi
    for what in product customer order; do
      MSG=""; case $what in product) attempt_product ;; customer) attempt_customer ;; order) attempt_order "E2E SP 1" ;; esac
      note "ATTEMPT $tag $what | msg=$MSG"
      case "$MSG" in "<no "*|"<form did not"*) note "SKIP $tag add $what: ${MSG:0:80}" ;;
        "<order created>") fail "$tag an order was created in a broken state" ;;
        "$(L v2_form_error_outlet)") [ "$what" = product ] && [ "$role" = owner ] && known 756 "$tag add product -> '$MSG' (the reason is the subscription)" || fail "$tag add $what -> wrong reason: '$MSG'" ;;
        *) if msg_readable "$MSG"; then pass "$tag add $what -> readable message: $MSG"
           elif [ "$LANG_E2E" = vi ] && [ "$slug" != expired-trial ] && [ "$slug" != expired-active ] && echo "$MSG" | grep -Eiq "subscription|payment"; then known 758 "$tag add $what -> English text in vi: '$MSG'"
           else fail "$tag add $what -> message not readable in $LANG_E2E: '$MSG'"; fi ;; esac
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
