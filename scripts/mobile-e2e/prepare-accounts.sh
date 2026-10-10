#!/usr/bin/env bash
# Prepare dedicated merchants for the expired / out-of-plan e2e flows (#727).
# Each scenario gets its OWN merchant, outlet, plan, subscription, owner, staff and kho user, a category, two
# products with stock and two customers. The seeded merchants (merchant1, merchant2) are never touched.
set -euo pipefail
# shellcheck source=env.sh
. "$(dirname "${BASH_SOURCE[0]}")/env.sh"

usage() {
  cat <<'EOF2'
Usage: scripts/mobile-e2e/prepare-accounts.sh [create|list|fix <slug>|break <slug>|staged|--help]

  create        (default) create or recreate every scenario below in $E2E_DATABASE_URL
  list          print the accounts and the subscription state of each scenario
  fix <slug>    make the scenario's subscription healthy again (ACTIVE, period ends in 30 days)
  break <slug>  put the scenario back to its broken state (what create does)
  staged        add three products to the seeded merchant1 (additive, idempotent, `create` does not run it): "Váy cưới thuê theo ngày"
                (DAILY 400.000, 3 in stock), "Vest xanh navy thuê lần" (FIXED 380.000, 3 in stock), "Váy trùng đơn test" (1 in stock, all of
                it held by a RENT order today, order 720001, so the cart shows the "Xem các đơn đang giữ món" tag). Needed by the iOS
                test8cOverlapTagAndRoleSheet and test8dCartLines (merchant account, merchant1@example.com).

Scenarios (slug: subscription state):
  expired-trial    TRIAL, period ended 3 days ago           -> 403 SUBSCRIPTION_EXPIRED
  expired-active   ACTIVE, period ended 3 days ago          -> 403 SUBSCRIPTION_EXPIRED
  cancelled-ended  CANCELLED, period ended 3 days ago       -> 403 SUBSCRIPTION_CANCELLED
  paused           PAUSED, period ends in 20 days           -> 403 SUBSCRIPTION_PAUSED
  past-due         PAST_DUE, period ends in 20 days         -> 403 SUBSCRIPTION_PAST_DUE
  at-limit         ACTIVE, plan "E2E At Limit" with limits equal to what exists: 1 outlet, 3 users,
                   2 products, 2 customers, 1 order        -> 422 PLAN_LIMIT_EXCEEDED on every create
  healthy          ACTIVE, no limits; control account for the same flows
  stock            like healthy, three products for the stock-left flows: "E2E Con5" (5 in stock), "E2E Con1" (1),
                   "E2E Het" (1, held by a RENT order picked up and returned today, so out today, free tomorrow)

  ops              like healthy, nine orders around today (Vietnam day) for the "Việc cần làm", calendar and order detail
                   flows: see the OPS_ORDERS table in this script. Order numbers 710001..710009.

Accounts per scenario (password: owner merchant123, staff staff123, kho inventory123):
  <slug>.owner@e2e-sub.test  <slug>.staff@e2e-sub.test  <slug>.kho@e2e-sub.test

Refuses any database host other than 127.0.0.1 / localhost.
EOF2
}

e2e_require_local_db "$E2E_DATABASE_URL"
PSQL=(psql "$E2E_DATABASE_URL" -v ON_ERROR_STOP=1 -qAt)
SLUGS=(expired-trial expired-active cancelled-ended paused past-due at-limit healthy stock ops)

