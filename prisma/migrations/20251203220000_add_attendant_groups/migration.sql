-- CreateTable
CREATE TABLE "AttendantGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "attendantIds" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AttendantGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AttendantGroup_slug_key" ON "AttendantGroup"("slug");

-- CreateIndex
CREATE INDEX "AttendantGroup_slug_idx" ON "AttendantGroup"("slug");


