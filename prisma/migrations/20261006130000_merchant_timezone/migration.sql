-- #567: shop time zone (IANA id). Additive; existing shops get Asia/Ho_Chi_Minh (today's behaviour).
ALTER TABLE "public"."Merchant" ADD COLUMN     "timezone" TEXT NOT NULL DEFAULT 'Asia/Ho_Chi_Minh';
