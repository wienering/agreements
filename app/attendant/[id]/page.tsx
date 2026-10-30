import { prisma } from '@/lib/prisma';
import { getBackdropThumbnailUrl } from '@/lib/backdropThumbnail';
import { Metadata } from 'next';
import Link from 'next/link';
import { AttendantUnavailable } from '../../components/attendant/AttendantUnavailable';
import { BackdropSection } from '../../components/attendant/BackdropSection';
import { BrandMark } from '../../components/attendant/BrandMark';
import { FilesSection, type AttendantFile } from '../../components/attendant/FilesSection';
import { SummaryField, SummaryText } from '../../components/attendant/SummaryField';
import { formatDateToronto } from '@/lib/dates';

interface AttendantPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// Force dynamic rendering to ensure backdrop selections update immediately
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function generateMetadata({ params }: AttendantPageProps): Promise<Metadata> {
  const { id } = await params;
  
  try {
    // Fetch agreement with event date for title
    const agreement = await prisma.agreement.findUnique({
      where: { id },
      select: {
        event: {
          select: {
            eventDate: true,
          },
        },
        client: {
          select: {
            eventDate: true,
          },
        },
      },
    });

    if (!agreement) {
      return {
        title: 'Event Details Not Found',
        robots: { index: false, follow: false },
      };
    }

    // Use event data when available, otherwise fall back to client data
    const eventDate = agreement.event?.eventDate || agreement.client?.eventDate;
    
    // Format event date for title (e.g., "November 2, 2025")
    const formattedEventDate = eventDate
      ? formatDateToronto(
          eventDate,
          { year: 'numeric', month: 'long', day: 'numeric' },
          'en-US',
        )
      : null;

    const title = formattedEventDate 
      ? `Event Details - ${formattedEventDate}`
      : 'Event Details';

    return {
      title,
      robots: { index: false, follow: false },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Event Details',
      robots: { index: false, follow: false },
    };
  }
}

