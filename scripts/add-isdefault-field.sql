-- Add isDefault field to Outlet table
ALTER TABLE Outlet ADD COLUMN isDefault BOOLEAN DEFAULT FALSE;

-- Create index on isDefault field
CREATE INDEX idx_outlet_isdefault ON Outlet(isDefault);

-- Set the first outlet of each merchant as default
UPDATE Outlet 
SET isDefault = TRUE 
WHERE id IN (
  SELECT o.id 
  FROM Outlet o
  INNER JOIN (
    SELECT merchantId, MIN(createdAt) as minCreatedAt
    FROM Outlet
    GROUP BY merchantId
  ) first_outlets ON o.merchantId = first_outlets.merchantId 
                  AND o.createdAt = first_outlets.minCreatedAt
);

-- Set all other outlets as non-default
UPDATE Outlet 
SET isDefault = FALSE 
WHERE id NOT IN (
  SELECT o.id 
  FROM Outlet o
  INNER JOIN (
    SELECT merchantId, MIN(createdAt) as minCreatedAt
    FROM Outlet
    GROUP BY merchantId
  ) first_outlets ON o.merchantId = first_outlets.merchantId 
                  AND o.createdAt = first_outlets.minCreatedAt
);
