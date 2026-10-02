import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { devLog } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { handleApiError } from '@/lib/handleApiError';
import { attendantIdFromBackdropUrl } from '@/lib/attendantIdentity';

const createBackdropLinkSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200, 'Name must be 200 characters or less'),
  url: z.string().url('Invalid URL'),
  displayOrder: z.number().int().optional(),
  attendantId: z.string().min(1).nullable().optional(),
});

// GET - List all backdrop links
export async function GET(request: NextRequest) {
  try {

    await requireAdmin(request);
    const backdropLinks = await prisma.backdropLink.findMany({
      orderBy: { displayOrder: 'asc' },
      include: { attendant: { select: { id: true, name: true, active: true } } },
    });

    return NextResponse.json({
      success: true,
      backdropLinks
    });

  } catch (error) {
    const authResponse = adminAuthResponse(error);
    if (authResponse) return authResponse;
    console.error('Error fetching backdrop links:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch backdrop links' 
    }, { status: 500 });
  }
}

// POST - Create new backdrop link
export async function POST(request: NextRequest) {
  try {

    await requireAdmin(request);
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

    // Use the chosen attendant; if none was chosen, match the attendant ID in the URL.
    let attendantId: string | null = null;
    if (validatedData.attendantId) {
      const attendant = await prisma.attendant.findUnique({ where: { id: validatedData.attendantId } });
      if (!attendant) {
        return NextResponse.json({ error: 'Attendant not found' }, { status: 400 });
      }
      attendantId = attendant.id;
    } else if (validatedData.attendantId === undefined) {
      const externalId = attendantIdFromBackdropUrl(validatedData.url);
      if (externalId) {
        const attendant = await prisma.attendant.findUnique({ where: { externalId } });
        attendantId = attendant?.id ?? null;
      }
    }

    const backdropLink = await prisma.backdropLink.create({
      data: {
        id,
        name: validatedData.name,
        url: validatedData.url,
        displayOrder,
        attendantId,
      },
      include: { attendant: { select: { id: true, name: true, active: true } } },
    });

    devLog('Created backdrop link:', backdropLink.id);
    return NextResponse.json({
      success: true,
      backdropLink
    }, { status: 201 });

  } catch (error) {
    return handleApiError(error, 'agreements/backdrop-links', request.method);
  }
}

