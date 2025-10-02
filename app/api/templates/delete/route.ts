import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const templateDeleteSchema = z.object({
  id: z.string().min(1, 'Template ID is required'),
});

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('Template delete request body:', body);
    
    const validatedData = templateDeleteSchema.parse(body);
    console.log('Validated data:', validatedData);

    // Check if template is being used by any agreements
    const agreementsUsingTemplate = await prisma.agreement.findMany({
      where: { templateId: validatedData.id },
      select: { id: true }
    });

    if (agreementsUsingTemplate.length > 0) {
      console.error('Cannot delete template: used by agreements:', agreementsUsingTemplate.length);
      return NextResponse.json({ 
        error: `Cannot delete template. It is being used by ${agreementsUsingTemplate.length} agreement(s).` 
      }, { status: 400 });
    }

    // Delete the template
    await prisma.template.delete({
      where: { id: validatedData.id }
    });

    console.log('Template deleted successfully:', validatedData.id);
    return NextResponse.json({ success: true, message: 'Template deleted successfully' });
  } catch (error: any) {
    console.error('Template delete error details:', error);
    if (error instanceof z.ZodError) {
      console.error('Zod validation errors:', error.errors);
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error('Error deleting template:', error);
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
