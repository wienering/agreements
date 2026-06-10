import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import { devLog } from '@/lib/logger';
import { z } from 'zod';
import { formatZodDetails } from '@/lib/handleApiError';

const agreementUpdateSchema = z.object({
  id: z.string().min(1, 'Agreement ID is required'),
  htmlContent: z.string().min(1, 'HTML content is required'),
  secondSignerEnabled: z.boolean().optional(),
  secondSignerFirstName: z.string().nullable().optional(),
  secondSignerLastName: z.string().nullable().optional(),
  secondSignerEmail: z
    .string()
    .email('Second signer email must be a valid email')
    .nullable()
    .optional()
    .or(z.literal('').transform(() => null)),
  secondSignerPhone: z.string().nullable().optional(),
  requireBothSignatures: z.boolean().optional(),
});

export async function PUT(request: NextRequest) {
  try {

    await requireAdmin(request);
    const body = await request.json();
    devLog('Agreement update request body:', body);
    
    const validatedData = agreementUpdateSchema.parse(body);
    devLog('Validated data:', validatedData);
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

    devLog('Found agreement, updating customHtmlContent');

    // Build update data, only setting second-signer fields when explicitly provided
    const data: any = {
      customHtmlContent: validatedData.htmlContent,
    };

    if (typeof validatedData.secondSignerEnabled === 'boolean') {
      const enabled = validatedData.secondSignerEnabled;
      data.secondSignerEnabled = enabled;
      if (enabled) {
        // When enabling, require an email
        const email = validatedData.secondSignerEmail?.toString().trim().toLowerCase() || null;
        if (!email) {
          return NextResponse.json({ error: 'Second signer email is required when second signer is enabled' }, { status: 400 });
        }
        data.secondSignerFirstName = validatedData.secondSignerFirstName ?? null;
        data.secondSignerLastName = validatedData.secondSignerLastName ?? null;
        data.secondSignerEmail = email;
        data.secondSignerPhone = validatedData.secondSignerPhone ?? null;
        data.requireBothSignatures = Boolean(validatedData.requireBothSignatures);
      } else {
        // When disabling, clear all second-signer fields
        data.secondSignerFirstName = null;
        data.secondSignerLastName = null;
        data.secondSignerEmail = null;
        data.secondSignerPhone = null;
        data.requireBothSignatures = false;
      }
    }

    // Update the agreement's custom content (not the template)
    const updatedAgreement = await prisma.agreement.update({
      where: { id },
      data,
      include: {
        client: true,
        template: true
      }
    });

    devLog('Agreement customHtmlContent updated successfully');

    if (!updatedAgreement) {
      console.error('Agreement not found after update:', id);
      return NextResponse.json({ error: 'Agreement not found after update' }, { status: 404 });
    }

    devLog('Agreement updated successfully:', updatedAgreement.id);
    return NextResponse.json(updatedAgreement);
  } catch (error: any) {
    const authResponse = adminAuthResponse(error);
    if (authResponse) return authResponse;
    console.error('Agreement update error details:', error);
    if (error instanceof z.ZodError) {
      console.error('Zod validation errors:', error.issues);
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodDetails(error) },
        { status: 400 },
      );
    }
    console.error('Error updating agreement:', error);
    return NextResponse.json({ error: 'Failed to update agreement' }, { status: 500 });
  }
}
