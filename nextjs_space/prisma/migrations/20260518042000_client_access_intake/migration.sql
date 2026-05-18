-- CreateTable
CREATE TABLE "ClientAccessRequest" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "requesterId" TEXT,
    "approverId" TEXT,
    "platform" TEXT NOT NULL,
    "resourceUrl" TEXT,
    "externalVaultRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEEDED',
    "requestNotes" TEXT,
    "decisionNotes" TEXT,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientAccessRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientAccessEvent" (
    "id" TEXT NOT NULL,
    "accessRequestId" TEXT NOT NULL,
    "actorId" TEXT,
    "type" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientAccessEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientAccessRequest_clientId_status_idx" ON "ClientAccessRequest"("clientId", "status");

-- CreateIndex
CREATE INDEX "ClientAccessRequest_platform_idx" ON "ClientAccessRequest"("platform");

-- CreateIndex
CREATE INDEX "ClientAccessRequest_updatedAt_idx" ON "ClientAccessRequest"("updatedAt");

-- CreateIndex
CREATE INDEX "ClientAccessEvent_accessRequestId_createdAt_idx" ON "ClientAccessEvent"("accessRequestId", "createdAt");

-- CreateIndex
CREATE INDEX "ClientAccessEvent_actorId_idx" ON "ClientAccessEvent"("actorId");

-- AddForeignKey
ALTER TABLE "ClientAccessRequest" ADD CONSTRAINT "ClientAccessRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAccessRequest" ADD CONSTRAINT "ClientAccessRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAccessRequest" ADD CONSTRAINT "ClientAccessRequest_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAccessEvent" ADD CONSTRAINT "ClientAccessEvent_accessRequestId_fkey" FOREIGN KEY ("accessRequestId") REFERENCES "ClientAccessRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientAccessEvent" ADD CONSTRAINT "ClientAccessEvent_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