# slug -> "STATUS|period end offset in days|plan limits json"
scenario() {
  case "$1" in
    expired-trial)   echo 'TRIAL|-3|{"outlets":1,"users":3,"products":500,"customers":2000,"orders":2000}' ;;
    expired-active)  echo 'ACTIVE|-3|{"outlets":1,"users":3,"products":500,"customers":2000,"orders":2000}' ;;
    cancelled-ended) echo 'CANCELLED|-3|{"outlets":1,"users":3,"products":500,"customers":2000,"orders":2000}' ;;
    paused)          echo 'PAUSED|20|{"outlets":1,"users":3,"products":500,"customers":2000,"orders":2000}' ;;
    past-due)        echo 'PAST_DUE|20|{"outlets":1,"users":3,"products":500,"customers":2000,"orders":2000}' ;;
    at-limit)        echo 'ACTIVE|30|{"outlets":1,"users":3,"products":2,"customers":2,"orders":1}' ;;
    healthy|stock|ops)   echo 'ACTIVE|30|{"outlets":3,"users":10,"products":500,"customers":2000,"orders":2000}' ;;
    *) echo "unknown scenario '$1' (one of: ${SLUGS[*]})" >&2; return 1 ;;
  esac
}

create_one() {
  local slug="$1" spec status days limits
  spec="$(scenario "$slug")"
  IFS='|' read -r status days limits <<<"$spec"
  "${PSQL[@]}" -v slug="$slug" -v status="$status" -v days="$days" -v limits="$limits" <<'SQL'
BEGIN;
-- remove a previous run of this scenario (children first)
CREATE TEMP TABLE m AS SELECT id FROM "Merchant" WHERE email = :'slug' || '.owner@e2e-sub.test';
DELETE FROM "OrderItem" WHERE "orderId" IN (SELECT o.id FROM "Order" o JOIN "Outlet" t ON t.id = o."outletId" WHERE t."merchantId" IN (SELECT id FROM m));
DELETE FROM "Payment" WHERE "orderId" IN (SELECT o.id FROM "Order" o JOIN "Outlet" t ON t.id = o."outletId" WHERE t."merchantId" IN (SELECT id FROM m));
DELETE FROM "Order" WHERE "outletId" IN (SELECT id FROM "Outlet" WHERE "merchantId" IN (SELECT id FROM m));
DELETE FROM "OutletStock" WHERE "outletId" IN (SELECT id FROM "Outlet" WHERE "merchantId" IN (SELECT id FROM m));
DELETE FROM "Product" WHERE "merchantId" IN (SELECT id FROM m);
DELETE FROM "Customer" WHERE "merchantId" IN (SELECT id FROM m);
DELETE FROM "Category" WHERE "merchantId" IN (SELECT id FROM m);
DELETE FROM "Subscription" WHERE "merchantId" IN (SELECT id FROM m);
DELETE FROM "User" WHERE "merchantId" IN (SELECT id FROM m);
DELETE FROM "Outlet" WHERE "merchantId" IN (SELECT id FROM m);
DELETE FROM "Merchant" WHERE id IN (SELECT id FROM m);
DELETE FROM "Plan" WHERE name = 'E2E ' || :'slug';

-- keep the sequences ahead of the seeded explicit ids
SELECT setval(pg_get_serial_sequence('"Merchant"','id'), GREATEST((SELECT max(id) FROM "Merchant"), 1000)) \g /dev/null
SELECT setval(pg_get_serial_sequence('"Outlet"','id'), GREATEST((SELECT max(id) FROM "Outlet"), 1000)) \g /dev/null
SELECT setval(pg_get_serial_sequence('"User"','id'), GREATEST((SELECT max(id) FROM "User"), 5000)) \g /dev/null
SELECT setval(pg_get_serial_sequence('"Plan"','id'), GREATEST((SELECT max(id) FROM "Plan"), 100)) \g /dev/null
SELECT setval(pg_get_serial_sequence('"Subscription"','id'), GREATEST((SELECT max(id) FROM "Subscription"), 100)) \g /dev/null
SELECT setval(pg_get_serial_sequence('"Category"','id'), GREATEST((SELECT max(id) FROM "Category"), 1000)) \g /dev/null
SELECT setval(pg_get_serial_sequence('"Product"','id'), GREATEST((SELECT max(id) FROM "Product"), 1000)) \g /dev/null
SELECT setval(pg_get_serial_sequence('"Customer"','id'), GREATEST((SELECT max(id) FROM "Customer"), 1000)) \g /dev/null
SELECT setval(pg_get_serial_sequence('"Order"','id'), GREATEST((SELECT max(id) FROM "Order"), 1000)) \g /dev/null

INSERT INTO "Plan"(name, description, "basePrice", currency, "trialDays", limits, features, "isActive", "sortOrder", "updatedAt")
  VALUES ('E2E ' || :'slug', 'e2e scenario plan', 0, 'USD', 14, :'limits',
          '["Web dashboard access","Product public check"]', true, 900, now());
INSERT INTO "Merchant"(name, email, phone, "planId", "isActive", currency, "updatedAt")
  VALUES ('E2E ' || :'slug', :'slug' || '.owner@e2e-sub.test', '+84-900-000-000', (SELECT id FROM "Plan" WHERE name = 'E2E ' || :'slug'), true, 'VND', now());
INSERT INTO "Outlet"(name, "isDefault", "merchantId", "updatedAt")
  SELECT 'E2E ' || :'slug' || ' outlet', true, id, now() FROM "Merchant" WHERE email = :'slug' || '.owner@e2e-sub.test';
INSERT INTO "Subscription"("merchantId", "planId", status, "currentPeriodStart", "currentPeriodEnd", amount, currency, "updatedAt")
  SELECT mm.id, mm."planId", :'status', now() - interval '30 days', now() + (:'days' || ' days')::interval, 0, 'USD', now()
  FROM "Merchant" mm WHERE mm.email = :'slug' || '.owner@e2e-sub.test';

-- users: password hashes copied from the seeded accounts of the same role
INSERT INTO "User"(email, password, "firstName", "lastName", phone, role, "merchantId", "outletId", "isActive", "updatedAt")
  SELECT :'slug' || '.owner@e2e-sub.test', (SELECT password FROM "User" WHERE email = 'merchant1@example.com'), 'Chủ', :'slug', '+84-900-100-001', 'MERCHANT', mm.id, NULL, true, now()
  FROM "Merchant" mm WHERE mm.email = :'slug' || '.owner@e2e-sub.test';
INSERT INTO "User"(email, password, "firstName", "lastName", phone, role, "merchantId", "outletId", "isActive", "updatedAt")
  SELECT :'slug' || '.staff@e2e-sub.test', (SELECT password FROM "User" WHERE email = 'staff.outlet1@example.com'), 'Nhân viên', :'slug', '+84-900-100-002', 'OUTLET_STAFF', mm.id, o.id, true, now()
  FROM "Merchant" mm JOIN "Outlet" o ON o."merchantId" = mm.id WHERE mm.email = :'slug' || '.owner@e2e-sub.test';
INSERT INTO "User"(email, password, "firstName", "lastName", phone, role, "merchantId", "outletId", "isActive", "updatedAt")
  SELECT :'slug' || '.kho@e2e-sub.test', (SELECT password FROM "User" WHERE email = 'inventory.outlet1@example.com'), 'Kho', :'slug', '+84-900-100-003', 'OUTLET_INVENTORY', mm.id, o.id, true, now()
  FROM "Merchant" mm JOIN "Outlet" o ON o."merchantId" = mm.id WHERE mm.email = :'slug' || '.owner@e2e-sub.test';

-- catalogue: one category, two products with 5 in stock, two customers
INSERT INTO "Category"(name, "merchantId", "isDefault", "updatedAt")
  SELECT 'E2E category', id, true, now() FROM "Merchant" WHERE email = :'slug' || '.owner@e2e-sub.test';
INSERT INTO "Product"(name, "totalStock", "rentPrice", "salePrice", deposit, "merchantId", "categoryId", "updatedAt")
  SELECT 'E2E SP ' || n, 5, 100000, 500000, 0, mm.id, c.id, now()
  FROM "Merchant" mm JOIN "Category" c ON c."merchantId" = mm.id, generate_series(1,2) n
  WHERE mm.email = :'slug' || '.owner@e2e-sub.test';
INSERT INTO "OutletStock"(stock, available, renting, "productId", "outletId", "updatedAt")
  SELECT 5, 5, 0, p.id, o.id, now()
  FROM "Product" p JOIN "Outlet" o ON o."merchantId" = p."merchantId" JOIN "Merchant" mm ON mm.id = p."merchantId"
  WHERE mm.email = :'slug' || '.owner@e2e-sub.test';
INSERT INTO "Customer"("firstName", "lastName", phone, "merchantId", "updatedAt")
  SELECT 'Khách', 'E2E ' || n, '09000000' || n || '0', mm.id, now()
  FROM "Merchant" mm, generate_series(1,2) n WHERE mm.email = :'slug' || '.owner@e2e-sub.test';
-- one order so the order limit of at-limit (1) is reached
INSERT INTO "Order"("orderNumber", "orderType", status, "totalAmount", "outletId", "customerId", "updatedAt")
  SELECT to_char(100000 + (random()*800000)::int, 'FM999999'), 'SALE', 'COMPLETED', 500000, o.id,
         (SELECT id FROM "Customer" WHERE "merchantId" = mm.id ORDER BY id LIMIT 1), now()
  FROM "Merchant" mm JOIN "Outlet" o ON o."merchantId" = mm.id WHERE mm.email = :'slug' || '.owner@e2e-sub.test';
COMMIT;
SQL
  if [ "$slug" = stock ]; then
    "${PSQL[@]}" -v email="$slug.owner@e2e-sub.test" <<'SQL2'
BEGIN;
UPDATE "Product" SET name = CASE name WHEN 'E2E SP 1' THEN 'E2E Con5' ELSE 'E2E Con1' END, "totalStock" = CASE name WHEN 'E2E SP 1' THEN 5 ELSE 1 END
  WHERE "merchantId" = (SELECT id FROM "Merchant" WHERE email = :'email');
UPDATE "OutletStock" SET stock = p."totalStock", available = p."totalStock" FROM "Product" p WHERE p.id = "OutletStock"."productId" AND p."merchantId" = (SELECT id FROM "Merchant" WHERE email = :'email');
INSERT INTO "Product"(name, "totalStock", "rentPrice", "salePrice", deposit, "merchantId", "categoryId", "updatedAt")
  SELECT 'E2E Het', 1, 100000, 500000, 0, "merchantId", "categoryId", now() FROM "Product" WHERE name = 'E2E Con1' AND "merchantId" = (SELECT id FROM "Merchant" WHERE email = :'email');
INSERT INTO "OutletStock"(stock, available, renting, "productId", "outletId", "updatedAt")
  SELECT 1, 0, 1, p.id, o.id, now() FROM "Product" p JOIN "Outlet" o ON o."merchantId" = p."merchantId" WHERE p.name = 'E2E Het' AND p."merchantId" = (SELECT id FROM "Merchant" WHERE email = :'email');
-- the order that holds E2E Het today (Vietnam day): pickup 10:00, return 18:00
UPDATE "Order" SET "orderType" = 'RENT', status = 'RESERVED',
  "pickupPlanAt" = (((now() at time zone 'Asia/Ho_Chi_Minh')::date + time '10:00') at time zone 'Asia/Ho_Chi_Minh') at time zone 'UTC',
  "returnPlanAt" = (((now() at time zone 'Asia/Ho_Chi_Minh')::date + time '18:00') at time zone 'Asia/Ho_Chi_Minh') at time zone 'UTC',
  "totalAmount" = 100000
  WHERE "outletId" IN (SELECT id FROM "Outlet" WHERE "merchantId" = (SELECT id FROM "Merchant" WHERE email = :'email'));
INSERT INTO "OrderItem"(quantity, "unitPrice", "totalPrice", deposit, "orderId", "productId", "productName", "rentalDays")
  SELECT 1, 100000, 100000, 0, o.id, p.id, 'E2E Het', 1
  FROM "Order" o JOIN "Outlet" t ON t.id = o."outletId" JOIN "Product" p ON p."merchantId" = t."merchantId" AND p.name = 'E2E Het'
  WHERE t."merchantId" = (SELECT id FROM "Merchant" WHERE email = :'email');
COMMIT;
SQL2
  fi
  if [ "$slug" = ops ]; then
    # (number, type, status, pickup day offset, pickup hour, return day offset, return hour, total, deposit, security deposit, qty)
    "${PSQL[@]}" -v email="$slug.owner@e2e-sub.test" <<'SQL3'
BEGIN;
CREATE TEMP TABLE ops_orders(num text, otype text, st text, p_off int, p_h int, r_off int, r_h int, total float, dep float, sec float, qty int);
INSERT INTO ops_orders VALUES
  ('710001','RENT','RESERVED',  0,10,  2,18, 300000, 100000, 50000, 2),  -- pickup today, return in 2 days (multi-day)
  ('710002','RENT','PICKUPED', -1, 9,  0,17, 200000,  50000,     0, 1),  -- return today
  ('710003','RENT','PICKUPED', -5, 9, -2,17, 400000, 100000, 80000, 1),  -- late return (2 days)
  ('710004','RENT','RESERVED', -2,10,  1,18, 100000,      0,     0, 1),  -- no show: pickup day passed
  ('710005','RENT','RESERVED',  1,10,  1,20, 100000,  30000,     0, 1),  -- same-day rental tomorrow
  ('710006','RENT','RESERVED',  3,10,  4,18, 250000,  50000, 20000, 2),  -- later, multi-day
  ('710007','RENT','CANCELLED', 1,10,  2,18, 150000,      0,     0, 1),  -- cancelled: not on the calendar
  ('710008','RENT','RETURNED', -3, 9,  0, 9, 120000,  40000,     0, 1),  -- returned today (done)
  ('710009','SALE','COMPLETED', 0,11,  0,11, 500000,      0,     0, 1);  -- sale today
INSERT INTO "Order"("orderNumber","orderType",status,"totalAmount","depositAmount","securityDeposit","outletId","customerId",
                    "pickupPlanAt","returnPlanAt","pickedUpAt","returnedAt","updatedAt")
  SELECT o.num, o.otype::"OrderType", o.st::"OrderStatus", o.total, o.dep, o.sec, ou.id,
         (SELECT id FROM "Customer" WHERE "merchantId" = mm.id ORDER BY id LIMIT 1),
         CASE WHEN o.otype = 'RENT' THEN (((now() at time zone 'Asia/Ho_Chi_Minh')::date + o.p_off + make_time(o.p_h,0,0)) at time zone 'Asia/Ho_Chi_Minh') at time zone 'UTC' END,
         CASE WHEN o.otype = 'RENT' THEN (((now() at time zone 'Asia/Ho_Chi_Minh')::date + o.r_off + make_time(o.r_h,0,0)) at time zone 'Asia/Ho_Chi_Minh') at time zone 'UTC' END,
         CASE WHEN o.st IN ('PICKUPED','RETURNED') THEN (((now() at time zone 'Asia/Ho_Chi_Minh')::date + o.p_off + make_time(o.p_h,0,0)) at time zone 'Asia/Ho_Chi_Minh') at time zone 'UTC' END,
         CASE WHEN o.st = 'RETURNED' THEN (((now() at time zone 'Asia/Ho_Chi_Minh')::date + o.r_off + make_time(o.r_h,0,0)) at time zone 'Asia/Ho_Chi_Minh') at time zone 'UTC' END,
         now()
  FROM ops_orders o, "Merchant" mm JOIN "Outlet" ou ON ou."merchantId" = mm.id WHERE mm.email = :'email';
INSERT INTO "OrderItem"(quantity,"unitPrice","totalPrice",deposit,"orderId","productId","productName","rentalDays")
  SELECT o.qty, o.total / o.qty, o.total, o.dep, od.id, p.id, p.name, GREATEST(1, o.r_off - o.p_off)
  FROM ops_orders o JOIN "Order" od ON od."orderNumber" = o.num
  JOIN "Outlet" ou ON ou.id = od."outletId" JOIN "Merchant" mm ON mm.id = ou."merchantId" AND mm.email = :'email'
  JOIN LATERAL (SELECT * FROM "Product" WHERE "merchantId" = mm.id ORDER BY id LIMIT 1) p ON true;
-- the seed order of the generic block (random number) is removed: only the nine above
DELETE FROM "Order" WHERE "orderNumber" NOT LIKE '7100%' AND "outletId" IN (SELECT id FROM "Outlet" WHERE "merchantId" = (SELECT id FROM "Merchant" WHERE email = :'email'));
COMMIT;
SQL3
  fi
  echo "created $slug ($status, period end ${days}d)"
}

