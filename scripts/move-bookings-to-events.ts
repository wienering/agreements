/**
 * 2026-11 events migration: copies booking data from today-forward agreements onto their events
 * (see lib/events/moveFromAgreements.ts for the rules). Past bookings are not touched.
 *
 * Needs the 20261104150000_event_booking_fields migration applied first.
 * Safe to re-run: an event that already went through the move is not copied again.
 *
 * Report only (default, read-only):
 *   npx tsx scripts/move-bookings-to-events.ts
 * Apply:
 *   npx tsx scripts/move-bookings-to-events.ts --apply
 *
 * Use the direct (non-pooler) database connection, as described in docs/DATABASE.md.
 */
import { Prisma, PrismaClient } from '@prisma/client';
import { torontoTodayKey } from '../lib/dates';
import { planMoveToEvents, type MoveAgreement, type MovePlan } from '../lib/events/moveFromAgreements';

const prisma = new PrismaClient();
const apply = process.argv.includes('--apply');

const legacySelect = {
  eventDate: true,
  eventType: true,
  eventLocation: true,
  eventStartTime: true,
  eventDuration: true,
  eventPackage: true,
  packagePrice: true,
} as const;

async function loadAgreements(): Promise<{ agreements: MoveAgreement[]; leadByAgreement: Map<string, string> }> {
  const rows = await prisma.agreement.findMany({
    where: { archived: false },
    select: {
      id: true,
      status: true,
      createdAt: true,
      eventId: true,
      leadId: true,
      emailSendCount: true,
      lastEmailedAt: true,
      firstViewedAt: true,
      cancelledAt: true,
      cancellationReason: true,
      paymentStatus: true,
      stripePaymentLink: true,
      stripeReceiptLink: true,
      galleryLink: true,
      galleryLinks: true,
      galleryEmailSentAt: true,
      reviewRequestSentAt: true,
      nextAction: true,
      backdropLinkId: true,
      selectedBackdropName: true,
      showPhoneNumberAlways: true,
      forceVirtualGreenScreen: true,
      balanceDigestSnoozedUntil: true,
      balanceReminderSentAt: true,
      followUpsPaused: true,
      reviewReceived: true,
      galleryHeldAlertAt: true,
      notesLastViewedAt: true,
      client: { select: { id: true, firstName: true, lastName: true, ...legacySelect } },
      event: {
        select: {
          id: true,
          archived: true,
          ...legacySelect,
          activities: { where: { type: 'MOVED_FROM_AGREEMENT' }, select: { id: true }, take: 1 },
        },
      },
    },
  });

  const leadByAgreement = new Map<string, string>();
  const agreements = rows.map(({ leadId, event, ...row }) => {
    if (leadId) leadByAgreement.set(row.id, leadId);
    return {
      ...row,
      event: event
        ? { ...event, movedAlready: event.activities.length > 0, activities: undefined }
        : null,
    } as unknown as MoveAgreement;
  });
  return { agreements, leadByAgreement };
}

function describe(plan: MovePlan): string {
  const lines = [
    `${plan.dateKey ?? '(no date)'}  ${plan.clientName}  ${plan.eventId ? `event ${plan.eventId}` : 'NEW EVENT from client fields'}`,
    `    agreements: ${plan.agreementIds.join(', ')} (primary ${plan.primaryAgreementId})`,
  ];
  if (plan.alreadyMoved) {
    lines.push('    already moved, skipped');
    return lines.join('\n');
  }
  lines.push(
    `    status ${plan.status}, payment "${plan.booking.paymentStatus}"` +
      `${plan.booking.backdropLinkId ? `, attendant link ${plan.booking.backdropLinkId}` : ''}` +
      `${plan.booking.galleryLinks ? ', gallery links' : ''}`,
  );
  if (plan.archiveAgreementIds.length) lines.push(`    archive unsent draft(s): ${plan.archiveAgreementIds.join(', ')}`);
  if (plan.unarchiveEvent) lines.push('    event was archived, will be unarchived');
  for (const conflict of plan.conflicts) lines.push(`    CHECK ${conflict}`);
  return lines.join('\n');
}

