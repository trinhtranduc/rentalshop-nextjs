-- Natural sort for product names (B2 < B10 < B19), via ICU numeric collation.
-- Postgres docs: CREATE COLLATION ... locale = '...-u-kn-true'
-- Using und (root) + kn so digits sort by numeric value across locales.

DO $$
BEGIN
  CREATE COLLATION natural_sort (provider = icu, locale = 'und-u-kn-true');
EXCEPTION
  WHEN duplicate_object THEN
    NULL;
END $$;

ALTER TABLE "Product"
  ALTER COLUMN "name" TYPE TEXT COLLATE natural_sort;
