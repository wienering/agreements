import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {

    await requireAdmin();
    const templates = await prisma.template.findMany({
      orderBy: { order: 'asc' }
    });
    return NextResponse.json(templates);
  } catch (error) {
    const authResponse = adminAuthResponse(error);
    if (authResponse) return authResponse;
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {

    await requireAdmin();
    const body = await request.json();
    const { title, internalTitle, htmlContent, fieldsSchema } = body;

    // Validate required fields
    if (!title || !htmlContent) {
      return NextResponse.json({ error: 'Title and HTML content are required' }, { status: 400 });
    }

    // Get the highest order value and add 1 for the new template
    const lastTemplate = await prisma.template.findFirst({
      orderBy: { order: 'desc' }
    });
    const newOrder = lastTemplate ? lastTemplate.order + 1 : 0;

    const template = await prisma.template.create({
      data: {
        title,
        internalTitle: internalTitle || null,
        htmlContent,
        fieldsSchema: fieldsSchema || {},
        order: newOrder,
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    const authResponse = adminAuthResponse(error);
    if (authResponse) return authResponse;
    console.error('Error creating template:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}
