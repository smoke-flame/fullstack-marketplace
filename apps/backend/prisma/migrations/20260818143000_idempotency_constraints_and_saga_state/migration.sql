-- Existing installations used eventId as the only key.  A shared database has
-- several consumers for an event, so scope the durable receipt by consumer.
ALTER TABLE "ProcessedEvent" ADD COLUMN IF NOT EXISTS "consumer" TEXT;
UPDATE "ProcessedEvent" SET "consumer" = 'legacy' WHERE "consumer" IS NULL;
ALTER TABLE "ProcessedEvent" ALTER COLUMN "consumer" SET NOT NULL;
ALTER TABLE "ProcessedEvent" DROP CONSTRAINT IF EXISTS "ProcessedEvent_pkey";
ALTER TABLE "ProcessedEvent" ADD CONSTRAINT "ProcessedEvent_pkey" PRIMARY KEY ("consumer", "eventId");

-- A reservation and a payment are both keyed by the saga/order UUID.  These
-- constraints make duplicate commands safe even when they arrive concurrently.
CREATE UNIQUE INDEX IF NOT EXISTS "Reservation_sagaId_productId_key"
  ON "Reservation"("sagaId", "productId");
CREATE UNIQUE INDEX IF NOT EXISTS "Payment_orderId_key" ON "Payment"("orderId");

CREATE TABLE IF NOT EXISTS "SagaState" (
  "orderId" TEXT NOT NULL,
  "correlationId" TEXT NOT NULL,
  "step" TEXT NOT NULL,
  "timeoutAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SagaState_pkey" PRIMARY KEY ("orderId")
);
CREATE INDEX IF NOT EXISTS "SagaState_timeoutAt_idx" ON "SagaState"("timeoutAt");
