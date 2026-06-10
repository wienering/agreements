import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { devLog } from '@/lib/logger';

const clientUpdateSchema = z.object({
  id: z.string().min(1, 'Client ID is required'),
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

function parseOptionalEventDate(value: string | null | undefined): Date | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw new Error('INVALID_EVENT_DATE');
  }
  return d;
}

export async function PUT(request: NextRequest) {
  try {

    await requireAdmin(request);
    const body = await request.json();
    devLog('Client update request body:', body);

    const parsed = clientUpdateSchema.safeParse(body);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message ?? 'Invalid request body';
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const validatedData = parsed.data;

    let packagePriceParsed: number | null;
    try {
      packagePriceParsed = parseOptionalPackagePrice(validatedData.packagePrice);
    } catch {
      return NextResponse.json({ error: 'Package price must be a valid number' }, { status: 400 });
    }

    let eventDateParsed: Date | null;
    try {
      eventDateParsed = parseOptionalEventDate(validatedData.eventDate);
    } catch {
      return NextResponse.json({ error: 'Event date must be a valid date' }, { status: 400 });
    }

    devLog('Validated data:', { ...validatedData, eventDateParsed, packagePriceParsed });

    const signedAgreements = await prisma.agreement.findMany({
      where: {
        clientId: validatedData.id,
        status: 'SIGNED',
      },
      select: { id: true, uniqueToken: true },
    });

    if (signedAgreements.length > 0) {
      console.error(
        'Attempted to modify client with signed agreements:',
        validatedData.id,
        'Signed agreements:',
        signedAgreements,
      );
      return NextResponse.json(
        {
          error:
            'Cannot modify client data when they have signed agreements. Client data is locked once an agreement is signed to maintain legal integrity.',
          signedAgreements: signedAgreements.map((a) => ({ id: a.id, token: a.uniqueToken })),
        },
        { status: 403 },
      );
    }

    const updatedClient = await prisma.client.update({
      where: { id: validatedData.id },
      data: {
        firstName: validatedData.firstName,
        lastName: validatedData.lastName,
        email: validatedData.email,
        phone: validatedData.phone,
        eventDate: eventDateParsed,
        eventType: validatedData.eventType,
        eventLocation: validatedData.eventLocation,
        eventStartTime: validatedData.eventStartTime,
        eventDuration: validatedData.eventDuration,
        eventPackage: validatedData.eventPackage,
        packagePrice: packagePriceParsed,
        notes: validatedData.notes,
        isWhitelabelClient:
          validatedData.isWhitelabelClient !== undefined ? validatedData.isWhitelabelClient : undefined,
      },
    });

    devLog('Updated client:', updatedClient);
    return NextResponse.json(updatedClient);
  } catch (error: unknown) {
    const authResponse = adminAuthResponse(error);
    if (authResponse) return authResponse;
    console.error('Client update error details:', error);
    const err = error as { code?: string; meta?: unknown };
    if (err.code === 'P2002') {
      return NextResponse.json(
        { error: 'A client with this email already exists.' },
        { status: 409 },
      );
    }
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Client not found.' }, { status: 404 });
    }
    console.error('Error updating client:', error);
    return NextResponse.json({ error: 'Failed to update client' }, { status: 500 });
  }
}
