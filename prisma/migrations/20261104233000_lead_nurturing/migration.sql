-- Lead nurturing (2026-11). Additive: nothing is dropped or rewritten.
--   * Lead.status (New / Following up / Booked / Lost / Paused) next to the old Lead.stage, filled from stage.
--     Lead.stage stays for one release and is dropped in a later migration.
--   * LeadSource gets BOOKING_FORM (abandoned-booking leads from WF1).
--   * Lead gets lostReason, sheetLeadId (the Sheet's lead_id), lastReplyAt and Sheet sync fields.
--   * New LeadActivity table: the timeline of touches, status changes and notes.
--   * Each existing lead gets one "Created" timeline entry dated when the lead came in.

-- New enum value. Kept outside the transaction below; it isn't used anywhere in this migration.
ALTER TYPE "LeadSource" ADD VALUE IF NOT EXISTS 'BOOKING_FORM';

BEGIN;

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NEW', 'FOLLOWING_UP', 'BOOKED', 'LOST', 'PAUSED');
CREATE TYPE "LeadActivityKind" AS ENUM ('CREATED', 'EMAIL_SENT', 'SMS_SENT', 'REPLY_DETECTED', 'STATUS_CHANGED', 'DELAYED', 'NOTE', 'CALL');

-- AlterTable: new Lead columns (all nullable or defaulted, so existing rows are fine)
ALTER TABLE "Lead" ADD COLUMN "status" "LeadStatus" NOT NULL DEFAULT 'NEW',
ADD COLUMN "lostReason" TEXT,
ADD COLUMN "sheetLeadId" TEXT,
ADD COLUMN "lastReplyAt" TIMESTAMP(3),
ADD COLUMN "sheetSyncedAt" TIMESTAMP(3),
ADD COLUMN "sheetSyncError" TEXT;

-- Backfill status from the old stage
UPDATE "Lead" SET "status" = CASE "stage"
  WHEN 'QUOTE_REQUESTED' THEN 'NEW'::"LeadStatus"
  WHEN 'QUOTE_SENT'      THEN 'NEW'::"LeadStatus"
  WHEN 'AGREEMENT_SENT'  THEN 'BOOKED'::"LeadStatus"
  WHEN 'SIGNED'          THEN 'BOOKED'::"LeadStatus"
  WHEN 'COMPLETED'       THEN 'BOOKED'::"LeadStatus"
  WHEN 'LOST'            THEN 'LOST'::"LeadStatus"
END;

-- CreateTable
CREATE TABLE "LeadActivity" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "kind" "LeadActivityKind" NOT NULL,
    "touchNumber" INTEGER,
    "summary" TEXT,
    "source" TEXT NOT NULL,
    "externalKey" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeadActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LeadActivity_externalKey_key" ON "LeadActivity"("externalKey");
CREATE INDEX "LeadActivity_leadId_occurredAt_idx" ON "LeadActivity"("leadId", "occurredAt");
CREATE UNIQUE INDEX "Lead_sheetLeadId_key" ON "Lead"("sheetLeadId");
CREATE INDEX "Lead_status_idx" ON "Lead"("status");

-- Backfill: one "Created" entry per existing lead, dated when the lead came in
INSERT INTO "LeadActivity" ("id", "leadId", "kind", "summary", "source", "occurredAt", "createdAt")
SELECT 'bf_' || "id", "id", 'CREATED', 'Lead came in', 'backfill', "createdAt", CURRENT_TIMESTAMP
FROM "Lead";

COMMIT;
