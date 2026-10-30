import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  prisma: { clientFile: { findMany: vi.fn(), delete: vi.fn() } },
  logAgreementActivity: vi.fn(),
  trashFileInDrive: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }));
vi.mock('@/lib/activityLog', () => ({ logAgreementActivity: mocks.logAgreementActivity }));
vi.mock('@/lib/google-drive', () => ({ trashFileInDrive: mocks.trashFileInDrive }));

import {
  UPLOAD_GRACE_DAYS,
  isUploadExpired,
  runUploadAutoDelete,
  uploadAutoDeleteEnabled,
  uploadAutoDeleteMessages,
} from '@/lib/files/autoDelete';

// 2026-10-29, 9:30am Toronto.
const NOW = new Date('2026-10-29T13:30:00.000Z');

function record(overrides: Record<string, unknown> = {}) {
  return {
    id: 'file_1',
    fileName: 'Final.png',
    googleDriveFileId: 'drive_1',
    eventId: 'evt_1',
    client: { firstName: 'Ada', lastName: 'Lovelace' },
    event: {
      eventDate: new Date('2026-10-10T22:00:00.000Z'),
      agreements: [{ id: 'agr_1' }, { id: 'agr_2' }],
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('UPLOAD_GRACE_DAYS', () => {
  it('is 14 days', () => {
    expect(UPLOAD_GRACE_DAYS).toBe(14);
  });
});

describe('isUploadExpired', () => {
  it('expires once the event is more than 14 Toronto days ago', () => {
    // Oct 14 is 15 days before Oct 29.
    expect(isUploadExpired(new Date('2026-10-14T22:00:00.000Z'), NOW)).toBe(true);
    // Oct 15 is exactly 14 days before: kept one more day.
    expect(isUploadExpired(new Date('2026-10-15T22:00:00.000Z'), NOW)).toBe(false);
  });

  it('uses the Toronto day, not UTC', () => {
    // 11pm Toronto on Oct 14 is Oct 15 in UTC; it is still the Oct 14 event.
    expect(isUploadExpired(new Date('2026-10-15T03:00:00.000Z'), NOW)).toBe(true);
  });

  it('never expires an event without a date', () => {
    expect(isUploadExpired(null, NOW)).toBe(false);
  });
});

describe('uploadAutoDeleteEnabled', () => {
  it('needs the flag set to true on production', () => {
    expect(uploadAutoDeleteEnabled('true', 'production')).toBe(true);
    expect(uploadAutoDeleteEnabled(' TRUE ', 'production')).toBe(true);
    expect(uploadAutoDeleteEnabled(undefined, 'production')).toBe(false);
    expect(uploadAutoDeleteEnabled('false', 'production')).toBe(false);
    expect(uploadAutoDeleteEnabled('true', 'preview')).toBe(false);
    expect(uploadAutoDeleteEnabled('true', undefined)).toBe(false);
  });
});

describe('runUploadAutoDelete', () => {
  it('only queries files that have an event', async () => {
    mocks.prisma.clientFile.findMany.mockResolvedValue([]);
    await runUploadAutoDelete({ now: NOW, dryRun: true });
    const where = mocks.prisma.clientFile.findMany.mock.calls[0][0].where;
    expect(where.eventId).toEqual({ not: null });
  });

  it('reports without touching Drive or the database in a dry run', async () => {
    mocks.prisma.clientFile.findMany.mockResolvedValue([record()]);
    const summary = await runUploadAutoDelete({ now: NOW, dryRun: true });
    expect(summary.items).toEqual([
      expect.objectContaining({ fileId: 'file_1', eventDateKey: '2026-10-10', result: 'would trash' }),
    ]);
    expect(mocks.trashFileInDrive).not.toHaveBeenCalled();
    expect(mocks.prisma.clientFile.delete).not.toHaveBeenCalled();
    expect(mocks.logAgreementActivity).not.toHaveBeenCalled();
  });

  it('skips files whose event is still inside the grace period', async () => {
    mocks.prisma.clientFile.findMany.mockResolvedValue([
      record({ event: { eventDate: new Date('2026-10-15T22:00:00.000Z'), agreements: [] } }),
    ]);
    const summary = await runUploadAutoDelete({ now: NOW, dryRun: false });
    expect(summary.items).toEqual([]);
    expect(mocks.trashFileInDrive).not.toHaveBeenCalled();
  });

  it('trashes in Drive, then deletes the record and logs on each agreement', async () => {
    mocks.prisma.clientFile.findMany.mockResolvedValue([record()]);
    mocks.trashFileInDrive.mockResolvedValue(undefined);
    const summary = await runUploadAutoDelete({ now: NOW, dryRun: false });

    expect(mocks.trashFileInDrive).toHaveBeenCalledWith('drive_1');
    expect(mocks.prisma.clientFile.delete).toHaveBeenCalledWith({ where: { id: 'file_1' } });
    expect(mocks.logAgreementActivity).toHaveBeenCalledTimes(2);
    expect(mocks.logAgreementActivity).toHaveBeenCalledWith(
      'agr_1',
      'UPLOAD_AUTO_DELETED',
      expect.objectContaining({ fileName: 'Final.png', eventDate: '2026-10-10', graceDays: 14 }),
    );
    expect(summary.items[0].result).toBe('trashed');
  });

  it('keeps the record and reports a failure when Drive fails', async () => {
    mocks.prisma.clientFile.findMany.mockResolvedValue([record()]);
    mocks.trashFileInDrive.mockRejectedValue(new Error('Failed to trash file: 403'));
    const summary = await runUploadAutoDelete({ now: NOW, dryRun: false });

    expect(mocks.prisma.clientFile.delete).not.toHaveBeenCalled();
    expect(mocks.logAgreementActivity).not.toHaveBeenCalled();
    expect(summary.items[0]).toMatchObject({ result: 'failed', error: 'Failed to trash file: 403' });
  });
});

describe('uploadAutoDeleteMessages', () => {
  const item = { fileId: 'f', fileName: 'Final.png', clientName: 'Ada Lovelace', eventDateKey: '2026-10-10' };

  it('sends nothing when there is nothing to do', () => {
    expect(uploadAutoDeleteMessages({ dryRun: true, items: [] })).toEqual([]);
    expect(uploadAutoDeleteMessages({ dryRun: false, items: [] })).toEqual([]);
  });

  it('sends a report-only summary in a dry run', () => {
    const [message] = uploadAutoDeleteMessages({ dryRun: true, items: [{ ...item, result: 'would trash' }] });
    expect(message).toContain('report only');
    expect(message).toContain('Ada Lovelace: Final.png (event 2026-10-10)');
  });

  it('sends a separate error alert for failures', () => {
    const messages = uploadAutoDeleteMessages({
      dryRun: false,
      items: [
        { ...item, result: 'trashed' },
        { ...item, fileId: 'g', result: 'failed', error: 'boom' },
      ],
    });
    expect(messages).toHaveLength(2);
    expect(messages[1]).toContain('error');
    expect(messages[1]).toContain('boom');
  });
});
