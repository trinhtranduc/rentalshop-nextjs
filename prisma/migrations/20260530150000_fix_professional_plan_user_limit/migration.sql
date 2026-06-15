-- Professional plan base limit: 4 users (was incorrectly set to 8 in some environments)
UPDATE "Plan"
SET "limits" = (
  (("limits"::jsonb) - 'users') || jsonb_build_object('users', 4)
)::text
WHERE "name" = 'Professional'
  AND COALESCE(("limits"::jsonb ->> 'users')::int, 0) = 8;
