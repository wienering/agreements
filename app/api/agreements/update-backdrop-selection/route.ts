import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updateBackdropSelectionSchema = z.object({
  clientEmail: z.string().email('Invalid email address'),
  clientName: z.string().min(1, 'Client name is required'),
  eventDate: z.string().min(1, 'Event date is required'),
  backdropName: z.string().min(1, 'Backdrop name is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = updateBackdropSelectionSchema.parse(body);

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

    let updatedCount = 0;
    const updatedAgreementIds: string[] = [];

    // Step 2: For each matching client, find and update agreements
    for (const client of clients) {
      // Normalize client name for comparison
      const clientFullName = `${client.firstName} ${client.lastName}`.trim().toLowerCase();
      const submissionName = validatedData.clientName.trim().toLowerCase();

      // Filter agreements based on matching criteria
      const matchingAgreements = client.agreements.filter((agreement) => {
        // If client has eventDate, check if it matches submission eventDate (same day)
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
            selectedBackdropName: validatedData.backdropName,
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



