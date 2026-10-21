-- Additive patch for an existing ServeSync schema. Review/apply in staging first.
-- This repository has no Prisma migration baseline. Do NOT use migrate reset.
BEGIN;
ALTER TABLE "Order" ADD COLUMN "idempotencyKey" TEXT, ADD COLUMN "requestHash" TEXT;
CREATE UNIQUE INDEX "Order_restaurantId_sessionId_idempotencyKey_key"
  ON "Order"("restaurantId", "sessionId", "idempotencyKey");
COMMIT;
