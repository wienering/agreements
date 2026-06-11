import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { handleApiError } from '@/lib/handleApiError';
import {
  authorizeBackdropSelectionUpdate,
  type BackdropSelectionAuthVia,
} from '@/lib/authorizeBackdropSelection';
import { logAgreementActivity } from '@/lib/activityLog';
import { torontoDateKey } from '@/lib/dates';

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_PER_AGREEMENT = 10;

const updateBackdropSelectionSchema = z
  .object({
    agreementId: z.string().min(1).max(64).optional(),
    clientEmail: z.string().email('Invalid email address').optional(),
    clientName: z.string().min(1).max(200).optional(),
    eventDate: z.string().min(1).max(64).optional(),
    backdropName: z
      .string()
      .max(200)
      .optional()
      .transform((value) => (value === undefined ? undefined : value.trim())),
  })
  .refine(
    (data) =>
      data.agreementId || (data.clientEmail && data.clientName && data.eventDate),
    {
      message:
        'Either agreementId must be provided, or clientEmail, clientName, and eventDate must all be provided',
      path: ['agreementId'],
    },
  );

type BackdropWriteVia = BackdropSelectionAuthVia | 'fallback';

async function isRateLimited(agreementId: string): Promise<boolean> {
  const since = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);
  const count = await prisma.agreementActivity.count({
    where: {
      agreementId,
      type: 'BACKDROP_SELECTED',
      createdAt: { gte: since },
    },
  });
  return count >= RATE_LIMIT_MAX_PER_AGREEMENT;
}

async function persistBackdropSelection(
  agreementIds: string[],
  backdropName: string | undefined,
  via: BackdropWriteVia,
): Promise<{ updatedCount: number; updatedAgreementIds: string[]; rateLimited: boolean }> {
  const normalizedName = backdropName ? backdropName : null;
  const updatedAgreementIds: string[] = [];

  for (const agreementId of agreementIds) {
    if (await isRateLimited(agreementId)) {
      return {
        updatedCount: updatedAgreementIds.length,
        updatedAgreementIds,
        rateLimited: true,
      };
    }

    await prisma.agreement.update({
      where: { id: agreementId },
      data: { selectedBackdropName: normalizedName },
    });

    await logAgreementActivity(agreementId, 'BACKDROP_SELECTED', {
      backdropName: normalizedName,
      via,
    });

    updatedAgreementIds.push(agreementId);
  }

  return {
    updatedCount: updatedAgreementIds.length,
    updatedAgreementIds,
    rateLimited: false,
  };
}

function writableAgreementWhere(agreementId: string) {
  return {
    id: agreementId,
    archived: false,
    status: { not: 'CANCELLED' as const },
  };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeBackdropSelectionUpdate(request);
    if (!auth.ok) {
      return auth.response;
    }

    const body = await request.json();
    const validatedData = updateBackdropSelectionSchema.parse(body);

    if (validatedData.agreementId) {
      const agreement = await prisma.agreement.findFirst({
        where: writableAgreementWhere(validatedData.agreementId),
        select: { id: true },
      });

      if (!agreement) {
        return NextResponse.json(
          {
            success: false,
            message: 'Agreement not found, archived, or cancelled',
            updatedCount: 0,
          },
          { status: 404 },
        );
      }

      const result = await persistBackdropSelection(
        [validatedData.agreementId],
        validatedData.backdropName,
        auth.via,
      );

      if (result.rateLimited) {
        return NextResponse.json(
          { error: 'Too many backdrop selection updates. Please try again shortly.' },
          { status: 429 },
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Updated agreement with backdrop selection',
        updatedCount: result.updatedCount,
        updatedAgreementIds: result.updatedAgreementIds,
      });
    }

    console.warn(
      '[update-backdrop-selection] Legacy fallback matcher used (no agreementId). ' +
        'Migrate caller to send agreementId.',
    );

    if (
      !validatedData.clientEmail ||
      !validatedData.clientName ||
      !validatedData.eventDate
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Either agreementId must be provided, or clientEmail, clientName, and eventDate must all be provided',
          updatedCount: 0,
        },
        { status: 400 },
      );
    }

    const submissionDateKey = torontoDateKey(validatedData.eventDate);

    const clients = await prisma.client.findMany({
      where: {
        email: {
          equals: validatedData.clientEmail,
          mode: 'insensitive',
        },
      },
      include: {
        agreements: {
          where: {
            archived: false,
            status: { not: 'CANCELLED' },
          },
          include: {
            event: true,
          },
        },
      },
    });

    if (clients.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No matching clients found',
        updatedCount: 0,
      });
    }

    let updatedCount = 0;
    const updatedAgreementIds: string[] = [];

    for (const client of clients) {
      const clientFullName = `${client.firstName} ${client.lastName}`.trim().toLowerCase();
      const submissionName = validatedData.clientName.trim().toLowerCase();

      const matchingAgreements = client.agreements.filter((agreement) => {
        if (agreement.event?.eventDate) {
          if (torontoDateKey(agreement.event.eventDate) === submissionDateKey) {
            return true;
          }
        }

        if (client.eventDate) {
          if (torontoDateKey(client.eventDate) === submissionDateKey) {
            return true;
          }
        }

        if (clientFullName === submissionName) {
          return true;
        }

        return false;
      });

      if (matchingAgreements.length === 0) {
        continue;
      }

      const result = await persistBackdropSelection(
        matchingAgreements.map((agreement) => agreement.id),
        validatedData.backdropName,
        'fallback',
      );

      updatedCount += result.updatedCount;
      updatedAgreementIds.push(...result.updatedAgreementIds);

      if (result.rateLimited) {
        return NextResponse.json(
          {
            error: 'Too many backdrop selection updates. Please try again shortly.',
            updatedCount,
            updatedAgreementIds,
          },
          { status: 429 },
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updatedCount} agreement(s) with backdrop selection`,
      updatedCount,
      updatedAgreementIds,
    });
  } catch (error) {
    return handleApiError(error, 'agreements/update-backdrop-selection');
  }
}
