import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateBackdropSelectionSchema = z.object({
  agreementId: z.string().optional(), // If provided, use this directly
  clientEmail: z.string().email('Invalid email address').optional(),
  clientName: z.string().optional(),
  eventDate: z.string().optional(),
  backdropName: z.string().optional(), // Allow empty string to clear selection
}).refine(
  (data) => data.agreementId || (data.clientEmail && data.clientName && data.eventDate),
  {
    message: "Either agreementId must be provided, or clientEmail, clientName, and eventDate must all be provided",
    path: ["agreementId"]
  }
);

export async function POST(request: NextRequest) {
  try {

    await requireAdmin();
    const body = await request.json();
    const validatedData = updateBackdropSelectionSchema.parse(body);

    let updatedCount = 0;
    const updatedAgreementIds: string[] = [];

    // If agreementId is provided, use it directly (preferred method)
    if (validatedData.agreementId) {
      // Verify the agreement exists and is not archived
      const agreement = await prisma.agreement.findFirst({
        where: {
          id: validatedData.agreementId,
          archived: false,
        },
      });

      if (!agreement) {
        return NextResponse.json({
          success: false,
          message: 'Agreement not found or is archived',
          updatedCount: 0,
        }, { status: 404 });
      }

      // Update the specific agreement (allow null/empty to clear selection)
      await prisma.agreement.update({
        where: {
          id: validatedData.agreementId,
        },
        data: {
          selectedBackdropName: validatedData.backdropName || null,
        },
      });

      updatedCount = 1;
      updatedAgreementIds.push(validatedData.agreementId);

      return NextResponse.json({
        success: true,
        message: `Updated agreement with backdrop selection`,
        updatedCount,
        updatedAgreementIds,
      });
    }

    // Fallback to old matching method if agreementId not provided
    if (!validatedData.clientEmail || !validatedData.clientName || !validatedData.eventDate) {
      return NextResponse.json({
        success: false,
        message: 'Either agreementId must be provided, or clientEmail, clientName, and eventDate must all be provided',
        updatedCount: 0,
      }, { status: 400 });
    }

    // Parse event date from the submission
    const submissionEventDate = new Date(validatedData.eventDate);
    const submissionDateOnly = new Date(
      submissionEventDate.getFullYear(),
      submissionEventDate.getMonth(),
      submissionEventDate.getDate()
    );

    // Step 1: Find clients by email (case-insensitive)
    const clients = await prisma.client.findMany({
      where: {
        email: {
          equals: validatedData.clientEmail,
          mode: 'insensitive',
        },
      },
      include: {
        agreements: {
          where: {
            archived: false, // Only update non-archived agreements
          },
          include: {
            event: true, // Include event data for matching
          },
        },
      },
    });

    if (clients.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'No matching clients found',
        updatedCount: 0,
      });
    }

    // Step 2: For each matching client, find and update agreements
    for (const client of clients) {
      // Normalize client name for comparison
      const clientFullName = `${client.firstName} ${client.lastName}`.trim().toLowerCase();
      const submissionName = validatedData.clientName.trim().toLowerCase();

      // Filter agreements based on matching criteria
      const matchingAgreements = client.agreements.filter((agreement) => {
        // First, try to match by event date from the Event model (for whitelabel clients)
        if (agreement.event?.eventDate) {
          const eventDate = new Date(agreement.event.eventDate);
          const eventDateOnly = new Date(
            eventDate.getFullYear(),
            eventDate.getMonth(),
            eventDate.getDate()
          );

          // Match by event date (same day)
          if (eventDateOnly.getTime() === submissionDateOnly.getTime()) {
            return true;
          }
        }

        // If client has eventDate (deprecated, but still check for backward compatibility)
        if (client.eventDate) {
          const clientEventDate = new Date(client.eventDate);
          const clientDateOnly = new Date(
            clientEventDate.getFullYear(),
            clientEventDate.getMonth(),
            clientEventDate.getDate()
          );

          // Match by event date (same day)
          if (clientDateOnly.getTime() === submissionDateOnly.getTime()) {
            return true;
          }
        }

        // If eventDate doesn't match or doesn't exist, try matching by client name
        if (clientFullName === submissionName) {
          return true;
        }

        return false;
      });

      // Step 3: Update matching agreements with selectedBackdropName
      if (matchingAgreements.length > 0) {
        const agreementIds = matchingAgreements.map((agreement) => agreement.id);

        const result = await prisma.agreement.updateMany({
          where: {
            id: {
              in: agreementIds,
            },
          },
          data: {
            selectedBackdropName: validatedData.backdropName || null,
          },
        });

        updatedCount += result.count;
        updatedAgreementIds.push(...agreementIds);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Updated ${updatedCount} agreement(s) with backdrop selection`,
      updatedCount,
      updatedAgreementIds,
    });
  } catch (error: any) {
    console.error('Error updating backdrop selection:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 }
      );
    }
    return NextResponse.json(
      {
        error: 'Failed to update backdrop selection',
        message: error.message,
      },
      { status: 500 }
    );
  }
}



