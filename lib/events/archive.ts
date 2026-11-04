import { prisma } from '@/lib/prisma';

/**
 * Archive an event and its agreements together (same timestamp, so unarchiving restores exactly
 * those agreements). Returns false when the event doesn't exist.
 */
export async function setEventArchived(eventId: string, archived: boolean): Promise<boolean> {
  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true, archivedAt: true } });
  if (!event) return false;
  if (archived) {
    const archivedAt = new Date();
    await prisma.$transaction([
      prisma.event.update({ where: { id: eventId }, data: { archived: true, archivedAt } }),
      prisma.agreement.updateMany({ where: { eventId, archived: false }, data: { archived: true, archivedAt } }),
    ]);
  } else {
    await prisma.$transaction([
      prisma.event.update({ where: { id: eventId }, data: { archived: false, archivedAt: null } }),
      ...(event.archivedAt
        ? [
            prisma.agreement.updateMany({
              where: { eventId, archived: true, archivedAt: event.archivedAt },
              data: { archived: false, archivedAt: null },
            }),
          ]
        : []),
    ]);
  }
  return true;
}
