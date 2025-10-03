import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const signAgreementSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  clientName: z.string().min(1, 'Client name is required'),
  clientEmail: z.string().email('Valid email is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = signAgreementSchema.parse(body);

    // Find the agreement by token
    const agreement = await prisma.agreement.findFirst({
      where: {
        uniqueToken: validatedData.token,
        expiresAt: {
          gte: new Date()
        }
      },
      include: {
        client: true
      }
    });

    if (!agreement) {
      return NextResponse.json({ 
        error: 'Agreement not found or has expired' 
      }, { status: 404 });
    }

    // Verify client information matches
    const clientName = `${agreement.client.firstName} ${agreement.client.lastName}`.toLowerCase();
    const providedName = validatedData.clientName.toLowerCase();
    const clientEmail = agreement.client.email.toLowerCase();
    const providedEmail = validatedData.clientEmail.toLowerCase();

    if (clientName !== providedName || clientEmail !== providedEmail) {
      return NextResponse.json({ 
        error: 'Client information does not match. Please verify your name and email.' 
      }, { status: 400 });
    }

    // Check if already signed
    if (agreement.status === 'SIGNED') {
      return NextResponse.json({ 
        error: 'This agreement has already been signed' 
      }, { status: 400 });
    }

    // Get client IP address
    const getClientIP = (request: NextRequest): string => {
      const forwarded = request.headers.get('x-forwarded-for');
      const realIP = request.headers.get('x-real-ip');
      const cfConnectingIP = request.headers.get('cf-connecting-ip');
      
      if (cfConnectingIP) return cfConnectingIP;
      if (realIP) return realIP;
      if (forwarded) return forwarded.split(',')[0].trim();
      
      return 'Unknown';
    };

    const clientIP = getClientIP(request);

    // Update agreement status to SIGNED
    const updatedAgreement = await prisma.agreement.update({
      where: { id: agreement.id },
      data: {
        status: 'SIGNED',
        signedAt: new Date(),
        signedFromIP: clientIP
      },
      include: {
        client: true,
        template: true
      }
    });

    return NextResponse.json({
      message: 'Agreement signed successfully',
      agreement: updatedAgreement
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 });
    }
    console.error('Error signing agreement:', error);
    return NextResponse.json({ 
      error: 'Failed to sign agreement' 
    }, { status: 500 });
  }
}
