-- #1631 Polar web card payments: payment method POLAR (additive; old code never writes it)
ALTER TYPE "PaymentMethod" ADD VALUE IF NOT EXISTS 'POLAR';