async function applyPlan(plan: MovePlan, leadByAgreement: Map<string, string>, now: Date) {
  await prisma.$transaction(async (tx) => {
    let eventId = plan.eventId;
    if (!eventId) {
      const legacy = plan.newEvent!;
      const created = await tx.event.create({
        data: {
          clientId: legacy.clientId,
          eventDate: legacy.eventDate,
          eventType: legacy.eventType,
          eventLocation: legacy.eventLocation,
          eventStartTime: legacy.eventStartTime,
          eventDuration: legacy.eventDuration,
          eventPackage: legacy.eventPackage,
          packagePrice: legacy.packagePrice as Prisma.Decimal | null,
        },
        select: { id: true },
      });
      eventId = created.id;
    }

    if (!plan.alreadyMoved) {
      const { galleryLinks, ...rest } = plan.booking;
      await tx.event.update({
        where: { id: eventId },
        data: {
          ...(rest as unknown as Prisma.EventUncheckedUpdateInput),
          galleryLinks: galleryLinks ? (galleryLinks as Prisma.InputJsonValue) : Prisma.DbNull,
          status: plan.status,
          completedAt: plan.status === 'COMPLETED' ? now : null,
          cancelledAt: plan.status === 'CANCELLED' ? plan.cancelledAt ?? now : null,
          cancellationReason: plan.status === 'CANCELLED' ? plan.cancellationReason : null,
          ...(plan.unarchiveEvent ? { archived: false, archivedAt: null } : {}),
        },
      });
      await tx.eventActivity.create({
        data: {
          eventId,
          type: 'MOVED_FROM_AGREEMENT',
          meta: { agreementId: plan.primaryAgreementId, agreementIds: plan.agreementIds },
        },
      });
    }

    await tx.agreement.updateMany({ where: { id: { in: plan.agreementIds }, eventId: null }, data: { eventId } });
    await tx.clientNote.updateMany({
      where: { agreementId: { in: plan.agreementIds }, eventId: null },
      data: { eventId },
    });
    const leadIds = plan.agreementIds.map((id) => leadByAgreement.get(id)).filter((id): id is string => Boolean(id));
    if (leadIds.length) {
      await tx.lead.updateMany({ where: { id: { in: leadIds }, eventId: null }, data: { eventId } });
    }
    if (plan.archiveAgreementIds.length) {
      // Direct update on purpose: archiving these drafts must not archive the event.
      await tx.agreement.updateMany({
        where: { id: { in: plan.archiveAgreementIds }, archived: false },
        data: { archived: true, archivedAt: now },
      });
    }
  });
}

async function main() {
  const now = new Date();
  const { agreements, leadByAgreement } = await loadAgreements();
  const plans = planMoveToEvents(agreements, torontoTodayKey()).sort((a, b) =>
    (a.dateKey ?? '9999').localeCompare(b.dateKey ?? '9999'),
  );

  console.log(apply ? 'APPLYING\n' : 'REPORT ONLY (nothing is changed). Re-run with --apply to make these changes.\n');
  for (const plan of plans) console.log(describe(plan));

  const newEvents = plans.filter((p) => !p.eventId).length;
  const drafts = plans.reduce((n, p) => n + p.archiveAgreementIds.length, 0);
  const conflicts = plans.filter((p) => p.conflicts.length).length;
  console.log(
    `\n${plans.length} events (${newEvents} new), ${drafts} unsent draft(s) to archive, ${conflicts} with values to check. ` +
      `${agreements.length - plans.reduce((n, p) => n + p.agreementIds.length, 0)} past agreement(s) left as they are.`,
  );

  if (!apply) return;
  for (const plan of plans) {
    await applyPlan(plan, leadByAgreement, now);
  }
  console.log('Done.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
