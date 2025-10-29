import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { randomBytes } from 'crypto';

// Store verification codes temporarily (in production, use Redis or similar)
const verificationCodes = new Map<string, { code: string; expiresAt: Date }>();

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
    const storedCode = verificationCodes.get(email);
    
    if (!storedCode) {
      return NextResponse.json({ 
        error: 'Invalid or expired verification code',
        code: 'INVALID_CODE'
      }, { status: 400 });
    }

    // Check if code has expired
    if (new Date() > storedCode.expiresAt) {
      verificationCodes.delete(email);
      return NextResponse.json({ 
        error: 'Verification code has expired',
        code: 'EXPIRED_CODE'
      }, { status: 400 });
    }

    // Check if code matches
    if (storedCode.code !== code) {
      return NextResponse.json({ 
        error: 'Invalid verification code',
        code: 'INVALID_CODE'
      }, { status: 400 });
    }

    // Find client
    const client = await prisma.client.findFirst({
      where: { email },
      include: {
        agreements: {
          select: {
            id: true,
            status: true,
            createdAt: true,
            templateName: true
          }
        }
      }
    });

    if (!client) {
      return NextResponse.json({ 
        error: 'Client not found',
        code: 'CLIENT_NOT_FOUND'
      }, { status: 404 });
    }

    // Generate session token
    const sessionToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 90 * 60 * 1000); // 90 minutes

    // Create session
    await prisma.clientSession.create({
      data: {
        clientId: client.id,
        sessionToken,
        expiresAt,
        lastActivityAt: new Date()
      }
    });

    // Remove used verification code
    verificationCodes.delete(email);

    return NextResponse.json({
      success: true,
      sessionToken,
      expiresAt: expiresAt.toISOString(),
      client: {
        id: client.id,
        firstName: client.firstName,
        lastName: client.lastName,
        email: client.email,
        phone: client.phone,
        address: client.address,
        phoneAddedAt: client.phoneAddedAt,
        addressAddedAt: client.addressAddedAt,
        agreementCount: client.agreements.length
      }
    });

  } catch (error: any) {
    console.error('Error verifying access:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 });
    }
    return NextResponse.json({ 
      error: 'Failed to verify access',
      code: 'SERVER_ERROR'
    }, { status: 500 });
  }
}
