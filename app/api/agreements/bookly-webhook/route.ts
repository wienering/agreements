import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { devLog } from '@/lib/logger';
import { z } from 'zod';
import { randomBytes } from 'crypto';
import { createHmac } from 'crypto';

// Flexible schema to handle various Bookly payload formats
const booklyWebhookSchema = z.object({
  // Customer information - support multiple formats
  email: z.string().email('Valid email is required'),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  fullName: z.string().optional(), // Alternative to firstName/lastName
  phone: z.string().optional(),
  
  // Booking/Appointment information
  bookingDate: z.string().optional(), // ISO date string or date format
  bookingTime: z.string().optional(),
  appointmentDate: z.string().optional(), // Alternative field name
  appointmentTime: z.string().optional(), // Alternative field name
  
  // Service information
  serviceName: z.string().optional(),
  serviceType: z.string().optional(),
  eventType: z.string().optional(),
  eventPackage: z.string().optional(),
  
  // Location
  location: z.string().optional(),
  eventLocation: z.string().optional(),
  address: z.string().optional(),
  
  // Duration and pricing
  duration: z.string().optional(),
  eventDuration: z.string().optional(),
  price: z.union([z.string(), z.number()]).optional(),
  packagePrice: z.union([z.string(), z.number()]).optional(),
  
  // Notes and additional info
  notes: z.string().optional(),
  customerNotes: z.string().optional(),
  customFields: z.record(z.any()).optional(),
  
  // Nested structures (in case Bookly sends structured data)
  customer: z.object({
    email: z.string().email().optional(),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    fullName: z.string().optional(),
    phone: z.string().optional(),
    notes: z.string().optional(),
  }).optional(),
  
  appointment: z.object({
    date: z.string().optional(),
    time: z.string().optional(),
    startDate: z.string().optional(),
    startTime: z.string().optional(),
    location: z.string().optional(),
    duration: z.string().optional(),
  }).optional(),
  
  service: z.object({
    name: z.string().optional(),
    type: z.string().optional(),
    duration: z.string().optional(),
    price: z.union([z.string(), z.number()]).optional(),
  }).optional(),
  
  // Optional agreement creation
  templateId: z.string().optional(),
  
  // Bookly service extras. May arrive as a raw JSON string (e.g. '{"2":1}')
  // or as an already-parsed object. Keys are extra IDs, values are quantities.
  extras: z
    .union([z.string(), z.record(z.union([z.string(), z.number()]))])
    .optional()
    .nullable(),

  // Webhook signature (optional)
  signature: z.string().optional(),
}).refine(
  (data) => {
    // Email must be present either at root level or in customer object
    return data.email || data.customer?.email;
  },
  {
    message: 'Email is required (either at root level or in customer object)',
  }
);

// Helper function to verify webhook signature (optional)
function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  secret: string | undefined
): boolean {
  if (!secret) {
    // No secret configured — allow requests (for testing/optional security)
    return true;
  }

  if (!signature) {
    return false;
  }

  try {
    const hmac = createHmac('sha256', secret);
    hmac.update(payload);
    const expectedSignature = hmac.digest('hex');
    
    // Support both hex and base64 signatures
    return (
      signature === expectedSignature ||
      signature === Buffer.from(expectedSignature, 'hex').toString('base64')
    );
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    return false;
  }
}

