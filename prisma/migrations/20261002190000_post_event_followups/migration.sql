-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AgreementActivityType" ADD VALUE 'GALLERY_EMAIL_SENT';
ALTER TYPE "AgreementActivityType" ADD VALUE 'GALLERY_EMAIL_HELD';
ALTER TYPE "AgreementActivityType" ADD VALUE 'REVIEW_REQUEST_SENT';
ALTER TYPE "AgreementActivityType" ADD VALUE 'REVIEW_REQUEST_SKIPPED';
ALTER TYPE "AgreementActivityType" ADD VALUE 'FOLLOWUPS_PAUSED';
ALTER TYPE "AgreementActivityType" ADD VALUE 'FOLLOWUPS_RESUMED';
ALTER TYPE "AgreementActivityType" ADD VALUE 'FOLLOWUP_EMAIL_FAILED';

-- AlterTable
ALTER TABLE "Agreement" ADD COLUMN     "followUpsPaused" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "galleryHeldAlertAt" TIMESTAMP(3),
ADD COLUMN     "reviewReceived" BOOLEAN NOT NULL DEFAULT false;
