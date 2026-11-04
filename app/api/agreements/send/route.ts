import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/requireAdmin';
import { z } from 'zod';
import { handleApiError } from '@/lib/handleApiError';
import { sendAgreementEmail } from '@/lib/agreements/sendAgreementEmail';
const sendAgreementSchema = z.object({
  agreementId: z.string().min(1, 'Agreement ID is required'),
});

export async function POST(request: NextRequest) {
  try {

    await requireAdmin(request);
    const body = await request.json();
    const validatedData = sendAgreementSchema.parse(body);

    const protocol = request.headers.get('x-forwarded-proto') || 'http';
    const host = request.headers.get('host') || 'localhost:3000';
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || `${protocol}://${host}`;
    const result = await sendAgreementEmail(validatedData.agreementId, baseUrl);
    return NextResponse.json(result.body, { status: result.httpStatus });
  } catch (error) {
    return handleApiError(error, 'agreements/send', request.method);
  }
}
