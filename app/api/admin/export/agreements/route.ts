import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/handleApiError';
import {
  agreementsExportFilename,
  buildAgreementsCsv,
  selectAgreementsForExport,
  type AgreementExportSource,
} from '@/lib/agreements/exportCsv';
import { parseTorontoCalendarDateKey } from '@/lib/dates';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/requireAdmin';

const agreementExportSelect = {
  status: true,
  paymentStatus: true,
  signedAt: true,
  createdAt: true,
  client: {
    select: {
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      eventDate: true,
      eventType: true,
      eventLocation: true,
      eventPackage: true,
      packagePrice: true,
    },
  },
  event: {
    select: {
      eventDate: true,
      eventType: true,
      eventLocation: true,
      eventPackage: true,
      packagePrice: true,
    },
  },
  backdropLink: {
    select: {
      name: true,
      attendant: { select: { name: true } },
    },
  },
} as const;

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request);

    const fromKey = request.nextUrl.searchParams.get('from')?.trim() ?? '';
    const toKey = request.nextUrl.searchParams.get('to')?.trim() ?? '';
    const includeArchived = request.nextUrl.searchParams.get('includeArchived') === 'true';

    if (!parseTorontoCalendarDateKey(fromKey) || !parseTorontoCalendarDateKey(toKey)) {
      return NextResponse.json(
        { error: 'from and to must be YYYY-MM-DD dates' },
        { status: 400 },
      );
    }

    if (fromKey > toKey) {
      return NextResponse.json(
        { error: 'from must be on or before to' },
        { status: 400 },
      );
    }

    // One row per booked event (payment and attendant from the event), plus older agreements
    // that have no event. An event's agreement status is its signed or newest agreement's.
    const [events, legacyAgreements] = await Promise.all([
      prisma.event.findMany({
        where: includeArchived ? {} : { archived: false },
        select: {
          status: true,
          paymentStatus: true,
          createdAt: true,
          eventDate: true,
          eventType: true,
          eventLocation: true,
          eventPackage: true,
          packagePrice: true,
          client: { select: { firstName: true, lastName: true, email: true, phone: true } },
          backdropLink: { select: { name: true, attendant: { select: { name: true } } } },
          agreements: {
            where: includeArchived ? {} : { archived: false },
            orderBy: { createdAt: 'desc' },
            select: { status: true, signedAt: true },
          },
        },
      }),
      prisma.agreement.findMany({
        where: includeArchived ? { eventId: null } : { archived: false, eventId: null },
        select: agreementExportSelect,
      }),
    ]);

    const eventRows: AgreementExportSource[] = events.map((event) => {
      const agreement = event.agreements.find((a) => a.signedAt) ?? event.agreements[0] ?? null;
      const eventStatus = event.status === 'CANCELLED' ? 'Event cancelled' : null;
      return {
        status: eventStatus ?? agreement?.status ?? 'No agreement',
        paymentStatus: event.paymentStatus,
        signedAt: agreement?.signedAt ?? null,
        createdAt: event.createdAt,
        client: {
          ...event.client,
          eventDate: null,
          eventType: null,
          eventLocation: null,
          eventPackage: null,
          packagePrice: null,
        },
        event: {
          eventDate: event.eventDate,
          eventType: event.eventType,
          eventLocation: event.eventLocation,
          eventPackage: event.eventPackage,
          packagePrice: event.packagePrice,
        },
        backdropLink: event.backdropLink,
      };
    });

    const rows = selectAgreementsForExport([...eventRows, ...legacyAgreements], fromKey, toKey);
    const csv = buildAgreementsCsv(rows);
    const filename = agreementsExportFilename(fromKey, toKey);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return handleApiError(error, 'admin/export/agreements', request.method);
  }
}