// Helper function to split full name into first and last name
// For whitelabel clients, detects company names and splits at the boundary
// e.g., "Nonstop Entertainment Anthony Di Principe" -> firstName: "Nonstop Entertainment", lastName: "Anthony Di Principe"
function splitName(fullName: string | undefined): { firstName: string; lastName: string } {
  if (!fullName) {
    return { firstName: '', lastName: '' };
  }
  
  const trimmedName = fullName.trim();
  const parts = trimmedName.split(/\s+/);
  
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  
  // Company keywords that indicate where to split (company name ends after this word)
  // Case-insensitive matching
  const companyKeywords = [
    'entertainment', 'productions', 'events', 'studios', 'studio',
    'photography', 'photo', 'photos', 'dj', 'djs', 'booth', 'booths',
    'media', 'creative', 'creatives', 'services', 'solutions',
    'llc', 'inc', 'corp', 'corporation', 'company', 'co', 'ltd', 'group',
    'enterprises', 'agency', 'collective', 'unlimited', 'pros', 'pro'
  ];
  
  // Look for company keyword in the name parts
  let splitIndex = -1;
  for (let i = 0; i < parts.length; i++) {
    const partLower = parts[i].toLowerCase();
    // Remove trailing punctuation for matching
    const partClean = partLower.replace(/[.,]$/, '');
    
    if (companyKeywords.includes(partClean)) {
      splitIndex = i;
      // Don't break - we want the LAST company keyword found
      // In case of "ABC Entertainment LLC John Doe", we want to split after "LLC"
    }
  }
  
  // If we found a company keyword, split there
  if (splitIndex >= 0 && splitIndex < parts.length - 1) {
    const firstName = parts.slice(0, splitIndex + 1).join(' ');
    const lastName = parts.slice(splitIndex + 1).join(' ');
    return { firstName, lastName };
  }
  
  // Fallback: traditional split (last word is last name)
  const lastName = parts.pop() || '';
  const firstName = parts.join(' ');
  return { firstName, lastName };
}

// Helper function to parse date string
function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  
  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

// Detect whether the Bookly "Unlimited Prints" extra is selected in the
// incoming webhook's `extras` payload. The extra ID is configurable via
// BOOKLY_UNLIMITED_PRINTS_EXTRA_ID (defaults to "2"). Accepts either a raw
// JSON string or an already-parsed object. Returns false for any null/empty/
// malformed input so a bad extras blob never blocks event creation.
function hasUnlimitedPrintsExtra(
  extras: string | Record<string, string | number> | null | undefined
): boolean {
  if (extras === null || extras === undefined) return false;

  let parsed: unknown = extras;
  if (typeof extras === 'string') {
    const trimmed = extras.trim();
    if (trimmed === '' || trimmed === '[]' || trimmed === '{}') return false;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      return false;
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return false;
  }

  const extraId = (process.env.BOOKLY_UNLIMITED_PRINTS_EXTRA_ID || '2').trim();
  const raw = (parsed as Record<string, unknown>)[extraId];
  if (raw === undefined || raw === null) return false;

  const quantity = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(quantity) && quantity >= 1;
}

