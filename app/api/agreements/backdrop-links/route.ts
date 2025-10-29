import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { randomBytes } from 'crypto';

const createBackdropLinkSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name must be 200 characters or less'),
  url: z.string().url('Invalid URL'),
  displayOrder: z.number().int().optional(),
});

// GET - List all backdrop links
export async function GET() {
  try {
    const backdropLinks = await prisma.backdropLink.findMany({
      orderBy: { displayOrder: 'asc' }
    });

    return NextResponse.json({
      success: true,
      backdropLinks
    });

  } catch (error) {
    console.error('Error fetching backdrop links:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch backdrop links' 
    }, { status: 500 });
  }
}

// POST - Create new backdrop link
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = createBackdropLinkSchema.parse(body);

    // If no displayOrder provided, get the max and add 1
    let displayOrder = validatedData.displayOrder;
    if (displayOrder === undefined) {
      const maxOrder = await prisma.backdropLink.aggregate({
        _max: { displayOrder: true }
      });
      displayOrder = (maxOrder._max.displayOrder || 0) + 1;
    }

    // Generate unique ID
    const id = randomBytes(16).toString('hex');

    const backdropLink = await prisma.backdropLink.create({
      data: {
        id,
        name: validatedData.name,
        url: validatedData.url,
        displayOrder
      }
    });

    console.log('Created backdrop link:', backdropLink.id);
    return NextResponse.json({
      success: true,
      backdropLink
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating backdrop link:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Validation failed', 
        details: error.errors 
      }, { status: 400 });
    }
    return NextResponse.json({ 
      error: 'Failed to create backdrop link' 
    }, { status: 500 });
  }
}

