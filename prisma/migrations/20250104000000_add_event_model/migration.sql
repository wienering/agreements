-- CreateEventTable
CREATE TABLE "Event" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3),
    "eventType" TEXT,
    "eventLocation" TEXT,
    "eventStartTime" TEXT,
    "eventDuration" TEXT,
    "eventPackage" TEXT,
    "packagePrice" DECIMAL(10,2),
    "notes" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- AddEventIdToAgreement
ALTER TABLE "Agreement" ADD COLUMN "eventId" TEXT;

-- CreateIndexes
CREATE INDEX "Event_clientId_idx" ON "Event"("clientId");
CREATE INDEX "Event_archived_idx" ON "Event"("archived");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agreement" ADD CONSTRAINT "Agreement_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

