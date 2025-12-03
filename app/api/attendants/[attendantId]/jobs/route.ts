import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ attendantId: string }> }
) {
  try {
    const { attendantId } = await params;

    if (!attendantId) {
      return NextResponse.json(
        { error: 'attendantId is required' },
        { status: 400 }
      );
    }

    // Find all BackdropLinks where URL contains the attendantId
    // Pattern: /select/[attendantId] or similar
    const backdropLinks = await prisma.backdropLink.findMany({
      where: {
        OR: [
          { url: { contains: `/select/${attendantId}` } },
          { url: { contains: `attendantId=${attendantId}` } },
          // Also check for URL-encoded versions
          { url: { contains: encodeURIComponent(`/select/${attendantId}`) } },
          { url: { contains: encodeURIComponent(`attendantId=${attendantId}`) } },
        ],
      },
      select: {
        id: true,
      },
    });

    const backdropLinkIds = backdropLinks.map((link) => link.id);

    if (backdropLinkIds.length === 0) {
      return NextResponse.json({
        success: true,
        jobs: [],
        metrics: {
          totalJobs: 0,
          upcomingEvents: 0,
          completedEvents: 0,
        },
      });
    }

    // Find all Agreements that reference those BackdropLinks
    const agreements = await prisma.agreement.findMany({
      where: {
        backdropLinkId: { in: backdropLinkIds },
        archived: false, // Only show non-archived agreements
      },
      select: {
        id: true,
        status: true,
        selectedBackdropName: true,
        client: {
          select: {
            firstName: true,
            lastName: true,
            eventDate: true, // Deprecated but fallback
            eventLocation: true,
            eventStartTime: true,
            eventType: true,
            isWhitelabelClient: true,
          },
        },
        event: {
          select: {
            eventDate: true,
            eventLocation: true,
            eventStartTime: true,
            eventType: true,
            eventName: true,
          },
        },
        backdropLink: {
          select: {
            name: true,
          },
        },
      },
    });

    // Format jobs and calculate metrics
    const now = new Date();
    const jobs = agreements.map((agreement) => {
      const eventDate = agreement.event?.eventDate || agreement.client.eventDate;
      const eventLocation = agreement.event?.eventLocation || agreement.client.eventLocation;
      const eventStartTime = agreement.event?.eventStartTime || agreement.client.eventStartTime;
      const eventType = agreement.event?.eventType || agreement.client.eventType;
      const clientName = agreement.event?.eventName || `${agreement.client.firstName} ${agreement.client.lastName}`.trim();

      // Determine if event is upcoming or completed
      let isUpcoming = false;
      let isCompleted = false;
      
      if (eventDate) {
        const eventDateTime = new Date(eventDate);
        // Add 24 hours to event date to account for expiration window
        const expirationTime = new Date(eventDateTime);
        expirationTime.setHours(expirationTime.getHours() + 24);
        
        if (now < expirationTime) {
          isUpcoming = true;
        } else {
          isCompleted = true;
        }
      } else {
        // If no event date, consider it upcoming if status is not COMPLETED
        isUpcoming = agreement.status !== 'COMPLETED' && agreement.status !== 'CANCELLED';
        isCompleted = agreement.status === 'COMPLETED' || agreement.status === 'CANCELLED';
      }

      return {
        id: agreement.id,
        status: agreement.status,
        eventDate: eventDate ? new Date(eventDate).toISOString() : null,
        eventLocation,
        eventStartTime,
        eventType,
        clientName,
        backdropSelected: !!agreement.selectedBackdropName,
        backdropName: agreement.selectedBackdropName || null,
        backdropLinkName: agreement.backdropLink?.name || null,
        isUpcoming,
        isCompleted,
      };
    });

    // Sort by event date (upcoming first, then by date ascending)
    jobs.sort((a, b) => {
      // Upcoming events first
      if (a.isUpcoming && !b.isUpcoming) return -1;
      if (!a.isUpcoming && b.isUpcoming) return 1;
      
      // Then sort by date
      if (a.eventDate && b.eventDate) {
        return new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime();
      }
      if (a.eventDate) return -1;
      if (b.eventDate) return 1;
      
      return 0;
    });

    // Calculate metrics
    const metrics = {
      totalJobs: jobs.length,
      upcomingEvents: jobs.filter((job) => job.isUpcoming).length,
      completedEvents: jobs.filter((job) => job.isCompleted).length,
    };

    return NextResponse.json({
      success: true,
      jobs,
      metrics,
    });
  } catch (error: any) {
    console.error('Error fetching attendant jobs:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch attendant jobs',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

