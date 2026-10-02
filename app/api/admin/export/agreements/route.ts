import { NextRequest, NextResponse } from 'next/server';
import { handleApiError } from '@/lib/handleApiError';
import {
  agreementsExportFilename,
  buildAgreementsCsv,
  selectAgreementsForExport,
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

    const agreements = await prisma.agreement.findMany({
      where: includeArchived ? {} : { archived: false },
      select: agreementExportSelect,
    });

    const rows = selectAgreementsForExport(agreements, fromKey, toKey);
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
