import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { authorizeBackdropSelectionUpdate } from '@/lib/authorizeBackdropSelection';
import { isValidAttendantCuid } from '@/lib/attendantIdentity';
import { findBackdropMatchCandidates } from '@/lib/backdropMatchCandidates';
import { createBackdropMatchConfirmToken } from '@/lib/backdropMatchToken';
import { formatEventDateToronto, formatEventDateTorontoInput } from '@/lib/dates';
import { sendTelegramMessage } from '@/lib/telegram';

const proposeBackdropMatchSchema = z.object({
  clientEmail: z.string().email('Invalid email address'),
  clientName: z.string().min(1).max(200).optional(),
  attendantId: z
    .string()
    .min(1)
    .max(64)
    .refine((value) => isValidAttendantCuid(value), {
      message: 'Invalid attendant ID',
    }),
  eventDate: z.string().min(1).max(64).optional(),
  backdropName: z
    .string()
    .min(1, 'Backdrop name is required')
    .max(200)
    .transform((value) => value.trim()),
});

function getBaseUrl(request: NextRequest): string {
  const protocol = request.headers.get('x-forwarded-proto') || 'https';
  const host = request.headers.get('host') || 'localhost:3000';
  return process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`;
}

function formatOptionalEventDate(value: string | undefined): string {
  if (!value) {
    return '—';
  }
  const formatted = formatEventDateTorontoInput(value);
  return formatted === '—' ? value : formatted;
}

async function processBackdropMatchProposal(
  request: NextRequest,
  data: z.infer<typeof proposeBackdropMatchSchema>,
): Promise<void> {
  const candidates = await findBackdropMatchCandidates({
    clientEmail: data.clientEmail,
    attendantId: data.attendantId,
  });

  const submittedEventLabel = formatOptionalEventDate(data.eventDate);
  const clientLabel = data.clientName?.trim() || data.clientEmail;

  if (candidates.length === 1) {
    const candidate = candidates[0];
    const agreementEventLabel = candidate.eventDate
      ? formatEventDateToronto(candidate.eventDate)
      : '—';

    const token = createBackdropMatchConfirmToken(
      candidate.id,
      data.backdropName,
      data.eventDate ?? '',
    );
    if (!token) {
      console.error('[propose-backdrop-match] MATCH_CONFIRM_SECRET not configured');
      await sendTelegramMessage(
        [
          'Unlinked backdrop selection — no confident match',
          '',
          `Client: ${clientLabel}`,
          `Submitted event: ${submittedEventLabel}`,
          `Backdrop: ${data.backdropName}`,
          'Candidates: 1 (confirmation link unavailable)',
        ].join('\n'),
      );
      return;
    }

    const confirmUrl = `${getBaseUrl(request)}/api/agreements/confirm-backdrop-match?token=${encodeURIComponent(token)}`;
    await sendTelegramMessage(
      [
        'Backdrop match proposal',
        '',
        `Client: ${clientLabel}`,
        `Submitted event: ${submittedEventLabel}`,
        `Agreement event: ${agreementEventLabel}`,
        `Backdrop: ${data.backdropName}`,
        '',
        `Confirm: ${confirmUrl}`,
      ].join('\n'),
      { disableWebPagePreview: true },
    );
    return;
  }

  await sendTelegramMessage(
    [
      'Unlinked backdrop selection — no confident match',
      '',
      `Client: ${clientLabel}`,
      `Submitted event: ${submittedEventLabel}`,
      `Backdrop: ${data.backdropName}`,
      `Candidates: ${candidates.length}`,
    ].join('\n'),
  );
}

export async function POST(request: NextRequest) {
  const auth = await authorizeBackdropSelectionUpdate(request);
  if (!auth.ok) {
    return auth.response;
  }

  let validatedData: z.infer<typeof proposeBackdropMatchSchema>;
  try {
    const body = await request.json();
    validatedData = proposeBackdropMatchSchema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Validation failed',
          issues: error.issues.map((issue) => issue.path.join('.')),
        },
        { status: 400 },
      );
    }
    console.error('[propose-backdrop-match] invalid JSON body', error);
    return NextResponse.json({ ok: true }, { status: 200 });
  }

  try {
    await processBackdropMatchProposal(request, validatedData);
  } catch (error) {
    console.error('[propose-backdrop-match] proposal processing failed', error);
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
