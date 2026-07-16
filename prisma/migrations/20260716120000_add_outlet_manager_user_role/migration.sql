-- Outlet Manager role: behaves like OUTLET_STAFF but has full product CRUD (add/edit/delete),
-- without product import/export, user management, or order delete/export.
-- Existing users are NOT modified; admins assign this role manually via the user management UI.
DO $$ BEGIN
    ALTER TYPE "UserRole" ADD VALUE 'OUTLET_MANAGER' BEFORE 'OUTLET_STAFF';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
