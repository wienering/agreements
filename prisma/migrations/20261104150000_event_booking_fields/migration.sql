-- Events become the booking (2026-11). Adds booking fields and a status to Event, an EventActivity log,
-- and ClientNote.eventId. Purely additive: nothing is dropped or rewritten, and Agreement keeps its
-- columns so past bookings stay exactly as they are. Data is copied separately by
-- scripts/move-bookings-to-events.ts (report-only until run with --apply).
-- Written by hand in Prisma's style; after applying, `prisma migrate diff --from-url ... --to-schema-datamodel`
-- should report no difference.

-- AlterEnum
ALTER TYPE "AgreementActivityType" ADD VALUE 'EVENT_STATUS_CHANGED';
ALTER TYPE "AgreementActivityType" ADD VALUE 'MOVED_FROM_AGREEMENT';

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('UPCOMING', 'COMPLETED', 'CANCELLED');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "status" "EventStatus" NOT NULL DEFAULT 'UPCOMING',
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "paymentStatus" TEXT NOT NULL DEFAULT 'Not paid',
ADD COLUMN     "stripePaymentLink" TEXT,
ADD COLUMN     "stripeReceiptLink" TEXT,
ADD COLUMN     "galleryLinks" JSONB,
ADD COLUMN     "galleryEmailSentAt" TIMESTAMP(3),
ADD COLUMN     "reviewRequestSentAt" TIMESTAMP(3),
ADD COLUMN     "nextAction" TEXT,
ADD COLUMN     "backdropLinkId" TEXT,
ADD COLUMN     "selectedBackdropName" TEXT,
ADD COLUMN     "showPhoneNumberAlways" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "forceVirtualGreenScreen" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "balanceDigestSnoozedUntil" TIMESTAMP(3),
ADD COLUMN     "balanceReminderSentAt" TIMESTAMP(3),
ADD COLUMN     "followUpsPaused" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "reviewReceived" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "galleryHeldAlertAt" TIMESTAMP(3),
ADD COLUMN     "notesLastViewedAt" TIMESTAMP(3);

-- Payment status is one of the five list values (PAYMENT_STATUSES in lib/paymentStatus.ts), same as Agreement
ALTER TABLE "Event" ADD CONSTRAINT "Event_paymentStatus_check"
  CHECK ("paymentStatus" IN ('Not paid', 'Invoice issued', 'Deposit paid', 'Balance due', 'Fully paid'));

-- AlterTable
ALTER TABLE "ClientNote" ADD COLUMN     "eventId" TEXT;

-- CreateTable
CREATE TABLE "EventActivity" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" "AgreementActivityType" NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventActivity_eventId_createdAt_idx" ON "EventActivity"("eventId", "createdAt");

-- CreateIndex
CREATE INDEX "Event_status_archived_idx" ON "Event"("status", "archived");

-- CreateIndex
CREATE INDEX "Event_backdropLinkId_idx" ON "Event"("backdropLinkId");

-- CreateIndex
CREATE INDEX "ClientNote_eventId_createdAt_idx" ON "ClientNote"("eventId", "createdAt");
