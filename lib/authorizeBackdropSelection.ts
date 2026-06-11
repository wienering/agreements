import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';

export type BackdropSelectionAuthVia = 'admin' | 'client';

export type BackdropSelectionAuthResult =
  | { ok: true; via: BackdropSelectionAuthVia }
  | { ok: false; response: NextResponse };

const BACKDROP_SECRET_HEADER = 'X-Backdrop-Secret';

export async function authorizeBackdropSelectionUpdate(
  request: NextRequest,
): Promise<BackdropSelectionAuthResult> {
  try {
    await requireAdmin(request);
    return { ok: true, via: 'admin' };
  } catch (error) {
    const authResponse = adminAuthResponse(error);
    if (!authResponse) {
      throw error;
    }
  }

  const configuredSecret = process.env.BACKDROP_FORM_SECRET;
  if (!configuredSecret) {
    console.error(
      'BACKDROP_FORM_SECRET is not configured; rejecting backdrop selection request',
    );
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Backdrop form authentication is not configured' },
        { status: 503 },
      ),
    };
  }

  const receivedSecret = request.headers.get(BACKDROP_SECRET_HEADER);
  if (!receivedSecret || receivedSecret !== configuredSecret) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: receivedSecret
            ? 'Invalid backdrop form secret'
            : 'Missing backdrop form secret',
        },
        { status: 401 },
      ),
    };
  }

  return { ok: true, via: 'client' };
}

/** Exported for tests/docs; header name the external backdrop tool must send. */
export const backdropFormSecretHeaderName = BACKDROP_SECRET_HEADER;
