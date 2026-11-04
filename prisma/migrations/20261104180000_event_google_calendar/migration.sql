-- Google Calendar sync (2026-11). Additive only: the calendar entry id and last sync time per event.

-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "googleCalendarEventId" TEXT,
ADD COLUMN     "googleCalendarSyncedAt" TIMESTAMP(3);
