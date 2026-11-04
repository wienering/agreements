import { describe, expect, it } from 'vitest';
import { planMoveToEvents, type MoveAgreement } from '@/lib/events/moveFromAgreements';

const TODAY = '2026-11-04';
const blankLegacy = {
  eventDate: null,
  eventType: null,
  eventLocation: null,
  eventStartTime: null,
  eventDuration: null,
  eventPackage: null,
  packagePrice: null,
};

function agreement(id: string, overrides: Partial<MoveAgreement> = {}, eventDate: string | null = '2026-12-05T17:00:00.000Z'): MoveAgreement {
  return {
    id,
    status: 'SIGNED',
    createdAt: new Date('2026-10-01T12:00:00Z'),
    eventId: 'evt_1',
    emailSendCount: 1,
    lastEmailedAt: new Date('2026-10-01T12:00:00Z'),
    firstViewedAt: null,
    cancelledAt: null,
    cancellationReason: null,
    paymentStatus: 'Not paid',
    stripePaymentLink: null,
    stripeReceiptLink: null,
    galleryLink: null,
    galleryLinks: null,
    galleryEmailSentAt: null,
    reviewRequestSentAt: null,
    nextAction: null,
    backdropLinkId: null,
    selectedBackdropName: null,
    showPhoneNumberAlways: false,
    forceVirtualGreenScreen: false,
    balanceDigestSnoozedUntil: null,
    balanceReminderSentAt: null,
    followUpsPaused: false,
    reviewReceived: false,
    galleryHeldAlertAt: null,
    notesLastViewedAt: null,
    client: { id: 'c1', firstName: 'John', lastName: 'Doe', ...blankLegacy },
    event: {
      id: overrides.eventId ?? 'evt_1',
      archived: false,
      movedAlready: false,
      ...blankLegacy,
      eventDate: eventDate ? new Date(eventDate) : null,
    },
    ...overrides,
  };
}

describe('planMoveToEvents', () => {
  it('leaves past bookings alone and keeps today and undated ones', () => {
    const plans = planMoveToEvents(
      [
        agreement('past', { eventId: 'evt_past' }, '2026-10-20T17:00:00.000Z'),
        agreement('today', { eventId: 'evt_today' }, '2026-11-04T23:00:00.000Z'),
        agreement('undated', { eventId: 'evt_undated' }, null),
      ],
      TODAY,
    );
    expect(plans.map((p) => p.primaryAgreementId).sort()).toEqual(['today', 'undated']);
  });

  it('copies booking data from the signed agreement and archives an unsent draft on the same event', () => {
    const [plan] = planMoveToEvents(
      [
        agreement('draft', {
          status: 'DRAFT',
          emailSendCount: 0,
          lastEmailedAt: null,
          createdAt: new Date('2026-10-20T12:00:00Z'),
          backdropLinkId: 'bd_1',
        }),
        agreement('signed', { paymentStatus: 'Deposit paid' }),
      ],
      TODAY,
    );
    expect(plan.primaryAgreementId).toBe('signed');
    expect(plan.booking.paymentStatus).toBe('Deposit paid');
    // Blank on the primary, filled from the draft so nothing is lost
    expect(plan.booking.backdropLinkId).toBe('bd_1');
    expect(plan.archiveAgreementIds).toEqual(['draft']);
    expect(plan.status).toBe('UPCOMING');
  });

  it('keeps sent and signed agreements linked (never archived)', () => {
    const [plan] = planMoveToEvents([agreement('sent', { status: 'SENT' })], TODAY);
    expect(plan.archiveAgreementIds).toEqual([]);
    expect(plan.agreementIds).toEqual(['sent']);
  });

  it('builds a new event from the client fields when there is no Event record', () => {
    const [plan] = planMoveToEvents(
      [
        agreement('legacy', {
          eventId: null,
          event: null,
          status: 'DRAFT',
          emailSendCount: 0,
          lastEmailedAt: null,
          client: {
            id: 'c9',
            firstName: 'Ana',
            lastName: 'Lee',
            ...blankLegacy,
            eventDate: new Date('2026-12-24T17:00:00Z'),
            eventLocation: 'Casa Loma',
          },
        }),
      ],
      TODAY,
    );
    expect(plan.eventId).toBeNull();
    expect(plan.newEvent).toMatchObject({ clientId: 'c9', eventLocation: 'Casa Loma' });
    expect(plan.archiveAgreementIds).toEqual(['legacy']);
  });

  it('maps statuses: all cancelled → CANCELLED, any completed → COMPLETED', () => {
    const [cancelled] = planMoveToEvents(
      [agreement('c', { status: 'CANCELLED', cancelledAt: new Date('2026-11-01'), cancellationReason: 'Venue closed' })],
      TODAY,
    );
    expect(cancelled.status).toBe('CANCELLED');
    expect(cancelled.cancellationReason).toBe('Venue closed');
    const [completed] = planMoveToEvents([agreement('d', { status: 'COMPLETED' })], TODAY);
    expect(completed.status).toBe('COMPLETED');
  });

  it('turns the deprecated single gallery link into the list form', () => {
    const [plan] = planMoveToEvents([agreement('g', { galleryLink: 'https://g.example/1' })], TODAY);
    expect(plan.booking.galleryLinks).toEqual([{ title: 'Photo Gallery', url: 'https://g.example/1' }]);
  });

  it('reports disagreements between agreements on one event', () => {
    const [plan] = planMoveToEvents(
      [agreement('a', { paymentStatus: 'Fully paid' }), agreement('b', { status: 'SENT', paymentStatus: 'Deposit paid' })],
      TODAY,
    );
    expect(plan.booking.paymentStatus).toBe('Fully paid');
    expect(plan.conflicts).toHaveLength(1);
  });
});
