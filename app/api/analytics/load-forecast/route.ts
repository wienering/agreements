import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';

const TIMEZONE = 'America/Toronto'; // Eastern Time

// Helper function to get date components in Eastern timezone
function getEasternDateParts(date: Date): { year: number; month: number; day: number; dayOfWeek: number } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'long'
  });
  
  const parts = formatter.formatToParts(date);
  const year = parseInt(parts.find(p => p.type === 'year')!.value);
  const month = parseInt(parts.find(p => p.type === 'month')!.value) - 1; // 0-indexed
  const day = parseInt(parts.find(p => p.type === 'day')!.value);
  const weekday = parts.find(p => p.type === 'weekday')!.value;
  
  // Convert weekday to number (0 = Sunday, 1 = Monday, etc.)
  const weekdayMap: Record<string, number> = {
    'Sunday': 0,
    'Monday': 1,
    'Tuesday': 2,
    'Wednesday': 3,
    'Thursday': 4,
    'Friday': 5,
    'Saturday': 6
  };
  const dayOfWeek = weekdayMap[weekday] ?? 0;
  
  return { year, month, day, dayOfWeek };
}

// Helper function to create a Date object for querying that represents a date in Eastern timezone
// For database queries, we need UTC dates that represent the start/end of a day in Eastern
function createEasternDateForQuery(year: number, month: number, day: number): Date {
  // Create a date string in ISO format
  // We'll create it as if it's midnight Eastern, which we need to convert to UTC
  const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}T00:00:00`;
  
  // Create a temporary date to get the timezone offset
  const tempDate = new Date(dateStr);
  
  // Get what this date represents in Eastern timezone
  const easternParts = getEasternDateParts(tempDate);
  
  // If the date doesn't match, we need to find the UTC time that represents midnight Eastern
  // We'll iterate to find the right UTC time
  let candidate = new Date(Date.UTC(year, month, day, 5, 0, 0)); // Start with 5am UTC (roughly midnight EST)
  let candidateParts = getEasternDateParts(candidate);
  let attempts = 0;
  
  while ((candidateParts.year !== year || candidateParts.month !== month || candidateParts.day !== day) && attempts < 10) {
    const dayDiff = (candidateParts.year - year) * 365 + (candidateParts.month - month) * 30 + (candidateParts.day - day);
    candidate = new Date(candidate.getTime() - dayDiff * 24 * 60 * 60 * 1000);
    candidateParts = getEasternDateParts(candidate);
    attempts++;
  }
  
  // Now adjust to midnight Eastern (subtract hours to get to midnight)
  const hourInEastern = parseInt(candidate.toLocaleString('en-US', { timeZone: TIMEZONE, hour: 'numeric', hour12: false }));
  const minuteInEastern = parseInt(candidate.toLocaleString('en-US', { timeZone: TIMEZONE, minute: 'numeric' }));
  const secondsInEastern = parseInt(candidate.toLocaleString('en-US', { timeZone: TIMEZONE, second: 'numeric' }));
  
  const totalSeconds = hourInEastern * 3600 + minuteInEastern * 60 + secondsInEastern;
  return new Date(candidate.getTime() - totalSeconds * 1000);
}

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

// Helper function to get Sunday of a week for a given date in Eastern timezone
// Returns both the Date object and the date components to ensure consistency
function getWeekStart(date: Date): { date: Date; year: number; month: number; day: number } {
  // Get date components in Eastern timezone
  const { year, month, day, dayOfWeek } = getEasternDateParts(date);
  
  // Calculate days to subtract to get to Sunday (dayOfWeek is 0=Sunday, 1=Monday, etc.)
  const daysToSubtract = dayOfWeek;
  const sundayDay = day - daysToSubtract;
  
  // Create date for Sunday in Eastern timezone
  // Handle month/year rollover for sundayDay
  let sundayYear = year;
  let sundayMonth = month;
  let sundayDayAdjusted = sundayDay;
  
  if (sundayDayAdjusted < 1) {
    sundayMonth--;
    if (sundayMonth < 0) {
      sundayMonth = 11;
      sundayYear--;
    }
    const daysInPrevMonth = new Date(sundayYear, sundayMonth + 1, 0).getDate();
    sundayDayAdjusted += daysInPrevMonth;
  }
  
  return {
    date: createEasternDateForQuery(sundayYear, sundayMonth, sundayDayAdjusted),
    year: sundayYear,
    month: sundayMonth,
    day: sundayDayAdjusted
  };
}

// Helper function to format week label (Sunday to Saturday)
function formatWeekLabel(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6); // Saturday is 6 days after Sunday
  
  const startMonth = weekStart.toLocaleDateString('en-US', { month: 'short' });
  const startDay = weekStart.getDate();
  const endMonth = weekEnd.toLocaleDateString('en-US', { month: 'short' });
  const endDay = weekEnd.getDate();
  
  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}-${endDay}`;
  } else {
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}`;
  }
}

export async function GET(request: NextRequest) {
  try {

    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const weeks = parseInt(searchParams.get('weeks') || '12'); // Default to 12 weeks
    
    // Get current date in Eastern timezone
    const now = new Date();
    const nowEastern = getEasternDateParts(now);
    const nowEasternDate = createEasternDateForQuery(nowEastern.year, nowEastern.month, nowEastern.day);
    
    // Calculate end date (weeks from now) in Eastern timezone
    // Add weeks to the day, handling month/year rollover
    let endYear = nowEastern.year;
    let endMonth = nowEastern.month;
    let endDay = nowEastern.day + (weeks * 7);
    
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
    
    const endDateEastern = createEasternDateForQuery(endYear, endMonth, endDay);
    
    // Get all upcoming events (non-archived, with eventDate in the future)
    // Note: Prisma queries use UTC, so we need to convert our Eastern dates to UTC for comparison
    const events = await prisma.event.findMany({
      where: {
        archived: false,
        eventDate: {
          gte: nowEasternDate,
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
          gte: nowEasternDate,
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
      const weekStartInfo = getWeekStart(event.eventDate);
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
        
        const weekEnd = createEasternDateForQuery(weekEndYear, weekEndMonth, weekEndDay);
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
    
    // Get current week start in Eastern timezone
    const currentWeekStartInfo = getWeekStart(now);
    
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
      
      const weekStart = createEasternDateForQuery(weekYear, weekMonth, weekDay);
      // Use the calculated components directly for the week key to ensure consistency
      const weekStartEastern = { year: weekYear, month: weekMonth, day: weekDay };
      const weekEndEastern = getEasternDateParts(new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000));
      
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
      
      const weekEnd = createEasternDateForQuery(weekEndYear, weekEndMonth, weekEndDay);
      
      forecastData.push({
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        weekLabel: formatWeekLabel(weekStart),
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

