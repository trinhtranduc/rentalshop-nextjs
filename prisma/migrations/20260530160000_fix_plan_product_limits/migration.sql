-- Basic plan product limit: 2000 products (was 500 in some environments)
UPDATE "Plan"
SET "limits" = (
  (("limits"::jsonb) - 'products') || jsonb_build_object('products', 2000)
)::text
WHERE "name" = 'Basic'
  AND COALESCE(("limits"::jsonb ->> 'products')::int, 0) = 500;

-- Professional plan product limit: ensure 5000 products
UPDATE "Plan"
SET "limits" = (
  (("limits"::jsonb) - 'products') || jsonb_build_object('products', 5000)
)::text
WHERE "name" = 'Professional'
  AND COALESCE(("limits"::jsonb ->> 'products')::int, 0) <> 5000;
