import { Prisma } from '@prisma/client';
import {
  BALANCE_DIGEST_LOOKAHEAD_DAYS,
  BALANCE_DIGEST_START_DATE_KEY,
  FULLY_PAID_STATUS,
  isListedInBalanceDigest,
} from '@/lib/balanceDigest';
import { addTorontoCalendarDaysFrom } from '@/lib/dates';
import { bookingStatusOf } from '@/lib/events/booking';
import { getEmailGreeting } from '@/lib/email/greeting';
import { prisma } from '@/lib/prisma';

const digestSelect = {
  id: true,
  status: true,
  archived: true,
  cancelledAt: true,
  paymentStatus: true,
  balanceDigestSnoozedUntil: true,
  balanceReminderSentAt: true,
  stripePaymentLink: true,
  eventDate: true,
  eventPackage: true,
  packagePrice: true,
  client: {
    select: {
      firstName: true,
      lastName: true,
      email: true,
      emailGreetingName: true,
    },
  },
} satisfies Prisma.EventSelect;

type DigestRecord = Prisma.EventGetPayload<{ select: typeof digestSelect }>;

export type BalanceDigestRow = {
  id: string;
  clientName: string;
  greetingName: string;
  clientEmail: string;
  eventDate: Date;
  packageName: string | null;
  packagePrice: number | null;
  paymentStatus: string | null;
  balanceReminderSentAt: Date | null;
  stripePaymentLink: string | null;
};

function amountOf(value: Prisma.Decimal | null | undefined): number | null {
  if (value == null) return null;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : null;
}

/** One row per event; `id` is the event id. */
function toRow(record: DigestRecord): BalanceDigestRow | null {
  if (!record.eventDate) return null;
  return {
    id: record.id,
    clientName: `${record.client.firstName} ${record.client.lastName}`.trim(),
    greetingName: getEmailGreeting(record.client),
    clientEmail: record.client.email,
    eventDate: record.eventDate,
    packageName: record.eventPackage?.trim() || null,
    packagePrice: amountOf(record.packagePrice),
    paymentStatus: record.paymentStatus,
    balanceReminderSentAt: record.balanceReminderSentAt,
    stripePaymentLink: record.stripePaymentLink,
  };
}

/**
 * Upcoming events in the next 10 days and completed events that still owe a balance, dated on or
 * after the events go-live (BALANCE_DIGEST_START_DATE_KEY) with a price above $0.
 */
export async function findBalanceDigestAgreements(now = new Date()): Promise<BalanceDigestRow[]> {
  const windowStart = addTorontoCalendarDaysFrom(now, -1);
  const windowEnd = addTorontoCalendarDaysFrom(now, BALANCE_DIGEST_LOOKAHEAD_DAYS + 2);

  // Coarse filter only: exact day boundaries and other spellings of fully paid are
  // settled by isListedInBalanceDigest, which uses isFullyPaid() and Toronto calendar days.
  // A day early in UTC so no go-live-day event is dropped before the exact Toronto check.
  const startFloor = new Date(`${BALANCE_DIGEST_START_DATE_KEY}T00:00:00.000Z`);
  startFloor.setUTCDate(startFloor.getUTCDate() - 1);
  const records = await prisma.event.findMany({
    where: {
      archived: false,
      cancelledAt: null,
      paymentStatus: { not: FULLY_PAID_STATUS },
      packagePrice: { gt: 0 },
      eventDate: { gte: startFloor },
      OR: [
        { status: 'UPCOMING', eventDate: { gte: windowStart, lt: windowEnd } },
        { status: 'COMPLETED', eventDate: { lt: windowEnd } },
      ],
    },
    select: digestSelect,
  });

  return records
    .filter((record) =>
      isListedInBalanceDigest(
        { ...record, status: bookingStatusOf(record.status), event: { eventDate: record.eventDate }, client: null },
        now,
      ),
    )
    .map(toRow)
    .filter((row): row is BalanceDigestRow => row !== null)
    .sort((a, b) => {
      const byDate = a.eventDate.getTime() - b.eventDate.getTime();
      if (byDate !== 0) return byDate;
      return a.clientName.localeCompare(b.clientName);
    });
}
