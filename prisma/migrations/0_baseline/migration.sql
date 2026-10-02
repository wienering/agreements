-- CreateEnum
CREATE TYPE "AgreementStatus" AS ENUM ('DRAFT', 'SENT', 'SIGNED', 'VOID', 'LIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AgreementActivityType" AS ENUM ('SENT', 'VIEWED', 'SIGNED', 'SIGNED_SECOND', 'REMINDER_SENT', 'CANCELLED', 'NOTE_ADDED', 'BACKDROP_SELECTED', 'PAYMENT_MARKED_PAID', 'BALANCE_REMINDER_SENT');

-- CreateEnum
CREATE TYPE "LeadStage" AS ENUM ('QUOTE_REQUESTED', 'QUOTE_SENT', 'AGREEMENT_SENT', 'SIGNED', 'COMPLETED', 'LOST');

-- CreateEnum
CREATE TYPE "LeadSource" AS ENUM ('QUOTE', 'MANUAL');

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
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "emailGreetingName" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "eventDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "eventType" TEXT,
    "eventLocation" TEXT,
    "eventStartTime" TEXT,
    "eventDuration" TEXT,
    "eventPackage" TEXT,
    "packagePrice" DECIMAL(10,2),
    "address" TEXT,
    "addressAddedAt" TIMESTAMP(3),
    "phoneAddedAt" TIMESTAMP(3),
    "isWhitelabelClient" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Template" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "htmlContent" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "fieldsSchema" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "internalTitle" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Template_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Agreement" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "eventId" TEXT,
    "status" "AgreementStatus" NOT NULL DEFAULT 'DRAFT',
    "uniqueToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "mergedHtml" TEXT,
    "customHtmlContent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "signedAt" TIMESTAMP(3),
    "signedFromIP" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "cancellationReason" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "lastEmailedAt" TIMESTAMP(3),
    "emailSendCount" INTEGER NOT NULL DEFAULT 0,
    "firstViewedAt" TIMESTAMP(3),
    "lastViewedAt" TIMESTAMP(3),
    "notesLastViewedAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "paymentStatus" TEXT,
    "stripePaymentLink" TEXT,
    "stripeReceiptLink" TEXT,
    "galleryLink" TEXT,
    "galleryLinks" JSONB,
    "galleryEmailSentAt" TIMESTAMP(3),
    "reviewRequestSentAt" TIMESTAMP(3),
    "nextAction" TEXT,
    "backdropLinkId" TEXT,
    "selectedBackdropName" TEXT,
    "showPhoneNumberAlways" BOOLEAN NOT NULL DEFAULT false,
    "forceVirtualGreenScreen" BOOLEAN NOT NULL DEFAULT false,
    "secondSignerEnabled" BOOLEAN NOT NULL DEFAULT false,
    "secondSignerFirstName" TEXT,
    "secondSignerLastName" TEXT,
    "secondSignerEmail" TEXT,
    "secondSignerPhone" TEXT,
    "requireBothSignatures" BOOLEAN NOT NULL DEFAULT false,
    "leadId" TEXT,
    "chaserPaused" BOOLEAN NOT NULL DEFAULT false,
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "lastReminderAt" TIMESTAMP(3),
    "balanceDigestSnoozedUntil" TIMESTAMP(3),
    "balanceReminderSentAt" TIMESTAMP(3),

    CONSTRAINT "Agreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgreementActivity" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "type" "AgreementActivityType" NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgreementActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgreementField" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "editableByClient" BOOLEAN NOT NULL DEFAULT false,
    "required" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AgreementField_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgreementFieldValue" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "AgreementFieldValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Signature" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "signerName" TEXT NOT NULL,
    "signerEmail" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "imageUrl" TEXT,
    "typedFont" TEXT,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" TEXT,
    "userAgent" TEXT,
    "contentHash" TEXT,

    CONSTRAINT "Signature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientSession" (
    "id" TEXT NOT NULL,
    "clientEmail" TEXT,
    "secondaryEmail" TEXT,
    "sessionToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientNote" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "agreementId" TEXT,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BackdropLink" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BackdropLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AttendantGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "attendantIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendantGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3),
    "eventType" TEXT,
    "eventLocation" TEXT,
    "eventStartTime" TEXT,
    "eventDuration" TEXT,
    "eventPackage" TEXT,
    "packagePrice" DECIMAL(10,2),
    "notes" TEXT,
    "eventName" TEXT,
    "eventPhone" TEXT,
    "unlimitedPrints" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientFile" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "eventId" TEXT,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "googleDriveFileId" TEXT NOT NULL,
    "googleDriveLink" TEXT NOT NULL,
    "googleDriveFolderId" TEXT NOT NULL,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortalOtpVerification" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PortalOtpVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OtpRequestLog" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ip" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OtpRequestLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lead" (
    "id" TEXT NOT NULL,
    "source" "LeadSource" NOT NULL DEFAULT 'QUOTE',
    "stage" "LeadStage" NOT NULL DEFAULT 'QUOTE_REQUESTED',
    "notes" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "eventDate" TIMESTAMP(3),
    "eventType" TEXT,
    "eventLocation" TEXT,
    "quotePackageHours" INTEGER,
    "quoteTotal" DECIMAL(10,2),
    "quotePdfUrl" TEXT,
    "lastContactedAt" TIMESTAMP(3),
    "nextFollowUpAt" TIMESTAMP(3),
    "contactCount" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" TIMESTAMP(3),
    "archiveReason" TEXT,
    "clientId" TEXT,
    "eventId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Client_email_key" ON "Client"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Agreement_uniqueToken_key" ON "Agreement"("uniqueToken");

-- CreateIndex
CREATE UNIQUE INDEX "Agreement_leadId_key" ON "Agreement"("leadId");

-- CreateIndex
CREATE INDEX "Agreement_clientId_idx" ON "Agreement"("clientId");

-- CreateIndex
CREATE INDEX "Agreement_templateId_idx" ON "Agreement"("templateId");

-- CreateIndex
CREATE INDEX "Agreement_eventId_idx" ON "Agreement"("eventId");

-- CreateIndex
CREATE INDEX "Agreement_status_archived_idx" ON "Agreement"("status", "archived");

-- CreateIndex
CREATE INDEX "Agreement_secondSignerEmail_idx" ON "Agreement"("secondSignerEmail");

-- CreateIndex
CREATE INDEX "AgreementActivity_agreementId_createdAt_idx" ON "AgreementActivity"("agreementId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AgreementField_templateId_key_key" ON "AgreementField"("templateId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "AgreementFieldValue_agreementId_key_key" ON "AgreementFieldValue"("agreementId", "key");

-- CreateIndex
CREATE INDEX "Signature_agreementId_idx" ON "Signature"("agreementId");

-- CreateIndex
CREATE UNIQUE INDEX "Signature_agreementId_signerEmail_key" ON "Signature"("agreementId", "signerEmail");

-- CreateIndex
CREATE UNIQUE INDEX "ClientSession_sessionToken_key" ON "ClientSession"("sessionToken");

-- CreateIndex
CREATE INDEX "ClientSession_clientEmail_idx" ON "ClientSession"("clientEmail");

-- CreateIndex
CREATE INDEX "ClientSession_secondaryEmail_idx" ON "ClientSession"("secondaryEmail");

-- CreateIndex
CREATE INDEX "ClientNote_clientId_idx" ON "ClientNote"("clientId");

-- CreateIndex
CREATE INDEX "ClientNote_agreementId_createdAt_idx" ON "ClientNote"("agreementId", "createdAt");

-- CreateIndex
CREATE INDEX "BackdropLink_displayOrder_idx" ON "BackdropLink"("displayOrder");

-- CreateIndex
CREATE UNIQUE INDEX "AttendantGroup_slug_key" ON "AttendantGroup"("slug");

-- CreateIndex
CREATE INDEX "AttendantGroup_slug_idx" ON "AttendantGroup"("slug");

-- CreateIndex
CREATE INDEX "Event_clientId_idx" ON "Event"("clientId");

-- CreateIndex
CREATE INDEX "Event_archived_idx" ON "Event"("archived");

-- CreateIndex
CREATE INDEX "Event_eventDate_idx" ON "Event"("eventDate");

-- CreateIndex
CREATE INDEX "ClientFile_clientId_idx" ON "ClientFile"("clientId");

-- CreateIndex
CREATE INDEX "ClientFile_eventId_idx" ON "ClientFile"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Settings_key_key" ON "Settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "PortalOtpVerification_email_key" ON "PortalOtpVerification"("email");

-- CreateIndex
CREATE INDEX "OtpRequestLog_email_createdAt_idx" ON "OtpRequestLog"("email", "createdAt");

-- CreateIndex
CREATE INDEX "OtpRequestLog_ip_createdAt_idx" ON "OtpRequestLog"("ip", "createdAt");

-- CreateIndex
CREATE INDEX "Lead_stage_idx" ON "Lead"("stage");

-- CreateIndex
CREATE INDEX "Lead_nextFollowUpAt_idx" ON "Lead"("nextFollowUpAt");

-- CreateIndex
CREATE INDEX "Lead_email_idx" ON "Lead"("email");

-- CreateIndex
CREATE INDEX "Lead_eventDate_idx" ON "Lead"("eventDate");

-- CreateIndex
CREATE INDEX "Lead_archivedAt_idx" ON "Lead"("archivedAt");
