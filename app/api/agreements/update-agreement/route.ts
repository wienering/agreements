import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const agreementUpdateSchema = z.object({
  id: z.string().min(1, 'Agreement ID is required'),
  htmlContent: z.string().min(1, 'HTML content is required'),
});

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Agreement update request body:', body);
    
    const validatedData = agreementUpdateSchema.parse(body);
    console.log('Validated data:', validatedData);
    const id = validatedData.id;

    // First get the agreement to find the template ID and check status
    const agreement = await prisma.agreement.findUnique({
      where: { id },
      select: { templateId: true, status: true }
    });

    if (!agreement) {
      console.error('Agreement not found:', id);
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    // Prevent modifications to signed agreements
    if (agreement.status === 'SIGNED') {
      console.error('Attempted to modify signed agreement:', id);
      return NextResponse.json({ 
        error: 'Cannot modify signed agreements. Once an agreement is signed, it becomes legally binding and immutable.' 
      }, { status: 403 });
    }

    console.log('Found agreement, updating customHtmlContent');

    // Update the agreement's custom content (not the template)
    const updatedAgreement = await prisma.agreement.update({
      where: { id },
      data: {
        customHtmlContent: validatedData.htmlContent
      },
      include: {
        client: true,
        template: true
      }
    });

    console.log('Agreement customHtmlContent updated successfully');

    if (!updatedAgreement) {
      console.error('Agreement not found after update:', id);
      return NextResponse.json({ error: 'Agreement not found after update' }, { status: 404 });
    }

    console.log('Agreement updated successfully:', updatedAgreement.id);
    return NextResponse.json(updatedAgreement);
  } catch (error: any) {
    console.error('Agreement update error details:', error);
    if (error instanceof z.ZodError) {
      console.error('Zod validation errors:', error.errors);
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error updating agreement:', error);
    return NextResponse.json({ error: 'Failed to update agreement' }, { status: 500 });
  }
}