// Helper function to parse price
function parsePrice(price: string | number | undefined): number | null {
  if (price === undefined || price === null) return null;
  
  if (typeof price === 'number') {
    return price;
  }
  
  // Remove currency symbols and parse
  const cleaned = String(price).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

// Map Bookly data to Client model fields
function mapBooklyToClient(data: z.infer<typeof booklyWebhookSchema>) {
  // Extract email (priority: root > customer object)
  const email = data.email || data.customer?.email || '';
  
  // Extract name fields
  let firstName = data.firstName || data.customer?.firstName || '';
  let lastName = data.lastName || data.customer?.lastName || '';
  
  // If full name provided and firstName/lastName missing, split it
  if ((!firstName && !lastName) && (data.fullName || data.customer?.fullName)) {
    const split = splitName(data.fullName || data.customer?.fullName);
    firstName = split.firstName;
    lastName = split.lastName;
  }
  
  // Extract phone
  const phone = data.phone || data.customer?.phone || null;
  
  // Extract date/time (try multiple field names)
  const bookingDateStr = data.bookingDate || data.appointmentDate || 
                        data.appointment?.date || data.appointment?.startDate || null;
  const bookingTimeStr = data.bookingTime || data.appointmentTime || 
                        data.appointment?.time || data.appointment?.startTime || null;
  
  // Extract service/event info
  const eventType = data.serviceName || data.serviceType || data.eventType || 
                   data.service?.name || data.service?.type || null;
  const eventPackage = data.eventPackage || null;
  
  // Extract location
  const eventLocation = data.location || data.eventLocation || data.address ||
                       data.appointment?.location || null;
  
  // Extract duration
  const eventDuration = data.duration || data.eventDuration || 
                       data.appointment?.duration || data.service?.duration || null;
  
  // Extract price
  const price = parsePrice(data.price || data.packagePrice || data.service?.price);
  
  // Extract notes
  const notes = data.notes || data.customerNotes || data.customer?.notes || null;
  
  // Combine date and time if both provided
  let eventDate: Date | null = null;
  if (bookingDateStr) {
    if (bookingTimeStr) {
      // Try to combine date and time
      const combined = `${bookingDateStr}T${bookingTimeStr}`;
      eventDate = parseDate(combined) || parseDate(bookingDateStr);
    } else {
      eventDate = parseDate(bookingDateStr);
    }
  }
  
  return {
    email: email.toLowerCase().trim(),
    firstName: firstName.trim() || 'Customer',
    lastName: lastName.trim() || '',
    phone,
    eventDate,
    eventStartTime: bookingTimeStr || null,
    eventType,
    eventPackage,
    eventLocation,
    eventDuration,
    packagePrice: price,
    notes,
  };
}

// GET handler - returns endpoint information (helpful for testing/verification)
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Bookly Webhook Endpoint',
    endpoint: '/api/agreements/bookly-webhook',
    method: 'POST',
    description: 'This endpoint receives booking data from Bookly WordPress plugin',
    status: 'active',
    requiredFields: {
      email: 'string (required) - Customer email address'
    },
    optionalFields: {
      firstName: 'string - Customer first name',
      lastName: 'string - Customer last name',
      phone: 'string - Customer phone number',
      bookingDate: 'string - Booking/appointment date',
      bookingTime: 'string - Booking/appointment time',
      serviceName: 'string - Service name',
      location: 'string - Booking location',
      duration: 'string - Service duration',
      price: 'number - Service price',
      notes: 'string - Additional notes'
    },
    examplePayload: {
      email: 'customer@example.com',
      firstName: 'John',
      lastName: 'Doe',
      bookingDate: '2024-01-15',
      bookingTime: '10:00',
      serviceName: 'Photography Session'
    },
    note: 'This endpoint only accepts POST requests. Use POST method to send booking data.'
  }, { status: 200 });
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  let rawBody = '';
  
  try {
    // Get raw body for signature verification
    rawBody = await request.text();
    
    // Log incoming request for debugging
    devLog('📥 Bookly webhook received - Headers:', {
      'content-type': request.headers.get('content-type'),
      'user-agent': request.headers.get('user-agent'),
      'x-bookly-signature': request.headers.get('x-bookly-signature'),
      bodyLength: rawBody.length,
    });
    
    let payload: any;
    
    try {
      payload = JSON.parse(rawBody);
      devLog('📥 Bookly webhook payload received:', {
        hasEmail: !!payload.email,
        hasCustomer: !!payload.customer,
        keys: Object.keys(payload),
        payloadPreview: JSON.stringify(payload).substring(0, 500),
      });
    } catch (error) {
      console.error('❌ Invalid JSON payload:', error);
      console.error('❌ Raw body:', rawBody.substring(0, 500));
      return NextResponse.json(
        { error: 'Invalid JSON payload', details: error instanceof Error ? error.message : 'Unknown error' },
        { status: 400 }
      );
    }

    // Optional webhook signature verification — fail closed when secret is not configured
    const webhookSecret = process.env.BOOKLY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      console.error('BOOKLY_WEBHOOK_SECRET is not configured; rejecting Bookly webhook request');
      return NextResponse.json(
        { error: 'Webhook authentication is not configured' },
        { status: 503 },
      );
    }

    const signature = request.headers.get('x-bookly-signature') || 
                     request.headers.get('x-signature') ||
                     payload.signature || null;
    
    const isValid = verifyWebhookSignature(rawBody, signature, webhookSecret);
    if (!isValid) {
      console.error('Invalid or missing webhook signature');
      return NextResponse.json(
        { error: signature ? 'Invalid webhook signature' : 'Missing webhook signature' },
        { status: 401 }
      );
    }

    // Validate payload
    const validatedData = booklyWebhookSchema.parse(payload);

    devLog('📥 Bookly webhook received:', {
      email: validatedData.email || validatedData.customer?.email,
      hasAppointment: !!validatedData.appointment,
      hasService: !!validatedData.service,
    });

    // Map Bookly data to Client model
    const clientData = mapBooklyToClient(validatedData);

    if (!clientData.email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Upsert client (create or update by email)
    // Don't update event fields on client - those go to Event model
    const client = await prisma.client.upsert({
      where: { email: clientData.email },
      update: {
        // Update client info only, preserve existing non-null fields if new ones are null
        firstName: clientData.firstName || undefined,
        lastName: clientData.lastName || undefined,
        phone: clientData.phone || undefined,
        notes: clientData.notes || undefined,
      },
      create: {
        email: clientData.email,
        firstName: clientData.firstName,
        lastName: clientData.lastName,
        phone: clientData.phone,
        notes: clientData.notes,
      },
    });

    devLog(`✅ Client ${client.id} ${client.createdAt === client.updatedAt ? 'created' : 'updated'}:`, client.email);

    // Create Event record for this booking
    // Only create if there's event data provided
    if (clientData.eventDate || clientData.eventType || clientData.eventLocation || 
        clientData.eventStartTime || clientData.eventDuration || 
        clientData.eventPackage || clientData.packagePrice !== null) {
      const event = await prisma.event.create({
        data: {
          clientId: client.id,
          eventDate: clientData.eventDate || null,
          eventType: clientData.eventType || null,
          eventLocation: clientData.eventLocation || null,
          eventStartTime: clientData.eventStartTime || null,
          eventDuration: clientData.eventDuration || null,
          eventPackage: clientData.eventPackage || null,
          packagePrice: clientData.packagePrice !== null ? clientData.packagePrice : null,
          notes: clientData.notes || null,
          unlimitedPrints: hasUnlimitedPrintsExtra(validatedData.extras),
          archived: false,
        },
      });
      devLog(`✅ Event ${event.id} created for client ${client.email}`);
    }

    // Optional: Create agreement automatically
    const templateId = validatedData.templateId || process.env.BOOKLY_DEFAULT_TEMPLATE_ID;
    let agreement = null;

    if (templateId) {
      try {
        // Verify template exists
        const template = await prisma.template.findUnique({
          where: { id: templateId },
        });

        if (!template) {
          console.warn(`⚠️ Template ${templateId} not found, skipping agreement creation`);
        } else {
          // Generate unique token for agreement
          const uniqueToken = randomBytes(32).toString('hex');

          agreement = await prisma.agreement.create({
            data: {
              clientId: client.id,
              templateId: templateId,
              uniqueToken,
              status: 'DRAFT',
              expiresAt: null,
              customHtmlContent: template.htmlContent, // Copy template content to agreement
            },
            include: {
              client: true,
              template: true,
            },
          });

          if (agreement) {
            devLog(`✅ Agreement ${agreement.id} created for client ${client.email}`);
          }
        }
      } catch (error) {
        // Log error but don't fail the webhook - client was created successfully
        console.error('Error creating agreement:', error);
      }
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Booking data processed successfully',
      client: {
        id: client.id,
        email: client.email,
        firstName: client.firstName,
        lastName: client.lastName,
      },
      ...(agreement ? {
        agreement: {
          id: agreement.id,
          status: agreement.status,
          uniqueToken: agreement.uniqueToken,
        },
      } : {}),
    }, { status: 200 });

  } catch (error: any) {
    console.error('❌ Error processing Bookly webhook:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    // Handle Prisma errors
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Duplicate email constraint violation' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to process booking data',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

