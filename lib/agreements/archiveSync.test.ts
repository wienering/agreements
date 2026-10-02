import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  agreement: { update: vi.fn(), count: vi.fn() },
  event: { updateMany: vi.fn() },
}));

vi.mock('@/lib/prisma', () => ({ prisma: prismaMock }));

import { setAgreementArchived, syncEventArchive } from '@/lib/agreements/archiveSync';

const NOW = new Date('2026-10-02T16:00:00.000Z');

describe('setAgreementArchived', () => {
  beforeEach(() => {
    prismaMock.agreement.update.mockReset();
    prismaMock.agreement.count.mockReset();
    prismaMock.event.updateMany.mockReset();
  });

  it('archives the Event once every agreement on it is archived', async () => {
    prismaMock.agreement.update.mockResolvedValue({ id: 'agr_1', eventId: 'evt_1' });
    prismaMock.agreement.count.mockResolvedValue(0);

    await setAgreementArchived('agr_1', true, NOW);

    expect(prismaMock.agreement.update).toHaveBeenCalledWith({
      where: { id: 'agr_1' },
      data: { archived: true, archivedAt: NOW },
    });
    expect(prismaMock.agreement.count).toHaveBeenCalledWith({ where: { eventId: 'evt_1', archived: false } });
    expect(prismaMock.event.updateMany).toHaveBeenCalledWith({
      where: { id: 'evt_1', archived: false },
      data: { archived: true, archivedAt: NOW },
    });
  });

  it('leaves the Event alone while another agreement on it is still active', async () => {
    prismaMock.agreement.update.mockResolvedValue({ id: 'agr_1', eventId: 'evt_1' });
    prismaMock.agreement.count.mockResolvedValue(1);

    await setAgreementArchived('agr_1', true, NOW);

    expect(prismaMock.event.updateMany).not.toHaveBeenCalled();
  });

  it('unarchives the Event when any agreement is unarchived', async () => {
    prismaMock.agreement.update.mockResolvedValue({ id: 'agr_1', eventId: 'evt_1' });

    await setAgreementArchived('agr_1', false, NOW);

    expect(prismaMock.agreement.update).toHaveBeenCalledWith({
      where: { id: 'agr_1' },
      data: { archived: false, archivedAt: null },
    });
    expect(prismaMock.agreement.count).not.toHaveBeenCalled();
    expect(prismaMock.event.updateMany).toHaveBeenCalledWith({
      where: { id: 'evt_1', archived: true },
      data: { archived: false, archivedAt: null },
    });
  });

  it('does nothing to Events for an agreement without one', async () => {
    await syncEventArchive(null, true, NOW);
    await syncEventArchive(null, false, NOW);
    expect(prismaMock.agreement.count).not.toHaveBeenCalled();
    expect(prismaMock.event.updateMany).not.toHaveBeenCalled();
  });
});
