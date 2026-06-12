import { NextRequest, NextResponse } from 'next/server';
import { findWritableBackdropMatchCandidate } from '@/lib/backdropMatchCandidates';
import {
  renderBackdropMatchConfirmPage,
  renderBackdropMatchErrorPage,
  renderBackdropMatchSuccessPage,
} from '@/lib/backdropMatchHtml';
import { verifyBackdropMatchConfirmToken } from '@/lib/backdropMatchToken';
import { formatEventDateToronto, formatEventDateTorontoInput } from '@/lib/dates';
import { persistBackdropSelection } from '@/lib/backdropSelectionPersistence';
import { sendTelegramMessage } from '@/lib/telegram';

function htmlResponse(html: string, status = 200): NextResponse {
  return new NextResponse(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function formatSubmittedEventLabel(submittedEventDate: string): string {
  if (!submittedEventDate) {
    return '—';
  }
  const formatted = formatEventDateTorontoInput(submittedEventDate);
  return formatted === '—' ? submittedEventDate : formatted;
}

function formatAgreementEventLabel(eventDate: Date | null): string {
  if (!eventDate) {
    return '—';
  }
  return formatEventDateToronto(eventDate);
}

async function extractToken(request: NextRequest): Promise<string | null> {
  if (request.method === 'GET') {
    return request.nextUrl.searchParams.get('token');
  }

  const contentType = request.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      const body = await request.json();
      if (typeof body?.token === 'string' && body.token.length > 0) {
        return body.token;
      }
    } catch {
      return null;
    }
    return null;
  }

  try {
    const formData = await request.formData();
    const token = formData.get('token');
    return typeof token === 'string' && token.length > 0 ? token : null;
  } catch {
    return null;
  }
}

async function resolveConfirmContext(token: string | null) {
  if (!token) {
    return { ok: false as const };
  }

  const payload = verifyBackdropMatchConfirmToken(token);
  if (!payload) {
    return { ok: false as const };
  }

  const candidate = await findWritableBackdropMatchCandidate(payload.agreementId);
  if (!candidate) {
    return { ok: false as const };
  }

  return {
    ok: true as const,
    payload,
    candidate,
    submittedEventLabel: formatSubmittedEventLabel(payload.submittedEventDate),
    agreementEventLabel: formatAgreementEventLabel(candidate.eventDate),
  };
}

export async function GET(request: NextRequest) {
  const token = await extractToken(request);
  const context = await resolveConfirmContext(token);

  if (!context.ok) {
    return htmlResponse(renderBackdropMatchErrorPage(), 400);
  }

  return htmlResponse(
    renderBackdropMatchConfirmPage({
      token: token!,
      clientName: context.candidate.clientName,
      backdropName: context.payload.backdropName,
      submittedEventLabel: context.submittedEventLabel,
      agreementEventLabel: context.agreementEventLabel,
    }),
  );
}

export async function POST(request: NextRequest) {
  const token = await extractToken(request);
  const context = await resolveConfirmContext(token);

  if (!context.ok) {
    return htmlResponse(renderBackdropMatchErrorPage(), 400);
  }

  const { payload, candidate } = context;
  const alreadyAttached = candidate.selectedBackdropName === payload.backdropName;

  if (!alreadyAttached) {
    const result = await persistBackdropSelection(
      [payload.agreementId],
      payload.backdropName,
      'proposed-match',
    );

    if (result.rateLimited) {
      console.warn('[confirm-backdrop-match] rate limited', {
        agreementId: payload.agreementId,
      });
      return htmlResponse(renderBackdropMatchErrorPage(), 429);
    }

    await sendTelegramMessage(
      `Backdrop confirmed: ${payload.backdropName} attached to ${candidate.clientName}'s agreement`,
    );
  }

  return htmlResponse(renderBackdropMatchSuccessPage(candidate.clientName));
}
