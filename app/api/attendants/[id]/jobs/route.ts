import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

async function fetchJobsForAttendantIds(attendantIds: string[]) {
  // Find all BackdropLinks where URL contains any of the attendantIds
  const backdropLinkConditions = attendantIds.flatMap((attendantId) => {
    const encodedAttendantId = encodeURIComponent(attendantId);
    return [
      { url: { contains: `/select/${attendantId}` } },
      { url: { contains: `attendantId=${attendantId}` } },
      { url: { contains: `/select/${encodedAttendantId}` } },
      { url: { contains: `attendantId=${encodedAttendantId}` } },
    ];
  });

  const backdropLinks = await prisma.backdropLink.findMany({
    where: {
      OR: backdropLinkConditions,
    },
    select: {
      id: true,
    },
  });

  return backdropLinks.map((link) => link.id);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: attendantIdOrSlug } = await params;

    if (!attendantIdOrSlug) {
      return NextResponse.json(
        { error: 'attendantId or group slug is required' },
        { status: 400 }
      );
    }

    // First, check if this matches a group slug
    let attendantIds: string[] = [];
    let groupName: string | undefined;

    const group = await prisma.attendantGroup.findUnique({
      where: { slug: attendantIdOrSlug },
    });

    if (group) {
      // It's a group - fetch jobs for all attendant IDs in the group
      attendantIds = group.attendantIds;
      groupName = group.name;
    } else {
      // Treat as single attendant ID
      attendantIds = [attendantIdOrSlug];
    }

    const backdropLinkIds = await fetchJobsForAttendantIds(attendantIds);

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
    // Exclude completed and cancelled agreements
    const agreements = await prisma.agreement.findMany({
      where: {
        backdropLinkId: { in: backdropLinkIds },
        archived: false,
        status: {
          notIn: ['COMPLETED', 'CANCELLED'],
        },
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

    // Format jobs and filter out completed ones
    const now = new Date();
    const jobs = agreements
      .map((agreement) => {
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
      })
      .filter((job) => !job.isCompleted); // Filter out completed jobs

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

    // Calculate metrics (only for non-completed jobs)
    const metrics = {
      totalJobs: jobs.length,
      upcomingEvents: jobs.filter((job) => job.isUpcoming).length,
      completedEvents: 0, // Completed jobs are no longer shown
    };

    return NextResponse.json({
      success: true,
      jobs,
      metrics,
      groupName: groupName || null,
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

