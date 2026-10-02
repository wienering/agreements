-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AgreementActivityType" ADD VALUE 'PAYMENT_MARKED_PAID';
ALTER TYPE "AgreementActivityType" ADD VALUE 'BALANCE_REMINDER_SENT';

-- AlterTable
ALTER TABLE "Agreement" ADD COLUMN     "balanceDigestSnoozedUntil" TIMESTAMP(3),
ADD COLUMN     "balanceReminderSentAt" TIMESTAMP(3);
