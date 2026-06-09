import { prisma } from '@/lib/prisma';
import { escapeHtml } from '@/lib/htmlEscape';
import { SessionWithClient } from './auth';
import { applySignerSmartFields, type SecondSigner } from '@/lib/agreementSmartFields';

/**
 * Verify that an agreement belongs to a client (by email)
 */
export async function verifyAgreementOwnership(
  agreementId: string,
  clientEmail: string
): Promise<{ valid: true; agreement: any } | { valid: false; error: string }> {
  const agreement = await prisma.agreement.findFirst({
    where: {
      id: agreementId,
      client: {
        email: clientEmail.toLowerCase(),
      },
      archived: false,
    },
    include: {
      template: true,
      signatures: { orderBy: { signedAt: 'asc' } },
    },
  });

  if (!agreement) {
    return {
      valid: false,
      error: 'Agreement not found or does not belong to this client',
    };
  }

  return { valid: true, agreement };
}

/**
 * Get client's agreements with filters (by email)
 */
export async function getClientAgreements(
  clientEmail: string,
  options: {
    status?: string;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    page?: number;
    limit?: number;
    archived?: boolean;
  } = {}
) {
  const {
    status,
    search,
    sortBy = 'createdAt',
    sortOrder = 'desc',
    page = 1,
    limit = 10,
    archived = false,
  } = options;

  const offset = (page - 1) * limit;

  // Build where clause
  const whereClause: any = {
    client: {
      email: clientEmail.toLowerCase(),
    },
    archived,
  };

  // Add status filter
  if (status && status !== 'all') {
    whereClause.status = status;
  }

  // Add search filter
  if (search) {
    whereClause.OR = [
      {
        template: {
          title: {
            contains: search,
            mode: 'insensitive' as const,
          },
        },
      },
      {
        template: {
          internalTitle: {
            contains: search,
            mode: 'insensitive' as const,
          },
        },
      },
    ];
  }

  // Build orderBy clause
  const orderBy: any = {};
  if (sortBy === 'template') {
    orderBy.template = { title: sortOrder };
  } else if (sortBy === 'status') {
    orderBy.status = sortOrder;
  } else {
    orderBy[sortBy] = sortOrder;
  }

  // Get total count for pagination
  const totalCount = await prisma.agreement.count({
    where: whereClause,
  });

  // Get agreements with pagination
  const agreements = await prisma.agreement.findMany({
    where: whereClause,
    include: {
      template: true,
      signatures: { orderBy: { signedAt: 'asc' } },
    },
    orderBy,
    skip: offset,
    take: limit,
  });

  return {
    agreements,
    pagination: {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      hasNext: page < Math.ceil(totalCount / limit),
      hasPrev: page > 1,
    },
  };
}

export interface ProcessHtmlContentOptions {
  /** When true (default), substituted values are HTML-escaped before interpolation. */
  escapeValues?: boolean;
}

/**
 * Process HTML content by replacing template variables.
 *
 * The optional `secondSigner` parameter lets templates auto-expand client
 * name tokens to include both signers when a second signer is configured
 * on the agreement (see `lib/agreementSmartFields.ts`).
 */
export function processHtmlContent(
  html: string,
  client: any,
  agreementId: string,
  event: any = null,
  secondSigner: SecondSigner | null = null,
  options: ProcessHtmlContentOptions = {},
): string {
  if (!html || !client) return html;

  const { escapeValues = true } = options;
  const esc = (value: string) => (escapeValues ? escapeHtml(value) : value);

  // Signer / client name tokens are handled by the shared helper so behaviour
  // stays consistent across every render path. We run it first so combined
  // patterns like `{{client.firstName}} {{client.lastName}}` resolve cleanly.
  let processedHtml = applySignerSmartFields(html, client, secondSigner, { escapeValues });

  // Extract address and notes from event if available, otherwise use client data
  const address = event ? (event.eventLocation ?? '') : (client.address || '');
  const notes = event ? (event.notes ?? '') : (client.notes || '');

  processedHtml = processedHtml.replace(/\{\{client\.address\}\}/g, esc(address));
  processedHtml = processedHtml.replace(/\{\{client\.notes\}\}/g, esc(notes));

  // Use event data exclusively when event exists, otherwise fall back to client event fields (backward compatibility)
  const eventDate = event ? event.eventDate : client.eventDate;
  const eventType = event ? (event.eventType ?? '') : (client.eventType || '');
  const eventLocation = event ? (event.eventLocation ?? '') : (client.eventLocation || '');
  const eventStartTime = event ? (event.eventStartTime ?? '') : (client.eventStartTime || '');
  const eventDuration = event ? (event.eventDuration ?? '') : (client.eventDuration || '');
  const eventPackage = event ? (event.eventPackage ?? '') : (client.eventPackage || '');
  const packagePrice = event ? event.packagePrice : client.packagePrice;

  // Replace event fields - use event data if available, otherwise client fields
  processedHtml = processedHtml.replace(
    /\{\{client\.eventDate\}\}/g,
    esc(eventDate ? new Date(eventDate).toLocaleDateString() : ''),
  );
  processedHtml = processedHtml.replace(/\{\{event\.type\}\}/g, esc(eventType));
  processedHtml = processedHtml.replace(/\{\{event\.location\}\}/g, esc(eventLocation));
  processedHtml = processedHtml.replace(/\{\{event\.startTime\}\}/g, esc(eventStartTime));
  processedHtml = processedHtml.replace(/\{\{event\.duration\}\}/g, esc(eventDuration));
  processedHtml = processedHtml.replace(/\{\{event\.package\}\}/g, esc(eventPackage));
  processedHtml = processedHtml.replace(
    /\{\{event\.price\}\}/g,
    esc(packagePrice ? `$${Number(packagePrice).toFixed(2)}` : ''),
  );

  // Replace agreement fields
  processedHtml = processedHtml.replace(/\{\{agreement\.date\}\}/g, esc(new Date().toLocaleDateString()));
  processedHtml = processedHtml.replace(/\{\{agreement\.id\}\}/g, esc(agreementId || ''));

  return processedHtml;
}

