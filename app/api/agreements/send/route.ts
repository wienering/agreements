import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { z } from 'zod';
import { handleApiError } from '@/lib/handleApiError';
import { sendAgreementEmail } from '@/lib/agreements/sendAgreementEmail';
import { appUrl } from '@/lib/appUrl';
const sendAgreementSchema = z.object({
  agreementId: z.string().min(1, 'Agreement ID is required'),
});

export async function POST(request: NextRequest) {
  try {

    await requireAdmin(request);
    const body = await request.json();
    const validatedData = sendAgreementSchema.parse(body);

    const baseUrl = appUrl();
    const result = await sendAgreementEmail(validatedData.agreementId, baseUrl);
    return NextResponse.json(result.body, { status: result.httpStatus });
  } catch (error) {
    return handleApiError(error, 'agreements/send', request.method);
  }
}
