-- #518: per-merchant switch "Cho tạo đơn khi trùng lịch". Default true keeps today's behaviour.
ALTER TABLE "public"."Merchant" ADD COLUMN     "allowOverlappingOrders" BOOLEAN NOT NULL DEFAULT true;