export default async function AttendantPage({ params, searchParams }: AttendantPageProps) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const fromGroup = resolvedSearchParams.fromGroup as string | undefined;

  try {
    // Fetch agreement with client, event, and backdropLink relations
    // Only select fields we need - don't fetch sensitive data
    const agreement = await prisma.agreement.findUnique({
      where: { id },
      select: {
        id: true,
        clientId: true,
        selectedBackdropName: true,
        eventId: true,
        showPhoneNumberAlways: true,
        forceVirtualGreenScreen: true,
        client: {
          select: {
            firstName: true,
            phone: true,
            eventDate: true,
            eventLocation: true,
            eventStartTime: true,
            eventDuration: true,
            notes: true,
            isWhitelabelClient: true,
          },
        },
        event: {
          select: {
            eventDate: true,
            eventLocation: true,
            eventStartTime: true,
            eventDuration: true,
            notes: true,
            eventName: true,
            eventPhone: true,
            unlimitedPrints: true,
          },
        },
        backdropLink: {
          select: {
            name: true,
            url: true,
          },
        },
      },
    });

    // If agreement not found, show custom error page
    if (!agreement || !agreement.client) {
      return <AttendantUnavailable variant="missing" />;
    }

    const { client, event, backdropLink, selectedBackdropName, showPhoneNumberAlways, forceVirtualGreenScreen } = agreement;
    
    // Extract attendantId from backdropLink URL for navigation back to hub
    const extractAttendantIdFromUrl = (url: string | null): string | null => {
      if (!url) return null;
      try {
        // Try to extract from path like /select/[attendantId]
        const pathMatch = url.match(/\/select\/([^/?]+)/);
        if (pathMatch && pathMatch[1]) {
          return pathMatch[1];
        }
        
        // Try to extract from query parameter
        const urlObj = new URL(url);
        const attendantIdParam = urlObj.searchParams.get('attendantId');
        if (attendantIdParam) {
          return attendantIdParam;
        }
        
        // Try to extract from path segments
        const pathSegments = urlObj.pathname.split('/').filter(Boolean);
        const selectIndex = pathSegments.indexOf('select');
        if (selectIndex !== -1 && pathSegments[selectIndex + 1]) {
          return pathSegments[selectIndex + 1];
        }
        
        return null;
      } catch (error) {
        console.error('Error extracting attendant ID from URL:', error);
        return null;
      }
    };
    
    const attendantId = backdropLink?.url ? extractAttendantIdFromUrl(backdropLink.url) : null;

    // Fetch backdrop thumbnail when we have a catalog backdrop (not Virtual Green Screen or No Backdrop)
    let backdropThumbnailUrl: string | null = null;
    if (
      attendantId &&
      selectedBackdropName &&
      selectedBackdropName !== 'No Backdrop' &&
      !forceVirtualGreenScreen
    ) {
      backdropThumbnailUrl = await getBackdropThumbnailUrl(attendantId, selectedBackdropName);
    }

    // Determine the hub link - use group slug if fromGroup parameter is present, otherwise use individual attendant ID
    const hubLink = fromGroup 
      ? `/attendants/${fromGroup}/hub`
      : attendantId 
        ? `/attendants/${attendantId}/hub`
        : null;
    
    // Use event data when available, otherwise fall back to client data
    const eventDate = event ? event.eventDate : client.eventDate;
    const eventLocation = event ? event.eventLocation : client.eventLocation;
    const eventStartTime = event ? event.eventStartTime : client.eventStartTime;
    const eventDuration = event ? event.eventDuration : client.eventDuration;
    const notes = event ? event.notes : client.notes;

    // For whitelabel clients, get event-specific contact info
    const isWhitelabelClient = client.isWhitelabelClient || false;
    const eventContactName = event?.eventName || client.firstName;
    const eventContactPhone = event?.eventPhone || client.phone;

    // Helper function to calculate event datetime
    const getEventDateTime = () => {
      if (!eventDate) return null;
      
      try {
        // Parse event date - handle timezone correctly by extracting UTC date components
        // Dates from Prisma are stored as UTC midnight, so we need to extract the UTC
        // year/month/day to get the intended calendar date, then create a local date
        let year: number, month: number, day: number;
        
        // Convert to Date object first (handles both Date objects and ISO strings)
        const dateObj = new Date(eventDate);
        if (isNaN(dateObj.getTime())) return null;
        
        // Use toISOString() to get a reliable format for parsing the intended date
        // This gives us "2025-11-28T00:00:00.000Z" format regardless of input type
        const isoString = dateObj.toISOString();
        const dateMatch = isoString.match(/(\d{4})-(\d{2})-(\d{2})/);
        
        if (dateMatch) {
          // Parse from ISO string format to get the intended calendar date
          year = parseInt(dateMatch[1], 10);
          month = parseInt(dateMatch[2], 10) - 1; // JavaScript months are 0-indexed
          day = parseInt(dateMatch[3], 10);
        } else {
          // Fallback: use UTC values to get the intended date
          year = dateObj.getUTCFullYear();
          month = dateObj.getUTCMonth();
          day = dateObj.getUTCDate();
        }
        
        // Create date in local timezone at midnight, using the intended calendar date
        let eventDateTime = new Date(year, month, day, 0, 0, 0, 0);
        
        // If eventStartTime is provided, try to parse it and add to event date
        if (eventStartTime) {
          // Parse time string (could be formats like "2:00 PM", "14:00", "2 PM", "6:30:00 PM", etc.)
          const timeStr = String(eventStartTime).trim();
          const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?/i) || 
                           timeStr.match(/(\d{1,2})\s*(AM|PM)/i);
          
          if (timeMatch) {
            let hours = parseInt(timeMatch[1], 10);
            const minutes = timeMatch[2] && !timeMatch[2].match(/AM|PM/i) ? parseInt(timeMatch[2], 10) : 0;
            const period = (timeMatch[3] || timeMatch[2])?.toUpperCase();
            
            if (period === 'PM' && hours !== 12) {
              hours += 12;
            } else if (period === 'AM' && hours === 12) {
              hours = 0;
            }
            
            eventDateTime.setHours(hours, minutes, 0, 0);
          }
        }
        
        return eventDateTime;
      } catch (error) {
        console.error('Error parsing event datetime:', error);
        return null;
      }
    };

    // Check if event has passed and is more than 24 hours ago
    const isEventExpired = (() => {
      const eventDateTime = getEventDateTime();
      if (!eventDateTime) return false;
      
      // Calculate 24 hours after event date/time
      const expirationTime = new Date(eventDateTime);
      expirationTime.setHours(expirationTime.getHours() + 24);
      
      // Check if current time is past expiration
      return new Date() > expirationTime;
    })();

    // Check if event is within 24 hours (before or after) to show phone number
    const isEventWithin24Hours = (() => {
      const eventDateTime = getEventDateTime();
      if (!eventDateTime) return false;
      
      const now = new Date();
      const hoursUntilEvent = (eventDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
      
      // Show phone if event is within 24 hours before OR up to 24 hours after
      // (Page is accessible until 24 hours after, so phone should be visible in that window too)
      return hoursUntilEvent >= -24 && hoursUntilEvent <= 24;
    })();

    // If event has expired (more than 24 hours after), show expired message
    if (isEventExpired) {
      return <AttendantUnavailable variant="expired" />;
    }

    let files: AttendantFile[] = [];
    let filesError: string | null = null;
    // Only this event's uploads; unassigned files and other events' files are not shown.
    if (attendantId && agreement.eventId) {
      try {
        files = await prisma.clientFile.findMany({
          where: { eventId: agreement.eventId },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            fileName: true,
            fileType: true,
            fileSize: true,
            googleDriveLink: true,
          },
        });
      } catch (error) {
        console.error('Error fetching attendant files:', error);
        filesError = 'Failed to load files';
      }
    }
    const showFiles = files.length > 0 || Boolean(filesError);

    // Format event date for display (e.g., "November 2, 2025")
    const formattedEventDate = eventDate
      ? formatDateToronto(
          eventDate,
          { year: 'numeric', month: 'long', day: 'numeric' },
          'en-US',
        )
      : null;

    // Format time with duration (e.g., "8:00 pm - 6 hours")
    const formattedTimeWithDuration = (() => {
      if (!eventStartTime && !eventDuration) return null;
      const time = eventStartTime || '';
      const duration = eventDuration || '';
      if (!time && !duration) return null;
      if (time && duration) return `${time} - ${duration}`;
      return time || duration;
    })();

    // Generate Google Maps URL for address
    const getGoogleMapsUrl = (address: string | null) => {
      if (!address) return null;
      const encoded = encodeURIComponent(address);
      return `https://www.google.com/maps/search/?api=1&query=${encoded}`;
    };

    // Generate tel: link for phone number
    const getTelLink = (phone: string | null) => {
      if (!phone) return null;
      // Remove all non-digit characters except + for international numbers
      const cleaned = phone.replace(/[^\d+]/g, '');
      return `tel:${cleaned}`;
    };
    return (
      <>
        <style>{`
          @keyframes attendant-fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
        `}</style>
        <div className="min-h-screen animate-[attendant-fade-in_0.3s_ease-out] bg-admin-bg font-ui text-admin-text">
          <header className="border-b border-admin-hairline bg-admin-surface py-4 min-[769px]:py-5 min-[1025px]:py-6">
            <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-4 px-4 min-[769px]:px-5 min-[1001px]:px-6 min-[1025px]:px-8">
              <BrandMark size="header" subtitle="Event Information" />
              {hubLink && (
                <Link
                  href={hubLink}
                  className="inline-flex items-center gap-2 rounded-sm border border-admin-hairline bg-admin-hairline px-4 py-2 text-sm font-medium text-admin-text no-underline transition-all duration-200 hover:border-admin-muted"
                >
                  <span>←</span>
                  <span>Back to Hub</span>
                </Link>
              )}
            </div>
          </header>

          <main
            className={`mx-auto flex w-full max-w-full flex-col items-start gap-6 px-4 py-6 min-[769px]:px-5 min-[981px]:py-7 min-[1001px]:px-6 min-[1001px]:py-8 min-[1025px]:grid min-[1025px]:max-w-[1400px] min-[1025px]:gap-8 min-[1025px]:px-8 min-[1025px]:py-12 ${
              showFiles ? 'min-[1025px]:grid-cols-[1fr_380px]' : 'min-[1025px]:grid-cols-1'
            }`}
          >
            <div className="w-full max-w-full">
              <div className="w-full max-w-full rounded-sm border border-admin-hairline bg-admin-surface p-5 min-[769px]:p-6 min-[1025px]:p-8">
                <h2 className="m-0 mb-6 border-b border-admin-hairline pb-4 text-xl font-bold text-admin-text">
                  Event Summary
                </h2>
                <div className="flex flex-col gap-5">
                  {formattedEventDate && (
                    <p className="m-0 text-lg font-semibold leading-[1.6] text-admin-text">{formattedEventDate}</p>
                  )}

                  {formattedTimeWithDuration && (
                    <SummaryField label="Start Time:">
                      <SummaryText>{formattedTimeWithDuration}</SummaryText>
                    </SummaryField>
                  )}

                  {(isWhitelabelClient ? eventContactName : client.firstName) && (
                    <SummaryField label={isWhitelabelClient ? 'Event Contact Name:' : 'Client Name:'}>
                      <SummaryText>{isWhitelabelClient ? eventContactName : client.firstName}</SummaryText>
                    </SummaryField>
                  )}

                  {(isWhitelabelClient ? eventContactPhone : client.phone) &&
                    (isEventWithin24Hours || showPhoneNumberAlways) && (
                      <SummaryField label={isWhitelabelClient ? 'Event Contact Phone:' : 'Contact Phone:'}>
                        <a
                          href={getTelLink(isWhitelabelClient ? eventContactPhone : client.phone) || '#'}
                          className="block text-base font-medium text-accent no-underline transition-colors duration-200 hover:text-accent"
                        >
                          {isWhitelabelClient ? eventContactPhone : client.phone}
                        </a>
                      </SummaryField>
                    )}

                  {eventLocation && (
                    <SummaryField label="Event Address:">
                      <a
                        href={getGoogleMapsUrl(eventLocation) || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-base font-medium leading-[1.6] text-accent no-underline transition-colors duration-200 hover:text-accent"
                      >
                        {eventLocation}
                      </a>
                    </SummaryField>
                  )}

                  {backdropLink?.name && (
                    <SummaryField label="Attendant:">
                      <SummaryText>{backdropLink.name}</SummaryText>
                    </SummaryField>
                  )}

                  <BackdropSection
                    name={selectedBackdropName}
                    thumbnailUrl={backdropThumbnailUrl}
                    forceVirtualGreenScreen={forceVirtualGreenScreen}
                  />

                  {event?.unlimitedPrints && (
                    <div className="flex items-center gap-2.5 rounded-sm border border-[rgba(var(--accent-rgb),0.35)] bg-[rgba(var(--accent-rgb),0.12)] px-4 py-3">
                      <span className="text-xl font-bold leading-none text-accent">∞</span>
                      <p className="m-0 text-base font-bold tracking-[0.01em] text-accent">Unlimited Prints</p>
                    </div>
                  )}

                  {notes && (
                    <SummaryField label="Additional Info:">
                      <div className="mt-2">
                        {(notes || '').split('\n').map((line: string, idx: number) => (
                          <p
                            key={idx}
                            className={`m-0 whitespace-pre-wrap text-base font-medium leading-[1.6] text-admin-text ${
                              idx > 0 ? 'mt-2' : ''
                            }`}
                          >
                            {line}
                          </p>
                        ))}
                      </div>
                    </SummaryField>
                  )}
                </div>
              </div>
            </div>

            {showFiles && attendantId && (
              <div className="static order-1 w-full max-w-full min-[1025px]:sticky min-[1025px]:top-6">
                <FilesSection files={files} error={filesError} />
              </div>
            )}
          </main>

          <footer className="mx-auto mt-12 max-w-[1400px] border-t border-admin-hairline px-4 pb-0 pt-8 text-center min-[769px]:px-8">
            <div className="mb-2">
              <BrandMark size="footer" />
            </div>
            <p className="m-0 text-sm text-admin-muted">
              Professional photo booth services for your special events
            </p>
          </footer>
        </div>
      </>
    );
  } catch (error) {
    console.error('Error fetching agreement:', error);
    return <AttendantUnavailable variant="missing" />;
  }
}
