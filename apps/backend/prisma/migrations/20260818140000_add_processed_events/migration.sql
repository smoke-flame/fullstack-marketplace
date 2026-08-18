CREATE TABLE IF NOT EXISTS "ProcessedEvent" (
  "consumer" TEXT NOT NULL,
  "eventId" TEXT NOT NULL,
  "eventType" TEXT NOT NULL,
  "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProcessedEvent_pkey" PRIMARY KEY ("consumer", "eventId")
);

CREATE INDEX IF NOT EXISTS "ProcessedEvent_processedAt_idx" ON "ProcessedEvent"("processedAt");