set_state() { # slug status days   (psql -c does not expand :'var', so the SQL goes through stdin)
  "${PSQL[@]}" -v email="$1.owner@e2e-sub.test" -v status="$2" -v days="$3" <<'SQL4'
UPDATE "Subscription" SET status = :'status', "currentPeriodEnd" = now() + (:'days' || ' days')::interval, "updatedAt" = now()
  WHERE "merchantId" = (SELECT id FROM "Merchant" WHERE email = :'email');
SQL4
  echo "$1: status=$2, period end in ${3}d"
}

staged_products() {
  "${PSQL[@]}" <<'SQL5'
BEGIN;
DO $$
DECLARE m int; o int; c int; cust int; p int; od int;
BEGIN
  SELECT id INTO m FROM "Merchant" WHERE email = 'merchant1@example.com';
  IF m IS NULL THEN RAISE EXCEPTION 'merchant1@example.com not found: run seed-local.sh first'; END IF;
  SELECT id INTO o FROM "Outlet" WHERE "merchantId" = m ORDER BY "isDefault" DESC, id LIMIT 1;
  SELECT id INTO c FROM "Category" WHERE "merchantId" = m ORDER BY id LIMIT 1;
  SELECT id INTO cust FROM "Customer" WHERE "merchantId" = m ORDER BY id LIMIT 1;
  -- remove a previous run
  DELETE FROM "OrderItem" WHERE "orderId" IN (SELECT id FROM "Order" WHERE "orderNumber" = '720001');
  DELETE FROM "Order" WHERE "orderNumber" = '720001';
  DELETE FROM "OutletStock" WHERE "productId" IN (SELECT id FROM "Product" WHERE "merchantId" = m AND name IN ('Váy cưới thuê theo ngày','Vest xanh navy thuê lần','Váy trùng đơn test'));
  DELETE FROM "ProductPricingOption" WHERE "productId" IN (SELECT id FROM "Product" WHERE "merchantId" = m AND name IN ('Váy cưới thuê theo ngày','Vest xanh navy thuê lần','Váy trùng đơn test'));
  DELETE FROM "Product" WHERE "merchantId" = m AND name IN ('Váy cưới thuê theo ngày','Vest xanh navy thuê lần','Váy trùng đơn test');
  PERFORM setval(pg_get_serial_sequence('"Product"','id'), GREATEST((SELECT max(id) FROM "Product"), 1000));
  PERFORM setval(pg_get_serial_sequence('"Order"','id'), GREATEST((SELECT max(id) FROM "Order"), 1000));
  PERFORM setval(pg_get_serial_sequence('"ProductPricingOption"','id'), GREATEST((SELECT coalesce(max(id),1) FROM "ProductPricingOption"), 100));

  INSERT INTO "Product"(name, "totalStock", "rentPrice", "salePrice", deposit, "merchantId", "categoryId", "pricingType", "updatedAt")
    VALUES ('Váy cưới thuê theo ngày', 3, 400000, 0, 0, m, c, 'DAILY', now()) RETURNING id INTO p;
  INSERT INTO "ProductPricingOption"("productId", type, price, "isDefault", "isActive", "sortOrder", "updatedAt") VALUES (p, 'DAILY', 400000, true, true, 0, now());
  INSERT INTO "OutletStock"(stock, available, renting, "productId", "outletId", "updatedAt") VALUES (3, 3, 0, p, o, now());

  INSERT INTO "Product"(name, "totalStock", "rentPrice", "salePrice", deposit, "merchantId", "categoryId", "pricingType", "updatedAt")
    VALUES ('Vest xanh navy thuê lần', 3, 380000, 0, 0, m, c, 'FIXED', now()) RETURNING id INTO p;
  INSERT INTO "ProductPricingOption"("productId", type, price, "isDefault", "isActive", "sortOrder", "updatedAt") VALUES (p, 'FIXED', 380000, true, true, 0, now());
  INSERT INTO "OutletStock"(stock, available, renting, "productId", "outletId", "updatedAt") VALUES (3, 3, 0, p, o, now());

  INSERT INTO "Product"(name, "totalStock", "rentPrice", "salePrice", deposit, "merchantId", "categoryId", "pricingType", "updatedAt")
    VALUES ('Váy trùng đơn test', 1, 200000, 0, 0, m, c, 'DAILY', now()) RETURNING id INTO p;
  INSERT INTO "ProductPricingOption"("productId", type, price, "isDefault", "isActive", "sortOrder", "updatedAt") VALUES (p, 'DAILY', 200000, true, true, 0, now());
  INSERT INTO "OutletStock"(stock, available, renting, "productId", "outletId", "updatedAt") VALUES (1, 0, 1, p, o, now());
  INSERT INTO "Order"("orderNumber","orderType",status,"totalAmount","depositAmount","outletId","customerId","pickupPlanAt","returnPlanAt","updatedAt")
    VALUES ('720001','RENT','RESERVED', 400000, 0, o, cust,
      (((now() at time zone 'Asia/Ho_Chi_Minh')::date + time '09:00') at time zone 'Asia/Ho_Chi_Minh') at time zone 'UTC',
      (((now() at time zone 'Asia/Ho_Chi_Minh')::date + 2 + time '18:00') at time zone 'Asia/Ho_Chi_Minh') at time zone 'UTC', now()) RETURNING id INTO od;
  INSERT INTO "OrderItem"(quantity,"unitPrice","totalPrice",deposit,"orderId","productId","productName","rentalDays")
    VALUES (1, 200000, 400000, 0, od, p, 'Váy trùng đơn test', 2);
END $$;
COMMIT;
SQL5
  echo "staged: 3 products on merchant1 (order 720001 holds 'Váy trùng đơn test' today)"
}

CMD="${1:-create}"
case "$CMD" in
  -h|--help|help) usage ;;
  create) for s in "${SLUGS[@]}"; do create_one "$s"; done ;;
  staged) staged_products ;;
  list)
    psql "$E2E_DATABASE_URL" -c "SELECT split_part(u.email,'.',1) AS scenario, u.email, u.role, s.status, s.\"currentPeriodEnd\"::date AS period_end
      FROM \"User\" u JOIN \"Subscription\" s ON s.\"merchantId\" = u.\"merchantId\" WHERE u.email LIKE '%@e2e-sub.test' ORDER BY 1, u.role" ;;
  fix) [ -n "${2:-}" ] || { usage >&2; exit 64; }; scenario "$2" >/dev/null; set_state "$2" ACTIVE 30 ;;
  break) [ -n "${2:-}" ] || { usage >&2; exit 64; }
    IFS='|' read -r st d _ <<<"$(scenario "$2")"; set_state "$2" "$st" "$d" ;;
  *) usage >&2; exit 64 ;;
esac
