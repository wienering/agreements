import { prisma } from '@/lib/prisma';
import { SessionWithClient } from './auth';

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
      signature: true,
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
      signature: true,
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

/**
 * Process HTML content by replacing template variables
 */
export function processHtmlContent(html: string, client: any, agreementId: string): string {
  let processedHtml = html;

  // Replace client fields
  processedHtml = processedHtml.replace(/\{\{client\.firstName\}\}/g, client.firstName || '');
  processedHtml = processedHtml.replace(/\{\{client\.lastName\}\}/g, client.lastName || '');
  processedHtml = processedHtml.replace(/\{\{client\.email\}\}/g, client.email || '');
  processedHtml = processedHtml.replace(/\{\{client\.phone\}\}/g, client.phone || '');
  processedHtml = processedHtml.replace(/\{\{client\.address\}\}/g, client.address || '');
  processedHtml = processedHtml.replace(
    /\{\{client\.eventDate\}\}/g,
    client.eventDate ? new Date(client.eventDate).toLocaleDateString() : ''
  );
  processedHtml = processedHtml.replace(/\{\{client\.notes\}\}/g, client.notes || '');

  // Replace event fields
  processedHtml = processedHtml.replace(/\{\{event\.type\}\}/g, client.eventType || '');
  processedHtml = processedHtml.replace(/\{\{event\.location\}\}/g, client.eventLocation || '');
  processedHtml = processedHtml.replace(/\{\{event\.startTime\}\}/g, client.eventStartTime || '');
  processedHtml = processedHtml.replace(/\{\{event\.duration\}\}/g, client.eventDuration || '');
  processedHtml = processedHtml.replace(/\{\{event\.package\}\}/g, client.eventPackage || '');
  processedHtml = processedHtml.replace(
    /\{\{event\.price\}\}/g,
    client.packagePrice ? `$${Number(client.packagePrice).toFixed(2)}` : ''
  );

  // Replace agreement fields
  processedHtml = processedHtml.replace(/\{\{agreement\.date\}\}/g, new Date().toLocaleDateString());
  processedHtml = processedHtml.replace(/\{\{agreement\.id\}\}/g, agreementId || '');

  return processedHtml;
}

