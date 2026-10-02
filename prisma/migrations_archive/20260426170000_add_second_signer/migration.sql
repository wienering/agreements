-- AlterTable: add second signer fields to Agreement
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "secondSignerEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "secondSignerFirstName" TEXT;
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "secondSignerLastName" TEXT;
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "secondSignerEmail" TEXT;
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "secondSignerPhone" TEXT;
ALTER TABLE "Agreement" ADD COLUMN IF NOT EXISTS "requireBothSignatures" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex on Agreement.secondSignerEmail
CREATE INDEX IF NOT EXISTS "Agreement_secondSignerEmail_idx" ON "Agreement"("secondSignerEmail");

-- AlterTable: ClientSession.secondaryEmail
ALTER TABLE "ClientSession" ADD COLUMN IF NOT EXISTS "secondaryEmail" TEXT;
CREATE INDEX IF NOT EXISTS "ClientSession_secondaryEmail_idx" ON "ClientSession"("secondaryEmail");

-- AlterTable: Signature - drop unique on agreementId, add composite unique on [agreementId, signerEmail]
DROP INDEX IF EXISTS "Signature_agreementId_key";
CREATE UNIQUE INDEX IF NOT EXISTS "Signature_agreementId_signerEmail_key" ON "Signature"("agreementId", "signerEmail");
CREATE INDEX IF NOT EXISTS "Signature_agreementId_idx" ON "Signature"("agreementId");
