-- AlterTable
ALTER TABLE "BackdropLink" ADD COLUMN     "attendantId" TEXT;

-- CreateTable
CREATE TABLE "Attendant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "externalId" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Attendant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Attendant_externalId_key" ON "Attendant"("externalId");

-- CreateIndex
CREATE INDEX "Attendant_active_idx" ON "Attendant"("active");

-- CreateIndex
CREATE INDEX "BackdropLink_attendantId_idx" ON "BackdropLink"("attendantId");
