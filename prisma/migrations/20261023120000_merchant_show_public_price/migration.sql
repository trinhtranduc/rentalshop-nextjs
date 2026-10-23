-- #1174: per-merchant switch "Hiện giá trên trang shop". Default true keeps today's catalogue.
ALTER TABLE "public"."Merchant" ADD COLUMN     "showPublicPrice" BOOLEAN NOT NULL DEFAULT true;
