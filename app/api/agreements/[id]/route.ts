import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { handleApiError, formatZodDetails } from '@/lib/handleApiError';
import { findAgreementListItem } from '@/lib/agreements/listItem';
import { AgreementPatchError, patchAgreement } from '@/lib/agreements/patch';
import { z } from 'zod';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const agreement = await findAgreementListItem(id);

    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    return NextResponse.json(agreement);
  } catch (error) {
    const authResponse = adminAuthResponse(error);
    if (authResponse) return authResponse;
    return handleApiError(error, 'agreements/[id]');
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin(request);
    const { id } = await params;
    const body = await request.json();
    const agreement = await patchAgreement(id, body);
    return NextResponse.json(agreement);
  } catch (error) {
    const authResponse = adminAuthResponse(error);
    if (authResponse) return authResponse;
    if (error instanceof AgreementPatchError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodDetails(error) },
        { status: 400 },
      );
    }
    return handleApiError(error, 'agreements/[id]');
  }
}
