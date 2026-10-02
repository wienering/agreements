import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  prisma: { agreement: { findMany: vi.fn(), updateMany: vi.fn() } },
  logAgreementActivity: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({ prisma: mocks.prisma }));
vi.mock('@/lib/activityLog', () => ({ logAgreementActivity: mocks.logAgreementActivity }));

import { autoCompleteDryRun, isDueForAutoComplete, runAutoComplete, type AutoCompleteCandidate } from '@/lib/autoComplete';

// 2026-10-02, 10am Toronto.
const NOW = new Date('2026-10-02T14:00:00.000Z');

function agreement(overrides: Partial<AutoCompleteCandidate> & { id?: string } = {}) {
  return {
    id: 'agr_1',
    status: 'SIGNED',
    cancelledAt: null,
    event: { eventDate: new Date('2026-10-01T22:00:00.000Z') },
    client: { firstName: 'Ada', lastName: 'Lovelace', eventDate: null },
    ...overrides,
  };
}

describe('isDueForAutoComplete', () => {
  it('is due the Toronto day after the event', () => {
    expect(isDueForAutoComplete(agreement(), NOW)).toBe(true);
    // 11:30pm Toronto on Oct 1 is still the day before.
    expect(isDueForAutoComplete(agreement({ event: { eventDate: new Date('2026-10-02T03:30:00.000Z') } }), NOW)).toBe(true);
  });

  it('is not due on the event day or before', () => {
    expect(isDueForAutoComplete(agreement({ event: { eventDate: new Date('2026-10-02T04:30:00.000Z') } }), NOW)).toBe(false);
    expect(isDueForAutoComplete(agreement({ event: { eventDate: new Date('2026-10-05T16:00:00.000Z') } }), NOW)).toBe(false);
  });

  it('never touches anything but SIGNED', () => {
    for (const status of ['DRAFT', 'SENT', 'LIVE', 'COMPLETED', 'CANCELLED', 'VOID']) {
      expect(isDueForAutoComplete(agreement({ status }), NOW)).toBe(false);
    }
  });

  it('skips cancelled agreements and agreements without an event date', () => {
    expect(isDueForAutoComplete(agreement({ cancelledAt: new Date('2026-09-01T00:00:00.000Z') }), NOW)).toBe(false);
    expect(isDueForAutoComplete(agreement({ event: { eventDate: null }, client: { eventDate: null } }), NOW)).toBe(false);
  });

  it('falls back to the client event date', () => {
    expect(
      isDueForAutoComplete(agreement({ event: null, client: { eventDate: new Date('2026-09-20T16:00:00.000Z') } }), NOW),
    ).toBe(true);
  });
});

describe('runAutoComplete', () => {
  beforeEach(() => {
    mocks.prisma.agreement.findMany.mockReset();
    mocks.prisma.agreement.updateMany.mockReset();
    mocks.logAgreementActivity.mockReset();
  });

  it('moves due agreements to COMPLETED, only if still SIGNED, and logs it', async () => {
    mocks.prisma.agreement.findMany.mockResolvedValue([
      agreement(),
      agreement({ id: 'agr_today', event: { eventDate: new Date('2026-10-02T20:00:00.000Z') } }),
    ]);
    mocks.prisma.agreement.updateMany.mockResolvedValue({ count: 1 });

    const summary = await runAutoComplete({ now: NOW, dryRun: false });

    expect(mocks.prisma.agreement.updateMany).toHaveBeenCalledTimes(1);
    expect(mocks.prisma.agreement.updateMany).toHaveBeenCalledWith({
      where: { id: 'agr_1', status: 'SIGNED' },
      data: { status: 'COMPLETED' },
    });
    expect(mocks.logAgreementActivity).toHaveBeenCalledWith('agr_1', 'AUTO_COMPLETED', { eventDate: '2026-10-01' });
    expect(summary.completed).toEqual([
      { agreementId: 'agr_1', clientName: 'Ada Lovelace', eventDateKey: '2026-10-01', result: 'completed' },
    ]);
  });

  it('only reads SIGNED, uncancelled agreements', async () => {
    mocks.prisma.agreement.findMany.mockResolvedValue([]);
    await runAutoComplete({ now: NOW, dryRun: false });
    const where = mocks.prisma.agreement.findMany.mock.calls[0][0].where;
    expect(where.status).toBe('SIGNED');
    expect(where.cancelledAt).toBeNull();
  });

  it('writes nothing in a dry run', async () => {
    mocks.prisma.agreement.findMany.mockResolvedValue([agreement()]);

    const summary = await runAutoComplete({ now: NOW, dryRun: true });

    expect(mocks.prisma.agreement.updateMany).not.toHaveBeenCalled();
    expect(mocks.logAgreementActivity).not.toHaveBeenCalled();
    expect(summary.completed[0].result).toBe('would complete');
  });

  it('does not log when the status changed since it was read', async () => {
    mocks.prisma.agreement.findMany.mockResolvedValue([agreement()]);
    mocks.prisma.agreement.updateMany.mockResolvedValue({ count: 0 });

    const summary = await runAutoComplete({ now: NOW, dryRun: false });

    expect(mocks.logAgreementActivity).not.toHaveBeenCalled();
    expect(summary.completed[0].result).toBe('skipped: status changed');
  });

  it('only changes statuses on the production deployment', () => {
    expect(autoCompleteDryRun('production')).toBe(false);
    expect(autoCompleteDryRun('preview')).toBe(true);
    expect(autoCompleteDryRun(undefined)).toBe(true);
  });
});
