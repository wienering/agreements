import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateSession } from '../../shared/auth';
import { generateAgreementPdf } from '@/lib/pdf/agreement';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate session
    const authResult = await authenticateSession(request);
    if (authResult.error) {
      return authResult.error;
    }

    const session = authResult.session;
    const sessionClient = session.client;
    const { id: agreementId } = await params;

    // Get agreement details - verify ownership
    const agreement = await prisma.agreement.findFirst({
      where: {
        id: agreementId,
        client: {
          email: sessionClient.email.toLowerCase(),
        }
      },
      include: {
        client: true,
        template: true,
        signatures: { orderBy: { signedAt: 'asc' } },
        event: true
      }
    });

    if (!agreement) {
      return NextResponse.json(
        { error: 'Agreement not found', code: 'AGREEMENT_NOT_FOUND' },
        { status: 404 }
      );
    }

    const pdfBuffer = await generateAgreementPdf(agreement, 'portal');

    // Return PDF as response
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="agreement-${agreement.client.firstName}-${agreement.client.lastName}-${agreement.id}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    );
  }
}
