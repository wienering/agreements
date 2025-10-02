import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const agreement = await prisma.agreement.findUnique({
      where: {
        uniqueToken: token,
      },
      include: {
        client: true,
        template: true,
        fields: true,
      },
    });

    if (!agreement) {
      return NextResponse.json({ error: 'Agreement not found' }, { status: 404 });
    }

    // Check if agreement has expired
    if (agreement.expiresAt && new Date(agreement.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Agreement has expired' }, { status: 410 });
    }

    // Merge template content with client data
    let mergedHtml = agreement.template.htmlContent;
    
    // Replace smart fields with actual data
    mergedHtml = mergedHtml.replace(/\{\{client\.firstName\}\}/g, agreement.client.firstName);
    mergedHtml = mergedHtml.replace(/\{\{client\.lastName\}\}/g, agreement.client.lastName);
    mergedHtml = mergedHtml.replace(/\{\{client\.email\}\}/g, agreement.client.email);
    mergedHtml = mergedHtml.replace(/\{\{client\.phone\}\}/g, agreement.client.phone || '');
    mergedHtml = mergedHtml.replace(/\{\{client\.eventDate\}\}/g, 
      agreement.client.eventDate ? new Date(agreement.client.eventDate).toLocaleDateString() : ''
    );

    // Replace any custom fields from the agreement
    agreement.fields.forEach(field => {
      const regex = new RegExp(`\\{\\{${field.key}\\}\\}`, 'g');
      mergedHtml = mergedHtml.replace(regex, field.value);
    });

    // Update the agreement with merged HTML
    await prisma.agreement.update({
      where: { id: agreement.id },
      data: { mergedHtml },
    });

    return NextResponse.json({
      id: agreement.id,
      client: agreement.client,
      template: agreement.template,
      status: agreement.status,
      mergedHtml,
      fields: agreement.fields,
    });
  } catch (error: any) {
    console.error('Error fetching agreement:', error);
    return NextResponse.json({ error: 'Failed to fetch agreement' }, { status: 500 });
  }
}
