import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const clientUpdateSchema = z.object({
  id: z.string().min(1, 'Client ID is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional().nullable(),
  eventDate: z.string().optional().nullable(),
  eventType: z.string().optional().nullable(),
  eventLocation: z.string().optional().nullable(),
  eventStartTime: z.string().optional().nullable(),
  eventDuration: z.string().optional().nullable(),
  eventPackage: z.string().optional().nullable(),
  packagePrice: z.union([z.string(), z.number()]).optional().nullable(),
  notes: z.string().optional().nullable(),
});

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Client update request body:', body);
    
    const validatedData = clientUpdateSchema.parse(body);
    console.log('Validated data:', validatedData);

    // Check if this client has any signed agreements
    const signedAgreements = await prisma.agreement.findMany({
      where: {
        clientId: validatedData.id,
        status: 'SIGNED'
      },
      select: { id: true, uniqueToken: true }
    });

    if (signedAgreements.length > 0) {
      console.error('Attempted to modify client with signed agreements:', validatedData.id, 'Signed agreements:', signedAgreements);
      return NextResponse.json({ 
        error: 'Cannot modify client data when they have signed agreements. Client data is locked once an agreement is signed to maintain legal integrity.',
        signedAgreements: signedAgreements.map(a => ({ id: a.id, token: a.uniqueToken }))
      }, { status: 403 });
    }

    const updatedClient = await prisma.client.update({
      where: { id: validatedData.id },
      data: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        phone: validatedData.phone,
        eventDate: validatedData.eventDate ? new Date(validatedData.eventDate) : null,
        eventType: validatedData.eventType,
        eventLocation: validatedData.eventLocation,
        eventStartTime: validatedData.eventStartTime,
        eventDuration: validatedData.eventDuration,
        eventPackage: validatedData.eventPackage,
        packagePrice: validatedData.packagePrice ? parseFloat(validatedData.packagePrice.toString()) : null,
        notes: validatedData.notes,
      },
    });

    console.log('Updated client:', updatedClient);
    return NextResponse.json(updatedClient);
  } catch (error: any) {
    console.error('Client update error details:', error);
    if (error instanceof z.ZodError) {
      console.error('Zod validation errors:', error.errors);
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error updating client:', error);
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
  }
}
