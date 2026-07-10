-- Blog CMS editor role (no merchant/outlet scope)
DO $$ BEGIN
    ALTER TYPE "UserRole" ADD VALUE 'ARTICLE';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
