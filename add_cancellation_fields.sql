-- Add cancellation fields to Agreement table and update enum
ALTER TABLE "Agreement" ADD COLUMN "cancelledAt" TIMESTAMP(3);
ALTER TABLE "Agreement" ADD COLUMN "cancelledBy" TEXT;
ALTER TABLE "Agreement" ADD COLUMN "cancellationReason" TEXT;

-- Add CANCELLED to AgreementStatus enum
ALTER TYPE "AgreementStatus" ADD VALUE 'CANCELLED';
