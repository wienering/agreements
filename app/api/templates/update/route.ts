import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import { devLog } from '@/lib/logger';
import { z } from 'zod';
import { formatZodDetails } from '@/lib/handleApiError';
import { SIGNED_STATUSES } from '@/lib/agreementStatus';

const templateUpdateSchema = z.object({
  id: z.string().min(1, 'Template ID is required'),
  title: z.string().min(1, 'Title is required'),
  internalTitle: z.string().optional().nullable(),
  htmlContent: z.string().min(1, 'HTML content is required'),
  fieldsSchema: z.any().optional(),
});

export async function PUT(request: NextRequest) {
  try {

    await requireAdmin(request);
    const body = await request.json();
    devLog('Template update request body:', body);
    
    const validatedData = templateUpdateSchema.parse(body);
    devLog('Validated data:', validatedData);

    // Check if this template has any signed agreements
    const signedAgreements = await prisma.agreement.findMany({
      where: {
        templateId: validatedData.id,
        status: { in: [...SIGNED_STATUSES] }
      },
      select: { id: true, uniqueToken: true, client: { select: { firstName: true, lastName: true } } }
    });

    if (signedAgreements.length > 0) {
      console.warn('Updating template with signed agreements:', validatedData.id, 'Signed agreements:', signedAgreements);
      // Note: This is allowed because signed agreements use mergedHtml snapshots
      // But we log it for audit purposes
    }

    const updatedTemplate = await prisma.template.update({
      where: { id: validatedData.id },
      data: {
        title: validatedData.title,
        internalTitle: validatedData.internalTitle,
        htmlContent: validatedData.htmlContent,
        fieldsSchema: validatedData.fieldsSchema || {},
        version: { increment: 1 }, // Increment version on update
      },
    });

    devLog('Updated template:', updatedTemplate);
    return NextResponse.json(updatedTemplate);
  } catch (error: any) {
    const authResponse = adminAuthResponse(error);
    if (authResponse) return authResponse;
    console.error('Template update error details:', error);
    if (error instanceof z.ZodError) {
      console.error('Zod validation errors:', error.issues);
      return NextResponse.json(
        { error: 'Validation failed', details: formatZodDetails(error) },
        { status: 400 },
      );
    }
    console.error('Error updating template:', error);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}
