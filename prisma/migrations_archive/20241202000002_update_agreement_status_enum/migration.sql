-- Update AgreementStatus enum to include new values
-- First, add the new enum values
ALTER TYPE "AgreementStatus" ADD VALUE 'LIVE';
ALTER TYPE "AgreementStatus" ADD VALUE 'COMPLETED';

-- Remove old values (if they exist and are not being used)
-- Note: Only run these if you're sure no agreements are using the old values
-- ALTER TYPE "AgreementStatus" DROP VALUE 'SENT';
-- ALTER TYPE "AgreementStatus" DROP VALUE 'VOID';
