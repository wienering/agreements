import { Prisma } from '@prisma/client';
import {
  BALANCE_DIGEST_LOOKAHEAD_DAYS,
  FULLY_PAID_STATUS,
  isIncludedInBalanceDigest,
} from '@/lib/balanceDigest';
import { addTorontoCalendarDaysFrom, resolveAgreementEventDate } from '@/lib/dates';
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
  client: {
    select: {
      firstName: true,
      lastName: true,
      email: true,
      emailGreetingName: true,
      eventDate: true,
      eventPackage: true,
      packagePrice: true,
    },
  },
  event: {
    select: {
      eventDate: true,
      eventPackage: true,
      packagePrice: true,
    },
  },
} satisfies Prisma.AgreementSelect;

type DigestRecord = Prisma.AgreementGetPayload<{ select: typeof digestSelect }>;

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

function toRow(record: DigestRecord): BalanceDigestRow | null {
  const eventDate = resolveAgreementEventDate(record);
  if (!eventDate) return null;

  const packageName =
    record.event?.eventPackage?.trim() || record.client.eventPackage?.trim() || null;
  const packagePrice = amountOf(record.event?.packagePrice) ?? amountOf(record.client.packagePrice);

  return {
    id: record.id,
    clientName: `${record.client.firstName} ${record.client.lastName}`.trim(),
    greetingName: getEmailGreeting(record.client),
    clientEmail: record.client.email,
    eventDate,
    packageName,
    packagePrice,
    paymentStatus: record.paymentStatus,
    balanceReminderSentAt: record.balanceReminderSentAt,
    stripePaymentLink: record.stripePaymentLink,
  };
}

export async function findBalanceDigestAgreements(now = new Date()): Promise<BalanceDigestRow[]> {
  const windowStart = addTorontoCalendarDaysFrom(now, -1);
  const windowEnd = addTorontoCalendarDaysFrom(now, BALANCE_DIGEST_LOOKAHEAD_DAYS + 2);

  const records = await prisma.agreement.findMany({
    where: {
      status: 'SIGNED',
      archived: false,
      cancelledAt: null,
      AND: [
        {
          // Coarse filter only: other spellings of fully paid get through here and are
          // dropped by isIncludedInBalanceDigest, which uses isFullyPaid().
          OR: [{ paymentStatus: null }, { paymentStatus: { not: FULLY_PAID_STATUS } }],
        },
        {
          OR: [
            { event: { eventDate: { gte: windowStart, lt: windowEnd } } },
            {
              AND: [
                { OR: [{ eventId: null }, { event: { is: { eventDate: null } } }] },
                { client: { eventDate: { gte: windowStart, lt: windowEnd } } },
              ],
            },
          ],
        },
      ],
    },
    select: digestSelect,
  });

  return records
    .filter((record) => isIncludedInBalanceDigest(record, now))
    .map(toRow)
    .filter((row): row is BalanceDigestRow => row !== null)
    .sort((a, b) => {
      const byDate = a.eventDate.getTime() - b.eventDate.getTime();
      if (byDate !== 0) return byDate;
      return a.clientName.localeCompare(b.clientName);
    });
}
