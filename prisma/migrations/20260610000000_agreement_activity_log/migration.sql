-- CreateEnum
CREATE TYPE "AgreementActivityType" AS ENUM ('SENT', 'VIEWED', 'SIGNED', 'SIGNED_SECOND', 'REMINDER_SENT', 'CANCELLED', 'NOTE_ADDED');

-- AlterTable
ALTER TABLE "Agreement" ADD COLUMN "chaserPaused" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Agreement" ADD COLUMN "reminderCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Agreement" ADD COLUMN "lastReminderAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "AgreementActivity" (
    "id" TEXT NOT NULL,
    "agreementId" TEXT NOT NULL,
    "type" "AgreementActivityType" NOT NULL,
    "meta" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgreementActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgreementActivity_agreementId_createdAt_idx" ON "AgreementActivity"("agreementId", "createdAt");
