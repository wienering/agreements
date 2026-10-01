/**
 * Pure Bookly webhook payload → client/event field mapping.
 * Kept free of Prisma / Next so it can be unit-tested in isolation.
 */

export type BooklyWebhookPayload = {
  email?: string;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  phone?: string;
  bookingDate?: string;
  bookingTime?: string;
  appointmentDate?: string;
  appointmentTime?: string;
  serviceName?: string;
  serviceType?: string;
  eventType?: string;
  eventPackage?: string;
  location?: string;
  eventLocation?: string;
  address?: string;
  duration?: string;
  eventDuration?: string;
  price?: string | number;
  packagePrice?: string | number;
  notes?: string;
  customerNotes?: string;
  customFields?: Record<string, unknown>;
  customer?: {
    email?: string;
    firstName?: string;
    lastName?: string;
    fullName?: string;
    phone?: string;
    notes?: string;
  };
  appointment?: {
    date?: string;
    time?: string;
    startDate?: string;
    startTime?: string;
    location?: string;
    duration?: string;
  };
  service?: {
    name?: string;
    type?: string;
    duration?: string;
    price?: string | number;
  };
  templateId?: string;
  extras?: string | Record<string, string | number> | null;
  signature?: string;
};

export type MappedBooklyClient = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  eventDate: Date | null;
  eventStartTime: string | null;
  eventType: string | null;
  eventPackage: string | null;
  eventLocation: string | null;
  eventDuration: string | null;
  packagePrice: number | null;
  notes: string | null;
};

/** Split full name into first/last, with company-keyword boundary detection. */
export function splitName(fullName: string | undefined): { firstName: string; lastName: string } {
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
    'enterprises', 'agency', 'collective', 'unlimited', 'pros', 'pro',
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

export function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;

  try {
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? null : date;
  } catch {
    return null;
  }
}

/**
 * Detect whether the Bookly "Unlimited Prints" extra is selected in the
 * incoming webhook's `extras` payload. The extra ID is configurable via
 * BOOKLY_UNLIMITED_PRINTS_EXTRA_ID (defaults to "2"). Accepts either a raw
 * JSON string or an already-parsed object. Returns false for any null/empty/
 * malformed input so a bad extras blob never blocks event creation.
 */
export function hasUnlimitedPrintsExtra(
  extras: string | Record<string, string | number> | null | undefined,
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

export function parsePrice(price: string | number | undefined): number | null {
  if (price === undefined || price === null) return null;

  if (typeof price === 'number') {
    return price;
  }

  // Remove currency symbols and parse
  const cleaned = String(price).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

/** Map Bookly webhook data to Client / Event model fields. */
export function mapBooklyToClient(data: BooklyWebhookPayload): MappedBooklyClient {
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
  const bookingDateStr =
    data.bookingDate ||
    data.appointmentDate ||
    data.appointment?.date ||
    data.appointment?.startDate ||
    null;
  const bookingTimeStr =
    data.bookingTime ||
    data.appointmentTime ||
    data.appointment?.time ||
    data.appointment?.startTime ||
    null;

  // Extract service/event info
  const eventType =
    data.serviceName ||
    data.serviceType ||
    data.eventType ||
    data.service?.name ||
    data.service?.type ||
    null;
  const eventPackage = data.eventPackage || null;

  // Extract location
  const eventLocation =
    data.location || data.eventLocation || data.address || data.appointment?.location || null;

  // Extract duration
  const eventDuration =
    data.duration ||
    data.eventDuration ||
    data.appointment?.duration ||
    data.service?.duration ||
    null;

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
