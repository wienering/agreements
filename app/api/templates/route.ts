import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const templates = await prisma.template.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, htmlContent, fieldsSchema } = body;

    // Validate required fields
    if (!title || !htmlContent) {
      return NextResponse.json({ error: 'Title and HTML content are required' }, { status: 400 });
    }

    const template = await prisma.template.create({
      data: {
        title,
        htmlContent,
        fieldsSchema: fieldsSchema || {},
      },
    });

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}
