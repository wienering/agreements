import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateClientInfoSchema = z.object({
  phone: z.string().optional(),
  address: z.string().optional(),
}).refine(data => data.phone || data.address, {
  message: "At least one field (phone or address) must be provided"
});

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'Authorization header required' 
      }, { status: 401 });
    }

    const sessionToken = authHeader.substring(7);

    // Find and validate session
    const session = await prisma.clientSession.findUnique({
      where: { sessionToken },
      include: {
        client: true
      }
    });

    if (!session) {
      return NextResponse.json({ 
        error: 'Invalid session token' 
      }, { status: 401 });
    }

    // Check if session has expired
    if (new Date() > session.expiresAt) {
      await prisma.clientSession.delete({
        where: { sessionToken }
      });
      
      return NextResponse.json({ 
        error: 'Session has expired' 
      }, { status: 401 });
    }

    // Check if client is loaded
    if (!session.client) {
      return NextResponse.json({ 
        error: 'Invalid session - no client associated' 
      }, { status: 401 });
    }

    // Extract client to preserve TypeScript type narrowing
    const sessionClient = session.client;

    const body = await request.json();
    const validatedData = updateClientInfoSchema.parse(body);

    // Check if fields are already set (prevent editing)
    const updateData: any = {};
    const errors: string[] = [];

    if (validatedData.phone !== undefined) {
      if (sessionClient.phone && sessionClient.phoneAddedAt) {
        errors.push('Phone number has already been set and cannot be changed');
      } else {
        updateData.phone = validatedData.phone;
        updateData.phoneAddedAt = new Date();
      }
    }

    if (validatedData.address !== undefined) {
      if (sessionClient.address && sessionClient.addressAddedAt) {
        errors.push('Address has already been set and cannot be changed');
      } else {
        updateData.address = validatedData.address;
        updateData.addressAddedAt = new Date();
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot update fields that have already been set',
        details: errors
      }, { status: 400 });
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ 
        error: 'No valid fields to update' 
      }, { status: 400 });
    }

    // Update client record
    const updatedClient = await prisma.client.update({
      where: { id: sessionClient.id },
      data: updateData
    });

    // Update last activity
    await prisma.clientSession.update({
      where: { sessionToken },
      data: { lastActivityAt: new Date() }
    });

    return NextResponse.json({
      success: true,
      message: 'Client information updated successfully',
      client: {
        id: updatedClient.id,
        firstName: updatedClient.firstName,
        lastName: updatedClient.lastName,
        email: updatedClient.email,
        phone: updatedClient.phone,
        address: updatedClient.address,
        phoneAddedAt: updatedClient.phoneAddedAt,
        addressAddedAt: updatedClient.addressAddedAt,
      }
    });

  } catch (error: any) {
    console.error('Error updating client info:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 });
    }
    return NextResponse.json({ 
      error: 'Failed to update client information' 
    }, { status: 500 });
  }
}
