-- #742: the web product form sent "barcode": "" and the API stored it. The unique index
-- (merchantId, barcode) then rejected the second product of a shop without a barcode.
-- DATA migration: turn existing blank barcodes into NULL (NULL is allowed many times).
-- The API now stores NULL for a blank barcode. No schema change, only rows are updated.
-- Soft-deleted products are included on purpose (their '' also takes part in the unique index).
UPDATE "public"."Product" SET "barcode" = NULL WHERE "barcode" IS NOT NULL AND btrim("barcode") = '';
