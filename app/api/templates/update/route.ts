import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const templateUpdateSchema = z.object({
  id: z.string().min(1, 'Template ID is required'),
  title: z.string().min(1, 'Title is required'),
  internalTitle: z.string().optional().nullable(),
  htmlContent: z.string().min(1, 'HTML content is required'),
  fieldsSchema: z.any().optional(),
});

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Template update request body:', body);
    
    const validatedData = templateUpdateSchema.parse(body);
    console.log('Validated data:', validatedData);

    // Check if this template has any signed agreements
    const signedAgreements = await prisma.agreement.findMany({
      where: {
        templateId: validatedData.id,
        status: 'SIGNED'
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

    console.log('Updated template:', updatedTemplate);
    return NextResponse.json(updatedTemplate);
  } catch (error: any) {
    console.error('Template update error details:', error);
    if (error instanceof z.ZodError) {
      console.error('Zod validation errors:', error.errors);
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error updating template:', error);
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}
