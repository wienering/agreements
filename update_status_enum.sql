-- Update AgreementStatus enum to include new values
-- Run this in your Neon database console

-- Add the new enum values
ALTER TYPE "AgreementStatus" ADD VALUE 'LIVE';
ALTER TYPE "AgreementStatus" ADD VALUE 'COMPLETED';

-- Note: The old values 'SENT' and 'VOID' will remain for backward compatibility
-- If you want to remove them later, you can run:
-- ALTER TYPE "AgreementStatus" DROP VALUE 'SENT';
-- ALTER TYPE "AgreementStatus" DROP VALUE 'VOID';
-- But only do this if no agreements are using those values
