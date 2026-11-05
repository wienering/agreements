-- Event internal notes (2026-11). Additive only: private notes attendants and clients never see.

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "internalNotes" TEXT;
