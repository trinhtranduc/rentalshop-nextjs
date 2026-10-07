-- #629: a barcode is unique per shop, not system-wide. Existing rows are globally unique,
-- so the composite index cannot fail. NULL barcodes stay allowed many times.
DROP INDEX "public"."Product_barcode_key";

CREATE UNIQUE INDEX "Product_merchantId_barcode_key" ON "public"."Product"("merchantId", "barcode");
