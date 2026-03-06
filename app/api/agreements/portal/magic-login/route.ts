import { NextRequest, NextResponse } from 'next/server';
import { devLog } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { verifyMagicToken } from '@/lib/magicToken';

const magicLoginSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = magicLoginSchema.parse(body);

    // Verify the magic token
    const payload = verifyMagicToken(validatedData.token);
    
    if (!payload) {
      return NextResponse.json({ 
        error: 'Invalid or expired link. Please use the manual login instead.',
        code: 'INVALID_TOKEN'
      }, { status: 400 });
    }

    // Find the client by ID and verify email matches
    const client = await prisma.client.findFirst({
      where: { 
        id: payload.clientId,
        email: payload.clientEmail 
      },
      include: {
        agreements: {
          include: {
            template: true
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!client) {
      return NextResponse.json({ 
        error: 'Client not found. The link may be invalid.',
        code: 'CLIENT_NOT_FOUND'
      }, { status: 404 });
    }

    // Generate session token
    const sessionToken = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 90 * 60 * 1000); // 90 minutes

    // Create client session
    await prisma.clientSession.create({
      data: {
        clientEmail: client.email,
        sessionToken,
        expiresAt,
        lastActivityAt: new Date(),
      }
    });

    devLog(`Magic login successful for client: ${client.email} (purpose: ${payload.purpose})`);

    // Return session info and client data
    return NextResponse.json({
      success: true,
      sessionToken,
      expiresAt,
      purpose: payload.purpose,
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
    console.error('Error with magic login:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid request', 
        details: error.errors 
      }, { status: 400 });
    }
    return NextResponse.json({ 
      error: 'Failed to process magic login. Please try manual login.',
      code: 'SERVER_ERROR'
    }, { status: 500 });
  }
}




