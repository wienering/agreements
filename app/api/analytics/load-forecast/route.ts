import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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

// Helper function to get Monday of a week for a given date
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0); // Normalize to start of day
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  const weekStart = new Date(d);
  weekStart.setDate(diff);
  return weekStart;
}

// Helper function to format week label
function formatWeekLabel(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  
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
    const { searchParams } = new URL(request.url);
    const weeks = parseInt(searchParams.get('weeks') || '12'); // Default to 12 weeks
    
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    // Calculate end date (weeks from now)
    const endDate = new Date(now);
    endDate.setDate(endDate.getDate() + (weeks * 7));
    
    // Get all upcoming events (non-archived, with eventDate in the future)
    const events = await prisma.event.findMany({
      where: {
        archived: false,
        eventDate: {
          gte: now,
          lte: endDate
        }
      },
      select: {
        id: true,
        eventDate: true,
        eventDuration: true
      },
      orderBy: {
        eventDate: 'asc'
      }
    });
    
    // Also get events from deprecated client.eventDate field for backward compatibility
    const clientsWithEvents = await prisma.client.findMany({
      where: {
        eventDate: {
          gte: now,
          lte: endDate
        }
      },
      select: {
        id: true,
        eventDate: true,
        eventDuration: true
      }
    });
    
    // Combine both sources, filtering out null eventDates
    const allEvents: Array<{
      eventDate: Date;
      eventDuration: string | null;
    }> = [
      ...events
        .filter(e => e.eventDate !== null)
        .map(e => ({
          eventDate: e.eventDate!,
          eventDuration: e.eventDuration
        })),
      ...clientsWithEvents
        .filter(c => c.eventDate !== null)
        .map(c => ({
          eventDate: c.eventDate!,
          eventDuration: c.eventDuration
        }))
    ];
    
    // Group events by week
    const weeklyData = new Map<string, {
      weekStart: Date;
      weekEnd: Date;
      events: Array<{ eventDate: Date; eventDuration: string | null }>;
    }>();
    
    allEvents.forEach(event => {
      if (!event.eventDate) return;
      
      const weekStart = getWeekStart(event.eventDate);
      const weekKey = weekStart.toISOString();
      
      if (!weeklyData.has(weekKey)) {
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        weeklyData.set(weekKey, {
          weekStart,
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
    }> = [];
    
    const currentWeekStart = getWeekStart(now);
    
    for (let i = 0; i < weeks; i++) {
      const weekStart = new Date(currentWeekStart);
      weekStart.setDate(weekStart.getDate() + (i * 7));
      
      if (weekStart > endDate) break;
      
      const weekKey = weekStart.toISOString();
      const weekData = weeklyData.get(weekKey);
      
      const events = weekData?.events || [];
      const totalHours = events.reduce((sum, event) => {
        return sum + parseDurationToHours(event.eventDuration);
      }, 0);
      
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      forecastData.push({
        weekStart: weekStart.toISOString(),
        weekEnd: weekEnd.toISOString(),
        weekLabel: formatWeekLabel(weekStart),
        eventCount: events.length,
        totalHours: Math.round(totalHours * 10) / 10 // Round to 1 decimal place
      });
    }
    
    return NextResponse.json({
      forecast: forecastData
    });
    
  } catch (error) {
    console.error('Error fetching load forecast:', error);
    return NextResponse.json(
      { error: 'Failed to fetch load forecast' },
      { status: 500 }
    );
  }
}

