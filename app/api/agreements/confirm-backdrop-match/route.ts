import { NextRequest, NextResponse } from 'next/server';
import { findWritableBackdropMatchCandidate } from '@/lib/backdropMatchCandidates';
import {
  renderBackdropMatchErrorPage,
  renderBackdropMatchSuccessPage,
} from '@/lib/backdropMatchHtml';
import { verifyBackdropMatchConfirmToken } from '@/lib/backdropMatchToken';
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

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return htmlResponse(renderBackdropMatchErrorPage(), 400);
  }

  const payload = verifyBackdropMatchConfirmToken(token);
  if (!payload) {
    return htmlResponse(renderBackdropMatchErrorPage(), 400);
  }

  const candidate = await findWritableBackdropMatchCandidate(payload.agreementId);
  if (!candidate) {
    return htmlResponse(renderBackdropMatchErrorPage(), 400);
  }

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

  return htmlResponse(renderBackdropMatchSuccessPage(candidate.clientName));
}
