-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'team',
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "industry" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "currentMarketingSpend" TEXT,
    "revenueRange" TEXT,
    "employeeCount" TEXT,
    "biggestPainPoint" TEXT,
    "currentProvider" TEXT,
    "website" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "source" TEXT NOT NULL DEFAULT 'WEB_FORM',
    "channel" TEXT,
    "score" INTEGER NOT NULL DEFAULT 0,
    "scoreBreakdown" JSONB,
    "qualification" TEXT,
    "estimatedMRR" INTEGER,
    "proposedTier" TEXT,
    "aiAssessment" TEXT,
    "aiAssessmentJson" JSONB,
    "aiAssessedAt" TIMESTAMP(3),
    "assignedToId" TEXT,
    "referralPartnerId" TEXT,
    "wonAt" TIMESTAMP(3),
    "lostAt" TIMESTAMP(3),
    "lostReason" TEXT,
    "signedTier" TEXT,
    "signedMRR" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Note" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "authorId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralPartner" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company" TEXT,
    "category" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'BRONZE',
    "partnerCode" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "totalReferrals" INTEGER NOT NULL DEFAULT 0,
    "wonReferrals" INTEGER NOT NULL DEFAULT 0,
    "lifetimeCommission" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralPartner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralSubmission" (
    "id" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "contactPhone" TEXT,
    "industry" TEXT,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "leadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReferralSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatSession" (
    "id" TEXT NOT NULL,
    "visitorId" TEXT NOT NULL,
    "leadId" TEXT,
    "websiteHost" TEXT,
    "qualified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChatSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UploadedFile" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "cloudStoragePath" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "contentType" TEXT,
    "uploadedById" TEXT,
    "purpose" TEXT,
    "rowsImported" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadedFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "fromLeadId" TEXT,
    "businessName" TEXT NOT NULL,
    "ownerName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "industry" TEXT NOT NULL,
    "city" TEXT,
    "state" TEXT,
    "website" TEXT,
    "gbpUrl" TEXT,
    "facebookUrl" TEXT,
    "linkedinUrl" TEXT,
    "tier" TEXT NOT NULL DEFAULT 'LAUNCH_PAD',
    "monthlyMRR" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "onboardedAt" TIMESTAMP(3),
    "churnedAt" TIMESTAMP(3),
    "strategyBrief" TEXT,
    "primaryGoals" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientWorkOrder" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "authorId" TEXT,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "inputJson" JSONB,
    "outputMarkdown" TEXT,
    "intelligenceJson" JSONB,
    "tokensUsed" INTEGER,
    "generatedAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientWorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientNote" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentThread" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "persona" TEXT NOT NULL,
    "clientId" TEXT,
    "title" TEXT,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentThread_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentTurn" (
    "id" TEXT NOT NULL,
    "threadId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "toolName" TEXT,
    "toolCallsJson" JSONB,
    "modelUsed" TEXT,
    "tokenUsage" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentTurn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prospect" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "clientId" TEXT,
    "companyName" TEXT,
    "companyDomain" TEXT,
    "companyIndustry" TEXT,
    "companyEmployeeCount" INTEGER,
    "companyRevenue" INTEGER,
    "personFirstName" TEXT,
    "personLastName" TEXT,
    "personTitle" TEXT,
    "personEmail" TEXT,
    "personPhone" TEXT,
    "personLinkedinUrl" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "enrichedJson" JSONB,
    "promotedToLeadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prospect_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadGenCampaign" (
    "id" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "clientId" TEXT,
    "name" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "criteriaJson" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "totalFound" INTEGER NOT NULL DEFAULT 0,
    "totalPersisted" INTEGER NOT NULL DEFAULT 0,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LeadGenCampaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientIntelligence" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "gbpSnapshotJson" JSONB,
    "gscSummaryJson" JSONB,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientIntelligence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- CreateIndex
CREATE INDEX "Lead_source_idx" ON "Lead"("source");

-- CreateIndex
CREATE INDEX "Lead_industry_idx" ON "Lead"("industry");

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX "Note_leadId_idx" ON "Note"("leadId");

-- CreateIndex
CREATE INDEX "Activity_leadId_idx" ON "Activity"("leadId");

-- CreateIndex
CREATE INDEX "Activity_createdAt_idx" ON "Activity"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralPartner_userId_key" ON "ReferralPartner"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralPartner_email_key" ON "ReferralPartner"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralPartner_partnerCode_key" ON "ReferralPartner"("partnerCode");

-- CreateIndex
CREATE INDEX "ChatMessage_sessionId_idx" ON "ChatMessage"("sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "UploadedFile_cloudStoragePath_key" ON "UploadedFile"("cloudStoragePath");

-- CreateIndex
CREATE UNIQUE INDEX "Client_fromLeadId_key" ON "Client"("fromLeadId");

-- CreateIndex
CREATE INDEX "Client_status_idx" ON "Client"("status");

-- CreateIndex
CREATE INDEX "Client_industry_idx" ON "Client"("industry");

-- CreateIndex
CREATE INDEX "Client_createdAt_idx" ON "Client"("createdAt");

-- CreateIndex
CREATE INDEX "ClientWorkOrder_clientId_idx" ON "ClientWorkOrder"("clientId");

-- CreateIndex
CREATE INDEX "ClientWorkOrder_type_idx" ON "ClientWorkOrder"("type");

-- CreateIndex
CREATE INDEX "ClientWorkOrder_status_idx" ON "ClientWorkOrder"("status");

-- CreateIndex
CREATE INDEX "ClientWorkOrder_createdAt_idx" ON "ClientWorkOrder"("createdAt");

-- CreateIndex
CREATE INDEX "ClientNote_clientId_idx" ON "ClientNote"("clientId");

-- CreateIndex
CREATE INDEX "AgentThread_userId_persona_idx" ON "AgentThread"("userId", "persona");

-- CreateIndex
CREATE INDEX "AgentThread_clientId_idx" ON "AgentThread"("clientId");

-- CreateIndex
CREATE INDEX "AgentTurn_threadId_createdAt_idx" ON "AgentTurn"("threadId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Prospect_promotedToLeadId_key" ON "Prospect"("promotedToLeadId");

-- CreateIndex
CREATE INDEX "Prospect_clientId_idx" ON "Prospect"("clientId");

-- CreateIndex
CREATE INDEX "Prospect_personEmail_idx" ON "Prospect"("personEmail");

-- CreateIndex
CREATE INDEX "Prospect_companyDomain_idx" ON "Prospect"("companyDomain");

-- CreateIndex
CREATE UNIQUE INDEX "Prospect_source_sourceId_key" ON "Prospect"("source", "sourceId");

-- CreateIndex
CREATE INDEX "LeadGenCampaign_ownerId_idx" ON "LeadGenCampaign"("ownerId");

-- CreateIndex
CREATE INDEX "LeadGenCampaign_clientId_idx" ON "LeadGenCampaign"("clientId");

-- CreateIndex
CREATE UNIQUE INDEX "ClientIntelligence_clientId_key" ON "ClientIntelligence"("clientId");

-- CreateIndex
CREATE INDEX "ClientIntelligence_fetchedAt_idx" ON "ClientIntelligence"("fetchedAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_referralPartnerId_fkey" FOREIGN KEY ("referralPartnerId") REFERENCES "ReferralPartner"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Note" ADD CONSTRAINT "Note_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralPartner" ADD CONSTRAINT "ReferralPartner_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReferralSubmission" ADD CONSTRAINT "ReferralSubmission_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "ReferralPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatSession" ADD CONSTRAINT "ChatSession_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ChatSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientWorkOrder" ADD CONSTRAINT "ClientWorkOrder_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientWorkOrder" ADD CONSTRAINT "ClientWorkOrder_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientNote" ADD CONSTRAINT "ClientNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentThread" ADD CONSTRAINT "AgentThread_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentThread" ADD CONSTRAINT "AgentThread_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentTurn" ADD CONSTRAINT "AgentTurn_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "AgentThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prospect" ADD CONSTRAINT "Prospect_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientIntelligence" ADD CONSTRAINT "ClientIntelligence_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
