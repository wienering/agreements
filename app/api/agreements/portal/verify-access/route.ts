import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { verificationCodeStore } from '../shared/verification-codes';

const verifyAccessSchema = z.object({
  email: z.string().email('Valid email is required'),
  code: z.string().length(6, 'Verification code must be 6 digits'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = verifyAccessSchema.parse(body);

    const email = validatedData.email.toLowerCase();
    const code = validatedData.code;

    // Check if verification code exists and is valid
    const storedCode = verificationCodeStore.get(email);
    
    if (!storedCode) {
      return NextResponse.json({ 
        error: 'No verification code found for this email. Please request a new code.' 
      }, { status: 400 });
    }

    if (storedCode.code !== code) {
      return NextResponse.json({ 
        error: 'Invalid verification code. Please check and try again.' 
      }, { status: 400 });
    }

    if (new Date() > storedCode.expiresAt) {
      verificationCodeStore.delete(email);
      return NextResponse.json({ 
        error: 'Verification code has expired. Please request a new code.' 
      }, { status: 400 });
    }

    // Code is valid - find the client (primary or secondary signer)
    let client = await prisma.client.findFirst({
      where: { email },
      include: {
        agreements: {
          include: {
            template: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    let isSecondarySigner = false;
    if (!client) {
      // Try to resolve via second signer email
      const agreementWithSecondary = await prisma.agreement.findFirst({
        where: {
          secondSignerEnabled: true,
          secondSignerEmail: email,
        },
        select: { clientId: true },
      });
      if (agreementWithSecondary) {
        client = await prisma.client.findUnique({
          where: { id: agreementWithSecondary.clientId },
          include: {
            agreements: {
              include: { template: true },
              orderBy: { createdAt: 'desc' },
            },
          },
        });
        if (client) {
          isSecondarySigner = true;
        }
      }
    }

    if (!client) {
      return NextResponse.json({ 
        error: 'Client not found' 
      }, { status: 404 });
    }

    // Generate session token
    const sessionToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 90 * 60 * 1000); // 90 minutes

    // Create client session — for secondary signers, the session is owned by the
    // primary client (so existing dashboard queries still work) and the actual
    // authenticated email is recorded in `secondaryEmail` for audit.
    await prisma.clientSession.create({
      data: {
        clientEmail: client.email,
        secondaryEmail: isSecondarySigner ? email : null,
        sessionToken,
        expiresAt,
        lastActivityAt: new Date(),
      }
    });

    // Clean up verification code
    verificationCodeStore.delete(email);

    // Return session info and client data
    return NextResponse.json({
      success: true,
      sessionToken,
      expiresAt,
      client: {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        phone: client.phone,
        address: client.address,
        phoneAddedAt: client.phoneAddedAt,
        addressAddedAt: client.addressAddedAt,
        agreementsCount: client.agreements.length,
      }
    });

  } catch (error: any) {
    console.error('Error verifying portal access:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 });
    }
    return NextResponse.json({ 
      error: 'Failed to verify access code' 
    }, { status: 500 });
  }
}
