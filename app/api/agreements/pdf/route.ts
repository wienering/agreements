import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { handleApiError } from '@/lib/handleApiError';
import { generateAgreementPdf } from '@/lib/pdf/agreement';

const pdfRequestSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = pdfRequestSchema.parse(body);

    // Find the agreement by token (allow both signed and unsigned)
    const agreement = await prisma.agreement.findFirst({
      where: {
        uniqueToken: validatedData.token,
        OR: [
          { status: 'SIGNED' },
          { expiresAt: null },
          { expiresAt: { gte: new Date() } }
        ]
      },
      include: {
        client: true,
        template: true,
        event: true,
        signatures: { orderBy: { signedAt: 'asc' } },
      }
    });

    if (!agreement) {
      return NextResponse.json({ 
        error: 'Agreement not found or has expired' 
      }, { status: 404 });
    }

    const pdfBuffer = await generateAgreementPdf(agreement, 'document');

    // Return PDF as response
    return new NextResponse(pdfBuffer as any, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="agreement-${agreement.client.firstName}-${agreement.client.lastName}-${agreement.id}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error) {
    return handleApiError(error, 'agreements/pdf');
  }
}
