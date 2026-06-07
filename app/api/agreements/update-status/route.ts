import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import { devLog } from '@/lib/logger';
import { z } from 'zod';

const updateStatusSchema = z.object({
  id: z.string().min(1, 'Agreement ID is required'),
  status: z.enum(['DRAFT', 'LIVE', 'SIGNED', 'COMPLETED'], {
    errorMap: () => ({ message: 'Status must be DRAFT, LIVE, SIGNED, or COMPLETED' })
  }),
});

export async function PUT(request: NextRequest) {
  try {

    await requireAdmin();
    const body = await request.json();
    devLog('Update status request body:', body);
    
    const validatedData = updateStatusSchema.parse(body);
    devLog('Validated data:', validatedData);

    // First check if the agreement exists and get its current status
    const existingAgreement = await prisma.agreement.findUnique({
      where: { id: validatedData.id },
      select: { status: true }
    });

    if (!existingAgreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    // Prevent status changes to signed agreements (except for specific allowed transitions)
    if (existingAgreement.status === 'SIGNED') {
      // Only allow certain status changes from SIGNED
      const allowedTransitions = ['COMPLETED', 'CANCELLED'];
      if (!allowedTransitions.includes(validatedData.status)) {
        console.error('Attempted to change status of signed agreement:', validatedData.id, 'from', existingAgreement.status, 'to', validatedData.status);
        return NextResponse.json({ 
          error: 'Cannot change status of signed agreements except to COMPLETED or CANCELLED. Once an agreement is signed, it becomes legally binding.' 
        }, { status: 403 });
      }
    }

    const updatedAgreement = await prisma.agreement.update({
      where: { id: validatedData.id },
      data: {
        status: validatedData.status,
        // Note: COMPLETED agreements are NOT auto-archived so clients retain portal access
      },
    });

    devLog('Updated agreement status:', updatedAgreement);
    return NextResponse.json(updatedAgreement);
  } catch (error: any) {
    console.error('Status update error details:', error);
    if (error instanceof z.ZodError) {
      console.error('Zod validation errors:', error.errors);
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 });
    }
    
    // Check if it's a database constraint error
    if (error.code === 'P2002' || error.message?.includes('constraint')) {
      console.error('Database constraint error:', error);
      return NextResponse.json({ 
        error: 'Database constraint error - status may not be valid', 
        details: error.message 
      }, { status: 400 });
    }
    
    console.error('Error updating agreement status:', error);
    return NextResponse.json({ 
      error: 'Failed to update status', 
      details: error.message 
    }, { status: 500 });
  }
}
