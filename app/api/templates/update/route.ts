import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const templateUpdateSchema = z.object({
  id: z.string().min(1, 'Template ID is required'),
  title: z.string().min(1, 'Title is required'),
  htmlContent: z.string().min(1, 'HTML content is required'),
  fieldsSchema: z.any().optional(),
});

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Template update request body:', body);
    
    const validatedData = templateUpdateSchema.parse(body);
    console.log('Validated data:', validatedData);

    const updatedTemplate = await prisma.template.update({
      where: { id: validatedData.id },
      data: {
        title: validatedData.title,
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
