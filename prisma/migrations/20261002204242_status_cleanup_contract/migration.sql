-- Status cleanup step 5 (contract). Generated with prisma migrate diff; the CHECK constraint is added by
-- hand because Prisma can't express it. Everything runs in one transaction: all of it applies or none.
-- Precondition (checked read-only before applying): no LIVE or VOID rows, no NULL or off-list payment status.
BEGIN;

-- AlterEnum: AgreementStatus without LIVE and VOID
CREATE TYPE "AgreementStatus_new" AS ENUM ('DRAFT', 'SENT', 'SIGNED', 'COMPLETED', 'CANCELLED');
ALTER TABLE "public"."Agreement" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Agreement" ALTER COLUMN "status" TYPE "AgreementStatus_new" USING ("status"::text::"AgreementStatus_new");
ALTER TYPE "AgreementStatus" RENAME TO "AgreementStatus_old";
ALTER TYPE "AgreementStatus_new" RENAME TO "AgreementStatus";
DROP TYPE "public"."AgreementStatus_old";
ALTER TABLE "Agreement" ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- AlterTable: payment status is required and defaults to Not paid
ALTER TABLE "Agreement" ALTER COLUMN "paymentStatus" SET NOT NULL,
ALTER COLUMN "paymentStatus" SET DEFAULT 'Not paid';

-- Payment status is one of the five list values (PAYMENT_STATUSES in lib/paymentStatus.ts)
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_paymentStatus_check"
  CHECK ("paymentStatus" IN ('Not paid', 'Invoice issued', 'Deposit paid', 'Balance due', 'Fully paid'));

COMMIT;
