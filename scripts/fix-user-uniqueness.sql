-- Fix User Uniqueness Constraints for SQLite
-- This script removes the global email uniqueness and adds merchant-scoped uniqueness

-- Step 1: Create a backup of the current users table
CREATE TABLE users_backup AS SELECT * FROM users;

-- Step 2: Drop the current users table
DROP TABLE users;

-- Step 3: Recreate the users table with correct constraints
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  password TEXT NOT NULL,
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'OUTLET_STAFF',
  isActive BOOLEAN NOT NULL DEFAULT 1,
  createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  merchantId TEXT,
  outletId TEXT,
  FOREIGN KEY (merchantId) REFERENCES merchant(id),
  FOREIGN KEY (outletId) REFERENCES outlet(id)
);

-- Step 4: Add merchant-scoped uniqueness constraints
CREATE UNIQUE INDEX idx_users_merchant_email ON users(merchantId, email);
CREATE UNIQUE INDEX idx_users_merchant_phone ON users(merchantId, phone);

-- Step 5: Add other indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_merchantId ON users(merchantId);
CREATE INDEX idx_users_outletId ON users(outletId);

-- Step 6: Restore data from backup
INSERT INTO users SELECT * FROM users_backup;

-- Step 7: Drop backup table
DROP TABLE users_backup;

-- Step 8: Verify the new constraints
PRAGMA index_list(users);

-- Note: If you get any errors about existing constraints, you may need to:
-- 1. Check what constraints exist: PRAGMA table_info(users);
-- 2. Drop them manually if needed
