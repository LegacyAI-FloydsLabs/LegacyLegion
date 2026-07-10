ALTER TABLE "Lead" ALTER COLUMN "email" DROP NOT NULL;

-- Add beta delivery controls to client work orders.
ALTER TABLE "ClientWorkOrder"
  ADD COLUMN "ownerKind" TEXT NOT NULL DEFAULT 'AI_PERSONA',
  ADD COLUMN "ownerLabel" TEXT,
  ADD COLUMN "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
  ADD COLUMN "dueAt" TIMESTAMP(3),
  ADD COLUMN "evidenceLinks" JSONB,
  ADD COLUMN "internalNotes" TEXT,
  ADD COLUMN "clientSummary" TEXT,
  ADD COLUMN "approvalStatus" TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "approvedAt" TIMESTAMP(3);

CREATE TABLE "ClientWorkOrderEvent" (
  "id" TEXT NOT NULL,
  "workOrderId" TEXT NOT NULL,
  "actorId" TEXT,
  "type" TEXT NOT NULL,
  "fromStatus" TEXT,
  "toStatus" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ClientWorkOrderEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ClientWorkOrderEvent_workOrderId_createdAt_idx" ON "ClientWorkOrderEvent"("workOrderId", "createdAt");
CREATE INDEX "ClientWorkOrderEvent_actorId_idx" ON "ClientWorkOrderEvent"("actorId");

ALTER TABLE "ClientWorkOrderEvent"
  ADD CONSTRAINT "ClientWorkOrderEvent_workOrderId_fkey"
  FOREIGN KEY ("workOrderId") REFERENCES "ClientWorkOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClientWorkOrderEvent"
  ADD CONSTRAINT "ClientWorkOrderEvent_actorId_fkey"
  FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
