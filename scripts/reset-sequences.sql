-- ============================================================================
-- RESET AUTO-INCREMENT SEQUENCES
-- ============================================================================
-- This script resets all auto-increment sequences to prevent duplicate ID errors
-- Run this on Railway database when getting "Field: id" duplicate errors

-- Reset Merchant sequence
SELECT setval(
  pg_get_serial_sequence('"Merchant"', 'id'), 
  COALESCE((SELECT MAX(id) FROM "Merchant"), 0) + 1, 
  false
);

-- Reset Outlet sequence
SELECT setval(
  pg_get_serial_sequence('"Outlet"', 'id'), 
  COALESCE((SELECT MAX(id) FROM "Outlet"), 0) + 1, 
  false
);

-- Reset Category sequence
SELECT setval(
  pg_get_serial_sequence('"Category"', 'id'), 
  COALESCE((SELECT MAX(id) FROM "Category"), 0) + 1, 
  false
);

-- Reset User sequence
SELECT setval(
  pg_get_serial_sequence('"User"', 'id'), 
  COALESCE((SELECT MAX(id) FROM "User"), 0) + 1, 
  false
);

-- Reset Product sequence
SELECT setval(
  pg_get_serial_sequence('"Product"', 'id'), 
  COALESCE((SELECT MAX(id) FROM "Product"), 0) + 1, 
  false
);

-- Reset Customer sequence
SELECT setval(
  pg_get_serial_sequence('"Customer"', 'id'), 
  COALESCE((SELECT MAX(id) FROM "Customer"), 0) + 1, 
  false
);

-- Reset Order sequence
SELECT setval(
  pg_get_serial_sequence('"Order"', 'id'), 
  COALESCE((SELECT MAX(id) FROM "Order"), 0) + 1, 
  false
);

-- Reset Payment sequence
SELECT setval(
  pg_get_serial_sequence('"Payment"', 'id'), 
  COALESCE((SELECT MAX(id) FROM "Payment"), 0) + 1, 
  false
);

-- Reset Plan sequence
SELECT setval(
  pg_get_serial_sequence('"Plan"', 'id'), 
  COALESCE((SELECT MAX(id) FROM "Plan"), 0) + 1, 
  false
);

-- Reset Subscription sequence
SELECT setval(
  pg_get_serial_sequence('"Subscription"', 'id'), 
  COALESCE((SELECT MAX(id) FROM "Subscription"), 0) + 1, 
  false
);

-- Verify sequences
SELECT 'Merchant' as table_name, last_value FROM pg_sequences WHERE schemaname = 'public' AND sequencename LIKE '%merchant%';
SELECT 'Outlet' as table_name, last_value FROM pg_sequences WHERE schemaname = 'public' AND sequencename LIKE '%outlet%';
SELECT 'Category' as table_name, last_value FROM pg_sequences WHERE schemaname = 'public' AND sequencename LIKE '%category%';
SELECT 'User' as table_name, last_value FROM pg_sequences WHERE schemaname = 'public' AND sequencename LIKE '%user%';
SELECT 'Product' as table_name, last_value FROM pg_sequences WHERE schemaname = 'public' AND sequencename LIKE '%product%';
SELECT 'Customer' as table_name, last_value FROM pg_sequences WHERE schemaname = 'public' AND sequencename LIKE '%customer%';
SELECT 'Order' as table_name, last_value FROM pg_sequences WHERE schemaname = 'public' AND sequencename LIKE '%order%';

-- Success message
SELECT '✅ All sequences reset successfully!' as status;

