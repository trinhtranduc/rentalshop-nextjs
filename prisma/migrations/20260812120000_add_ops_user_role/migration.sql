-- Platform operations role (system-wide, below ADMIN)
DO $$ BEGIN
    ALTER TYPE "UserRole" ADD VALUE 'OPS';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
