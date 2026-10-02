import { prisma } from '@/lib/prisma';

/**
 * Archive or unarchive an agreement, keeping its Event in step:
 * - archiving archives the Event once every agreement on it is archived;
 * - unarchiving unarchives the Event.
 * Sends nothing. Returns the updated agreement.
 */
export async function setAgreementArchived(agreementId: string, archived: boolean, now: Date = new Date()) {
  const agreement = await prisma.agreement.update({
    where: { id: agreementId },
    data: { archived, archivedAt: archived ? now : null },
  });
  await syncEventArchive(agreement.eventId, archived, now);
  return agreement;
}

/**
 * The Event half of setAgreementArchived, run after the agreement's own update.
 * Both writes are conditional, so running it twice changes nothing.
 */
export async function syncEventArchive(eventId: string | null, agreementArchived: boolean, now: Date = new Date()) {
  if (!eventId) return;

  if (!agreementArchived) {
    await prisma.event.updateMany({
      where: { id: eventId, archived: true },
      data: { archived: false, archivedAt: null },
    });
    return;
  }

  const stillActive = await prisma.agreement.count({ where: { eventId, archived: false } });
  if (stillActive === 0) {
    await prisma.event.updateMany({
      where: { id: eventId, archived: false },
      data: { archived: true, archivedAt: now },
    });
  }
}
