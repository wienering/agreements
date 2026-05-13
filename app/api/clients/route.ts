import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createClientSchema = z.object({
  firstName: z.string().trim().pipe(z.string().min(1, 'First name is required')),
  lastName: z.string().trim().pipe(z.string().min(1, 'Last name is required')),
  email: z
    .string()
    .transform((s) => s.normalize('NFKC').trim().toLowerCase())
    .pipe(z.string().min(1, 'Email is required').email('Invalid email address')),
  phone: z.string().optional().nullable(),
  eventDate: z.string().optional().nullable(),
  eventType: z.string().optional().nullable(),
  eventLocation: z.string().optional().nullable(),
  eventStartTime: z.string().optional().nullable(),
  eventDuration: z.string().optional().nullable(),
  eventPackage: z.string().optional().nullable(),
  packagePrice: z.union([z.string(), z.number()]).optional().nullable(),
  notes: z.string().optional().nullable(),
  isWhitelabelClient: z.boolean().optional(),
});

function parseOptionalPackagePrice(value: unknown): number | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const n = typeof value === 'number' ? value : parseFloat(String(value).trim());
  if (!Number.isFinite(n)) {
    throw new Error('INVALID_PACKAGE_PRICE');
  }
  return n;
}

export async function GET() {
  try {
    const clients = await prisma.client.findMany({
      include: {
        events: {
          where: {
            archived: false
          },
          include: {
            agreements: {
              where: {
                archived: false
              },
              select: {
                id: true
              }
            }
          },
          orderBy: [
            { eventDate: 'asc' },
            { createdAt: 'asc' }
          ]
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Transform the response to add _count for agreements (excluding archived)
    const clientsWithCounts = clients.map(client => ({
      ...client,
      events: client.events.map(event => {
        const { agreements, ...eventWithoutAgreements } = event;
        return {
          ...eventWithoutAgreements,
          _count: {
            agreements: agreements.length
          }
        };
      })
    }));
    
    return NextResponse.json(clientsWithCounts);
  } catch (error) {
    console.error('Error fetching clients:', error);
    return NextResponse.json({ error: 'Failed to fetch clients' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const raw = await request.json();
    const parsed = createClientSchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    let packagePriceParsed: number | null;
    try {
      packagePriceParsed = parseOptionalPackagePrice(parsed.data.packagePrice);
    } catch {
      return NextResponse.json({ error: 'Package price must be a valid number' }, { status: 400 });
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      eventDate,
      eventType,
      eventLocation,
      eventStartTime,
      eventDuration,
      eventPackage,
      notes,
      isWhitelabelClient,
    } = parsed.data;

    // Check if client exists by email
    let client = await prisma.client.findUnique({
      where: { email }
    });

    // If client doesn't exist, create new client
    if (!client) {
      client = await prisma.client.create({
        data: {
          firstName,
          lastName,
          email,
          phone: phone || null,
          notes: notes || null,
          isWhitelabelClient: isWhitelabelClient || false,
        },
      });
    } else {
      // Update client info if provided (but don't update event fields - those go to Event model)
      client = await prisma.client.update({
        where: { id: client.id },
        data: {
          firstName,
          lastName,
          phone: phone !== undefined ? phone : undefined,
          notes: notes !== undefined ? notes : undefined,
          isWhitelabelClient: isWhitelabelClient !== undefined ? isWhitelabelClient : undefined,
        },
      });
    }

    // Create Event record for this booking
    // Only create if there's event data provided
    if (
      eventDate ||
      eventType ||
      eventLocation ||
      eventStartTime ||
      eventDuration ||
      eventPackage ||
      packagePriceParsed !== null
    ) {
      await prisma.event.create({
        data: {
          clientId: client.id,
          eventDate: eventDate ? new Date(eventDate) : null,
          eventType: eventType || null,
          eventLocation: eventLocation || null,
          eventStartTime: eventStartTime || null,
          eventDuration: eventDuration || null,
          eventPackage: eventPackage || null,
          packagePrice: packagePriceParsed,
          notes: notes || null,
          archived: false,
        },
      });
    }

    // Fetch client with events included
    const clientWithEvents = await prisma.client.findUnique({
      where: { id: client.id },
      include: {
        events: {
          where: {
            archived: false
          },
          include: {
            agreements: {
              where: {
                archived: false
              },
              select: {
                id: true
              }
            }
          },
          orderBy: [
            { eventDate: 'asc' },
            { createdAt: 'asc' }
          ]
        }
      }
    });

    // Transform the response to add _count for agreements (excluding archived)
    if (clientWithEvents) {
      const transformedClient = {
        ...clientWithEvents,
        events: clientWithEvents.events.map(event => {
          const { agreements, ...eventWithoutAgreements } = event;
          return {
            ...eventWithoutAgreements,
            _count: {
              agreements: agreements.length
            }
          };
        })
      };
      return NextResponse.json(transformedClient, { status: 201 });
    }

    return NextResponse.json(clientWithEvents, { status: 201 });
  } catch (error: any) {
    console.error('Error creating client:', error);
    // Handle unique constraint error specifically
    if (error.code === 'P2002') {
      return NextResponse.json({ 
        error: 'A client with this email already exists. The event has been added to the existing client.' 
      }, { status: 409 });
    }
    return NextResponse.json({ error: 'Failed to create client' }, { status: 500 });
  }
}
