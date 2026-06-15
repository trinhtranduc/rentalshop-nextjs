-- Basic plan base limit: 2 users (was incorrectly set to 3 in some environments)
UPDATE "Plan"
SET "limits" = (
  (("limits"::jsonb) - 'users') || jsonb_build_object('users', 2)
)::text
WHERE "name" = 'Basic'
  AND COALESCE(("limits"::jsonb ->> 'users')::int, 0) = 3;
