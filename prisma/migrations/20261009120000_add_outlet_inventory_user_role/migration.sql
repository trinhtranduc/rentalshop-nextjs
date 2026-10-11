-- Nhân viên kho (#682): outlet staff who also manage products and categories
DO $$ BEGIN
    ALTER TYPE "UserRole" ADD VALUE 'OUTLET_INVENTORY';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
