import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updatePaymentInfoSchema = z.object({
  agreementId: z.string().min(1, 'Agreement ID is required'),
  paymentStatus: z.string().optional(),
  stripePaymentLink: z.string().url('Invalid payment link URL').optional().or(z.literal('')),
  stripeReceiptLink: z.string().url('Invalid receipt link URL').optional().or(z.literal('')),
});

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = updatePaymentInfoSchema.parse(body);

    // Check if agreement exists
    const agreement = await prisma.agreement.findUnique({
      where: { id: validatedData.agreementId },
      select: { id: true, status: true }
    });

    if (!agreement) {
      return NextResponse.json({ 
        error: 'Agreement not found' 
      }, { status: 404 });
    }

    // Prepare update data
    const updateData: any = {};
    
    if (validatedData.paymentStatus !== undefined) {
      updateData.paymentStatus = validatedData.paymentStatus || null;
    }
    
    if (validatedData.stripePaymentLink !== undefined) {
      updateData.stripePaymentLink = validatedData.stripePaymentLink || null;
    }
    
    if (validatedData.stripeReceiptLink !== undefined) {
      updateData.stripeReceiptLink = validatedData.stripeReceiptLink || null;
    }

    // Update the agreement
    const updatedAgreement = await prisma.agreement.update({
      where: { id: validatedData.agreementId },
      data: updateData,
      include: {
        client: true,
        template: true
      }
    });

    console.log('Payment info updated for agreement:', updatedAgreement.id);
    return NextResponse.json({
      success: true,
      agreement: updatedAgreement
    });

  } catch (error: any) {
    console.error('Error updating payment info:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 });
    }
    return NextResponse.json({ 
      error: 'Failed to update payment information' 
    }, { status: 500 });
  }
}

