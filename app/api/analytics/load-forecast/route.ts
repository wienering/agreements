import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import {
  formatTorontoWeekLabel,
  getTorontoDateParts,
  getTorontoWeekStart,
  torontoMidnightUtc,
} from '@/lib/dates';

// Helper function to parse duration string to hours
function parseDurationToHours(duration: string | null | undefined): number {
  if (!duration) return 0;
  
  const durationStr = String(duration).trim().toLowerCase();
  if (!durationStr) return 0;
  
  // Extract numeric value (handles formats like "4 hours", "1.5 hours", "8 hours", etc.)
  const numericMatch = durationStr.match(/(\d+\.?\d*)/);
  if (!numericMatch) return 0;
  
  const numericValue = parseFloat(numericMatch[1]);
  if (isNaN(numericValue)) return 0;
  
  // Check if already in hours (contains "hour" or "hr")
  if (durationStr.includes('hour') || durationStr.includes('hr')) {
    return numericValue;
  }
  
  // If no hour keyword, assume it's in minutes and convert to hours
  // This handles edge cases where duration might be in minutes
  return numericValue / 60;
}

export async function GET(request: NextRequest) {
  try {

    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const weeks = parseInt(searchParams.get('weeks') || '12'); // Default to 12 weeks
    
    // Get current date in Eastern timezone
    const now = new Date();
    const nowEastern = getTorontoDateParts(now);
    // Include the whole current week (Sun–Sat), not just today forward —
    // otherwise past events earlier in the week (e.g. Sunday) vanish from
    // the current week's bar while future Sundays still show.
    const currentWeekStartInfo = getTorontoWeekStart(now);
    const rangeStart = currentWeekStartInfo.date;
    
    // Calculate end date (weeks from current week start) in Eastern timezone
    // Add weeks to the day, handling month/year rollover
    let endYear = currentWeekStartInfo.year;
    let endMonth = currentWeekStartInfo.month;
    let endDay = currentWeekStartInfo.day + (weeks * 7);
    
    // Handle month rollover
    while (endDay > 28) { // Rough check
      const daysInMonth = new Date(endYear, endMonth + 1, 0).getDate();
      if (endDay > daysInMonth) {
        endDay -= daysInMonth;
        endMonth++;
        if (endMonth > 11) {
          endMonth = 0;
          endYear++;
        }
      } else {
        break;
      }
    }
    
    const endDateEastern = torontoMidnightUtc(endYear, endMonth, endDay);
    
    // Get events in the forecast window (non-archived), from current week start
    // Note: Prisma queries use UTC, so we need to convert our Eastern dates to UTC for comparison
    const events = await prisma.event.findMany({
      where: {
        archived: false,
        eventDate: {
          gte: rangeStart,
          lte: endDateEastern
        }
      },
      select: {
        id: true,
        eventDate: true,
        eventDuration: true,
        client: {
          select: {
            firstName: true
          }
        }
      },
      orderBy: {
        eventDate: 'asc'
      }
    });
    
    // Also get events from deprecated client.eventDate field for backward compatibility
    const clientsWithEvents = await prisma.client.findMany({
      where: {
        eventDate: {
          gte: rangeStart,
          lte: endDateEastern
        }
      },
      select: {
        id: true,
        eventDate: true,
        eventDuration: true,
        firstName: true
      }
    });
    
    // Combine both sources, filtering out null eventDates
    const allEvents: Array<{
      eventDate: Date;
      eventDuration: string | null;
      clientFirstName: string;
    }> = [
      ...events
        .filter(e => e.eventDate !== null)
        .map(e => ({
          eventDate: e.eventDate!,
          eventDuration: e.eventDuration,
          clientFirstName: e.client.firstName
        })),
      ...clientsWithEvents
        .filter(c => c.eventDate !== null)
        .map(c => ({
          eventDate: c.eventDate!,
          eventDuration: c.eventDuration,
          clientFirstName: c.firstName
        }))
    ];
    
    // Group events by week
    const weeklyData = new Map<string, {
      weekStart: Date;
      weekEnd: Date;
      events: Array<{ eventDate: Date; eventDuration: string | null; clientFirstName: string }>;
    }>();
    
    allEvents.forEach(event => {
      if (!event.eventDate) return;
      
      // Get week start in Eastern timezone for this event date
      const weekStartInfo = getTorontoWeekStart(event.eventDate);
      // Use the calculated date components directly for the week key to ensure consistency
      const weekKey = `${weekStartInfo.year}-${String(weekStartInfo.month + 1).padStart(2, '0')}-${String(weekStartInfo.day).padStart(2, '0')}`;
      
      if (!weeklyData.has(weekKey)) {
        // Calculate week end (Saturday) in Eastern timezone
        let weekEndYear = weekStartInfo.year;
        let weekEndMonth = weekStartInfo.month;
        let weekEndDay = weekStartInfo.day + 6;
        
        // Handle month rollover
        const daysInMonth = new Date(weekEndYear, weekEndMonth + 1, 0).getDate();
        if (weekEndDay > daysInMonth) {
          weekEndDay -= daysInMonth;
          weekEndMonth++;
          if (weekEndMonth > 11) {
            weekEndMonth = 0;
            weekEndYear++;
          }
        }
        
        const weekEnd = torontoMidnightUtc(weekEndYear, weekEndMonth, weekEndDay);
        weeklyData.set(weekKey, {
          weekStart: weekStartInfo.date,
          weekEnd,
          events: []
        });
      }
      
      weeklyData.get(weekKey)!.events.push(event);
    });
    
    // Generate all weeks from now to end date (even if no events)
    const forecastData: Array<{
      weekStart: string;
      weekEnd: string;
      weekLabel: string;
      eventCount: number;
      totalHours: number;
      clientNames: string[];
    }> = [];
    
    for (let i = 0; i < weeks; i++) {
      // Calculate week start date in Eastern timezone using the date components directly
      let weekYear = currentWeekStartInfo.year;
      let weekMonth = currentWeekStartInfo.month;
      let weekDay = currentWeekStartInfo.day + (i * 7);
      
      // Handle month/year rollover
      while (weekDay > 28) {
        const daysInMonth = new Date(weekYear, weekMonth + 1, 0).getDate();
        if (weekDay > daysInMonth) {
          weekDay -= daysInMonth;
          weekMonth++;
          if (weekMonth > 11) {
            weekMonth = 0;
            weekYear++;
          }
        } else {
          break;
        }
      }
      
      const weekStart = torontoMidnightUtc(weekYear, weekMonth, weekDay);
      // Use the calculated components directly for the week key to ensure consistency
      const weekStartEastern = { year: weekYear, month: weekMonth, day: weekDay };
      const weekEndEastern = getTorontoDateParts(new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000));
      
      // Check if we've exceeded the end date
      if (weekStartEastern.year > nowEastern.year || 
          (weekStartEastern.year === nowEastern.year && weekStartEastern.month > nowEastern.month) ||
          (weekStartEastern.year === nowEastern.year && weekStartEastern.month === nowEastern.month && weekStartEastern.day > nowEastern.day + (weeks * 7))) {
        break;
      }
      
      const weekKey = `${weekStartEastern.year}-${String(weekStartEastern.month + 1).padStart(2, '0')}-${String(weekStartEastern.day).padStart(2, '0')}`;
      const weekData = weeklyData.get(weekKey);
      
      const events = weekData?.events || [];
      const totalHours = events.reduce((sum, event) => {
        return sum + parseDurationToHours(event.eventDuration);
      }, 0);
      
      // Extract client first names from events
      const clientNames = events.map(event => event.clientFirstName).filter(name => name);
      
      // Calculate week end (Saturday) in Eastern timezone
      let weekEndYear = weekStartEastern.year;
      let weekEndMonth = weekStartEastern.month;
      let weekEndDay = weekStartEastern.day + 6;
      
      // Handle month rollover
      const daysInMonth = new Date(weekEndYear, weekEndMonth + 1, 0).getDate();
      if (weekEndDay > daysInMonth) {
        weekEndDay -= daysInMonth;
        weekEndMonth++;
        if (weekEndMonth > 11) {
          weekEndMonth = 0;
          weekEndYear++;
        }
      }
      
      const weekEnd = torontoMidnightUtc(weekEndYear, weekEndMonth, weekEndDay);
      
      forecastData.push({
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        weekLabel: formatTorontoWeekLabel(weekStartEastern.year, weekStartEastern.month, weekStartEastern.day),
        eventCount: events.length,
        totalHours: Math.round(totalHours * 10) / 10, // Round to 1 decimal place
        clientNames: clientNames
      });
    }
    
    return NextResponse.json({
      forecast: forecastData
    });
    
  } catch (error) {
    const authResponse = adminAuthResponse(error);
    if (authResponse) return authResponse;
    console.error('Error fetching load forecast:', error);
    return NextResponse.json(
      { error: 'Failed to fetch load forecast' },
      { status: 500 }
    );
  }
}

