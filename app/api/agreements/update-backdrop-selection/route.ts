import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { handleApiError } from '@/lib/handleApiError';
import {
  authorizeBackdropSelectionUpdate,
  type BackdropSelectionAuthVia,
} from '@/lib/authorizeBackdropSelection';
import { torontoDateKey } from '@/lib/dates';
import { verifyBackdropSelectionOwnership } from '@/lib/backdropSelectionOwnership';
import {
  persistBackdropSelection,
  writableAgreementWhere,
} from '@/lib/backdropSelectionPersistence';

const SECRET_PATH_FAILURE_BODY = { ok: false } as const;

const updateBackdropSelectionSchema = z
  .object({
    agreementId: z.string().min(1).max(64).optional(),
    attendantId: z.string().min(1).max(64).optional(),
    backdropId: z.string().min(1).max(64).optional(),
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

function secretPathRejection(reason: string, context?: Record<string, unknown>): NextResponse {
  console.warn('[update-backdrop-selection] secret-path rejection', {
    reason,
    ...context,
  });
  return NextResponse.json(SECRET_PATH_FAILURE_BODY, { status: 400 });
}

function secretPathSuccess(updatedCount: number): NextResponse {
  return NextResponse.json({ ok: true, updatedCount }, { status: 200 });
}

function parseBackdropSelectionBody(
  body: unknown,
  via: BackdropSelectionAuthVia,
): { ok: true; data: z.infer<typeof updateBackdropSelectionSchema> } | { ok: false; response: NextResponse } {
  try {
    return { ok: true, data: updateBackdropSelectionSchema.parse(body) };
  } catch (error) {
    if (via === 'client' && error instanceof z.ZodError) {
      return {
        ok: false,
        response: secretPathRejection('validation_error', {
          issues: error.issues.map((issue) => issue.path.join('.')),
        }),
      };
    }
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await authorizeBackdropSelectionUpdate(request);
    if (!auth.ok) {
      return auth.response;
    }

    const body = await request.json();
    const parsed = parseBackdropSelectionBody(body, auth.via);
    if (!parsed.ok) {
      return parsed.response;
    }
    const validatedData = parsed.data;

    if (auth.via === 'client') {
      if (!validatedData.agreementId) {
        return secretPathRejection('legacy_fallback_rejected');
      }

      if (!validatedData.attendantId) {
        return secretPathRejection('missing_attendant_id', {
          agreementId: validatedData.agreementId,
        });
      }

      if (!validatedData.clientEmail) {
        return secretPathRejection('missing_client_email', {
          agreementId: validatedData.agreementId,
        });
      }

      const ownership = await verifyBackdropSelectionOwnership({
        agreementId: validatedData.agreementId,
        attendantId: validatedData.attendantId,
        clientEmail: validatedData.clientEmail,
      });

      if (!ownership.ok) {
        return secretPathRejection(ownership.reason, {
          agreementId: validatedData.agreementId,
        });
      }

      const result = await persistBackdropSelection(
        [ownership.agreementId],
        validatedData.backdropName,
        auth.via,
      );

      if (result.rateLimited) {
        return secretPathRejection('rate_limited', {
          agreementId: ownership.agreementId,
        });
      }

      return secretPathSuccess(result.updatedCount);
    }

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
