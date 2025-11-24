-- Update existing plans to include orders field in limits JSON
UPDATE "Plan" 
SET "limits" = jsonb_set(
  "limits"::jsonb, 
  '{orders}', 
  '0'::jsonb,
  true
)::text
WHERE "limits"::jsonb->>'orders' IS NULL;

-- Update default constraint for new plans
ALTER TABLE "Plan" 
ALTER COLUMN "limits" 
SET DEFAULT '{"outlets": 0, "users": 0, "products": 0, "customers": 0, "orders": 0}';

