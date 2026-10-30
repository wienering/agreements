import { logAgreementActivity } from '@/lib/activityLog';
import { torontoDateKey } from '@/lib/dates';
import { trashFileInDrive } from '@/lib/google-drive';
import { prisma } from '@/lib/prisma';

/**
 * Event uploads are moved to Google Drive trash once their event is more than this many days
 * in the past (Toronto days). Drive keeps trashed files for 30 days. Files without an event,
 * or whose event has no date, are never touched.
 */
export const UPLOAD_GRACE_DAYS = 14;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Deletes happen only when UPLOAD_AUTODELETE_ENABLED is "true" on the production deployment. */
export function uploadAutoDeleteEnabled(
  flag: string | undefined = process.env.UPLOAD_AUTODELETE_ENABLED,
  vercelEnv: string | undefined = process.env.VERCEL_ENV,
): boolean {
  return flag?.trim().toLowerCase() === 'true' && vercelEnv === 'production';
}

/** True when the event's Toronto day is more than UPLOAD_GRACE_DAYS before today's. */
export function isUploadExpired(eventDate: Date | null, now: Date): boolean {
  if (!eventDate) return false;
  const cutoffKey = torontoDateKey(new Date(now.getTime() - UPLOAD_GRACE_DAYS * DAY_MS));
  return torontoDateKey(eventDate) < cutoffKey;
}

export type ExpiredUploadItem = {
  fileId: string;
  fileName: string;
  clientName: string;
  eventDateKey: string;
  result: 'would trash' | 'trashed' | 'failed';
  error?: string;
};

export type UploadAutoDeleteSummary = { dryRun: boolean; items: ExpiredUploadItem[] };

export async function runUploadAutoDelete(options: { now: Date; dryRun: boolean }): Promise<UploadAutoDeleteSummary> {
  const { now, dryRun } = options;

  // Coarse filter a day wide; isUploadExpired settles the Toronto day.
  const files = await prisma.clientFile.findMany({
    where: {
      eventId: { not: null },
      event: { eventDate: { lt: new Date(now.getTime() - (UPLOAD_GRACE_DAYS - 1) * DAY_MS) } },
    },
    select: {
      id: true,
      fileName: true,
      googleDriveFileId: true,
      eventId: true,
      client: { select: { firstName: true, lastName: true } },
      event: {
        select: {
          eventDate: true,
          agreements: { select: { id: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const summary: UploadAutoDeleteSummary = { dryRun, items: [] };
  for (const file of files) {
    const eventDate = file.event?.eventDate ?? null;
    if (!file.eventId || !isUploadExpired(eventDate, now)) continue;

    const item = {
      fileId: file.id,
      fileName: file.fileName,
      clientName: `${file.client.firstName} ${file.client.lastName}`.trim(),
      eventDateKey: torontoDateKey(eventDate as Date),
    };

    if (dryRun) {
      summary.items.push({ ...item, result: 'would trash' });
      continue;
    }

    try {
      await trashFileInDrive(file.googleDriveFileId);
    } catch (error) {
      // Keep the record so the next run retries and the file stays visible to admins.
      summary.items.push({
        ...item,
        result: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });
      continue;
    }

    await prisma.clientFile.delete({ where: { id: file.id } });
    for (const agreement of file.event?.agreements ?? []) {
      await logAgreementActivity(agreement.id, 'UPLOAD_AUTO_DELETED', {
        fileName: file.fileName,
        googleDriveFileId: file.googleDriveFileId,
        eventDate: item.eventDateKey,
        graceDays: UPLOAD_GRACE_DAYS,
      });
    }
    summary.items.push({ ...item, result: 'trashed' });
  }
  return summary;
}

const TELEGRAM_LIST_LIMIT = 40;

function itemLine(item: ExpiredUploadItem): string {
  return `• ${item.clientName}: ${item.fileName} (event ${item.eventDateKey})`;
}

function listLines(items: ExpiredUploadItem[], withError = false): string[] {
  const lines = items
    .slice(0, TELEGRAM_LIST_LIMIT)
    .map((i) => (withError && i.error ? `${itemLine(i)}\n  ${i.error}` : itemLine(i)));
  if (items.length > TELEGRAM_LIST_LIMIT) lines.push(`…and ${items.length - TELEGRAM_LIST_LIMIT} more`);
  return lines;
}

/** Telegram messages for a run, or none when there was nothing to do. */
export function uploadAutoDeleteMessages(summary: UploadAutoDeleteSummary): string[] {
  const messages: string[] = [];
  if (summary.dryRun) {
    if (summary.items.length > 0) {
      messages.push(
        [
          `Upload auto-delete (report only, UPLOAD_AUTODELETE_ENABLED is off): would move ${summary.items.length} file(s) to Drive trash, events more than ${UPLOAD_GRACE_DAYS} days ago.`,
          ...listLines(summary.items),
        ].join('\n'),
      );
    }
    return messages;
  }

  const trashed = summary.items.filter((i) => i.result === 'trashed');
  const failed = summary.items.filter((i) => i.result === 'failed');
  if (trashed.length > 0) {
    messages.push(
      [`Upload auto-delete: moved ${trashed.length} file(s) to Drive trash.`, ...listLines(trashed)].join('\n'),
    );
  }
  if (failed.length > 0) {
    messages.push(
      [
        `⚠️ Upload auto-delete error: ${failed.length} file(s) could not be moved to Drive trash. Their records were kept and will be retried tomorrow.`,
        ...listLines(failed, true),
      ].join('\n'),
    );
  }
  return messages;
}
