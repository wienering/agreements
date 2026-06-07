import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { prisma } from '@/lib/prisma';
import Papa from 'papaparse';

// Helper function to split full name into first and last name
function splitName(fullName: string | undefined): { firstName: string; lastName: string } {
  if (!fullName) {
    return { firstName: '', lastName: '' };
  }
  
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: '' };
  }
  
  const lastName = parts.pop() || '';
  const firstName = parts.join(' ');
  return { firstName, lastName };
}

// Helper function to parse date string
function parseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;
  
  try {
    // Handle Bookly format: "2025-11-19 14:00:00" (YYYY-MM-DD HH:MM:SS)
    // Convert to ISO format for reliable parsing
    if (/^\d{4}-\d{2}-\d{2}\s+\d{1,2}:\d{2}:\d{2}$/.test(dateStr)) {
      const isoStr = dateStr.replace(' ', 'T');
      const date = new Date(isoStr);
      if (!isNaN(date.getTime())) {
        return date;
      }
    }
    
    // Try parsing as ISO string first
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }
    
    // Try common date formats
    const formats = [
      /^\d{4}-\d{2}-\d{2}$/, // YYYY-MM-DD
      /^\d{2}\/\d{2}\/\d{4}$/, // MM/DD/YYYY
      /^\d{2}-\d{2}-\d{4}$/, // MM-DD-YYYY
    ];
    
    for (const format of formats) {
      if (format.test(dateStr)) {
        const parsed = new Date(dateStr);
        if (!isNaN(parsed.getTime())) {
          return parsed;
        }
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

// Helper function to parse price
function parsePrice(price: string | number | undefined): number | null {
  if (price === undefined || price === null) return null;
  
  if (typeof price === 'number') {
    return price;
  }
  
  // Remove currency symbols and parse
  const cleaned = String(price).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? null : parsed;
}

// Helper function to convert minutes to hours format
function formatDuration(minutes: string | number | null | undefined): string | null {
  if (minutes === null || minutes === undefined) return null;
  
  // Try to parse as number
  let minutesNum: number;
  if (typeof minutes === 'number') {
    minutesNum = minutes;
  } else {
    // Extract numeric value from string (handle formats like "120", "120 min", "2 hours", etc.)
    const cleaned = String(minutes).replace(/[^0-9.]/g, '');
    if (!cleaned) return null;
    
    minutesNum = parseFloat(cleaned);
    if (isNaN(minutesNum)) return null;
    
    // If the string contains "hour" or "hr", it might already be in hours
    const lowerStr = String(minutes).toLowerCase();
    if (lowerStr.includes('hour') || lowerStr.includes('hr')) {
      // Already in hours, return as-is but format nicely
      const hours = minutesNum;
      if (hours === Math.floor(hours)) {
        return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
      } else {
        return `${hours} hours`;
      }
    }
  }
  
  // Convert minutes to hours
  const hours = minutesNum / 60;
  
  // Format: whole hours if exact, otherwise decimal
  if (hours === Math.floor(hours)) {
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
  } else {
    // Round to 1 decimal place for .5 hours
    const rounded = Math.round(hours * 2) / 2;
    if (rounded === Math.floor(rounded)) {
      return `${rounded} ${rounded === 1 ? 'hour' : 'hours'}`;
    } else {
      return `${rounded} hours`;
    }
  }
}

// Normalize date to just the date part (ignore time) for duplicate detection
function normalizeDate(date: Date | null): string | null {
  if (!date) return null;
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized.toISOString().split('T')[0];
}

// Map CSV row to structured data (flexible column name matching)
function mapCsvRow(row: Record<string, string>): {
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  address: string | null;
  eventDate: Date | null;
  eventStartTime: string | null;
  eventType: string | null;
  eventLocation: string | null;
  eventDuration: string | null;
  eventPackage: string | null;
  packagePrice: number | null;
  notes: string | null;
  eventName: string | null;
  eventPhone: string | null;
} {
  // Normalize column names (case-insensitive, handle spaces/underscores)
  const normalizeKey = (key: string) => key.toLowerCase().replace(/[\s_]/g, '');
  const getValue = (keys: string[]) => {
    for (const key of keys) {
      for (const rowKey of Object.keys(row)) {
        if (normalizeKey(rowKey) === normalizeKey(key)) {
          const value = row[rowKey]?.trim();
          if (value) return value;
        }
      }
    }
    return null;
  };

  // Email (required)
  const email = getValue(['email', 'e-mail', 'customer email', 'client email']) || '';
  
  // Name fields - handle "Customer name" from Bookly
  let firstName = getValue(['first name', 'firstname', 'fname', 'given name']) || '';
  let lastName = getValue(['last name', 'lastname', 'lname', 'surname', 'family name']) || '';
  const fullName = getValue(['full name', 'name', 'customer name', 'client name']);
  
  if ((!firstName && !lastName) && fullName) {
    const split = splitName(fullName);
    firstName = split.firstName;
    lastName = split.lastName;
  }
  
  // Phone
  const phone = getValue(['phone', 'phone number', 'telephone', 'mobile', 'cell', 'customer phone']) || null;
  
  // Address (for client) - separate from event location
  const address = getValue(['address', 'street address', 'street', 'full address', 'client address', 'customer address']) || null;
  
  // Date/Time - handle "Appointment date" from Bookly
  const dateStr = getValue(['appointment date', 'event date', 'booking date', 'date', 'eventdate', 'bookingdate']);
  let timeStr = getValue(['event time', 'booking time', 'appointment time', 'time', 'start time', 'eventtime']);
  
  // If date string contains time, extract it
  let eventDate: Date | null = null;
  if (dateStr) {
    // Check if date string includes time (e.g., "09/26/2026 09:00 PM" or "2026-09-26 21:00")
    const dateTimeMatch = dateStr.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2}(?:\s*(?:AM|PM))?)/i);
    if (dateTimeMatch) {
      // Date and time are combined
      eventDate = parseDate(dateStr);
      // Extract time part if not already extracted from separate time field
      if (!timeStr && dateTimeMatch[2]) {
        timeStr = dateTimeMatch[2].trim();
      }
    } else {
      eventDate = parseDate(dateStr);
    }
  }
  
  // If we have eventDate but no timeStr, try to extract time from the Date object
  if (eventDate && !timeStr) {
    // Format time as "HH:MM AM/PM" or "HH:MM"
    const hours = eventDate.getHours();
    const minutes = eventDate.getMinutes();
    if (hours !== 0 || minutes !== 0) {
      // Only extract if time is not midnight
      const hour12 = hours % 12 || 12;
      const ampm = hours >= 12 ? 'PM' : 'AM';
      timeStr = `${hour12}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    }
  }
  
  // Event details
  const eventType = getValue(['event type', 'service', 'service name', 'service type', 'eventtype']) || null;
  // Event location - separate from customer address, handle "Event Location & Address" from Bookly
  const eventLocation = getValue(['location', 'event location', 'venue', 'eventlocation', 'event location & address']) || null;
  const durationRaw = getValue(['duration', 'event duration', 'length', 'eventduration']);
  const eventDuration = formatDuration(durationRaw);
  const eventPackage = getValue(['package', 'event package', 'package name', 'eventpackage']) || null;
  const eventName = getValue(['event name', 'eventname', 'name of event']) || null;
  const eventPhone = getValue(['event phone', 'eventphone', 'contact phone']) || null;
  
  // Price - handle "C$550.00" format from Bookly
  const priceStr = getValue(['price', 'package price', 'cost', 'amount', 'total', 'packageprice']);
  const packagePrice = parsePrice(priceStr || undefined);
  
  // Notes - handle Bookly's long note field name
  const notes = getValue([
    'notes', 
    'note', 
    'comments', 
    'remarks', 
    'additional info',
    'please provide details about the event type or other info you think we should know',
    'internal note'
  ]) || null;
  
  return {
    email: email.toLowerCase().trim(),
    firstName: firstName.trim() || 'Customer',
    lastName: lastName.trim() || '',
    phone,
    address,
    eventDate,
    eventStartTime: timeStr || null,
    eventType,
    eventLocation,
    eventDuration,
    eventPackage,
    packagePrice,
    notes,
    eventName,
    eventPhone,
  };
}

export async function POST(request: NextRequest) {
  try {

    await requireAdmin();
    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    // Get optional date range filters
    const startDateStr = formData.get('startDate') as string | null;
    const endDateStr = formData.get('endDate') as string | null;
    const startDate = startDateStr ? parseDate(startDateStr) : null;
    const endDate = endDateStr ? parseDate(endDateStr) : null;
    
    // Read file content
    const fileContent = await file.text();
    
    // Parse CSV
    const parseResult = Papa.parse<Record<string, string>>(fileContent, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });
    
    if (parseResult.errors.length > 0 && parseResult.errors.some(e => e.type === 'Quotes')) {
      // Try without header if first attempt fails
      const retryResult = Papa.parse<string[]>(fileContent, {
        header: false,
        skipEmptyLines: true,
      });
      
      if (retryResult.data.length > 0) {
        // Use first row as headers
        const headers = retryResult.data[0] as string[];
        const rows = retryResult.data.slice(1) as string[][];
        parseResult.data = rows.map(row => {
          const obj: Record<string, string> = {};
          headers.forEach((header, i) => {
            obj[header.trim()] = row[i]?.trim() || '';
          });
          return obj;
        });
      }
    }
    
    const rows = parseResult.data;
    
    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'CSV file is empty or could not be parsed' },
        { status: 400 }
      );
    }
    
    // Process each row
    const results: Array<{
      row: number;
      status: 'imported' | 'updated' | 'skipped' | 'error';
      clientEmail?: string;
      eventDate?: string;
      reason?: string;
      error?: string;
      csvData?: Record<string, string>;
      existingEvent?: any;
    }> = [];
    
    const duplicates: Array<{
      row: number;
      csvData: Record<string, string>;
      existingEvent: any;
      matchReason: string;
    }> = [];
    
    let importedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNumber = i + 1; // 1-indexed for user display
      
      try {
        // Map CSV row to structured data
        const mapped = mapCsvRow(row);
        
        // Validate required fields
        if (!mapped.email) {
          results.push({
            row: rowNumber,
            status: 'error',
            error: 'Missing required field: email',
            csvData: row,
          });
          errorCount++;
          continue;
        }
        
        // Filter by date range if provided
        if (startDate && mapped.eventDate && mapped.eventDate < startDate) {
          results.push({
            row: rowNumber,
            status: 'skipped',
            reason: 'Event date before start date filter',
            clientEmail: mapped.email,
            eventDate: mapped.eventDate.toISOString(),
            csvData: row,
          });
          skippedCount++;
          continue;
        }
        
        if (endDate && mapped.eventDate && mapped.eventDate > endDate) {
          results.push({
            row: rowNumber,
            status: 'skipped',
            reason: 'Event date after end date filter',
            clientEmail: mapped.email,
            eventDate: mapped.eventDate.toISOString(),
            csvData: row,
          });
          skippedCount++;
          continue;
        }
        
        // Check if client exists first to see if we should update address
        const existingClient = await prisma.client.findUnique({
          where: { email: mapped.email },
        });
        
        // Upsert client
        const client = await prisma.client.upsert({
          where: { email: mapped.email },
          update: {
            firstName: mapped.firstName || undefined,
            lastName: mapped.lastName || undefined,
            phone: mapped.phone || undefined,
            // Only update address if it doesn't already exist (respect existing data)
            address: mapped.address && !existingClient?.address ? mapped.address : undefined,
            addressAddedAt: mapped.address && !existingClient?.address ? new Date() : undefined,
          },
          create: {
            email: mapped.email,
            firstName: mapped.firstName,
            lastName: mapped.lastName,
            phone: mapped.phone,
            address: mapped.address || null,
            addressAddedAt: mapped.address ? new Date() : null,
          },
        });
        
        // Check for existing event (same client + same event date)
        let event;
        let isUpdate = false;
        
        if (mapped.eventDate) {
          const normalizedDate = normalizeDate(mapped.eventDate);
          
          // Find existing events for this client with the same date
          const existingEvents = await prisma.event.findMany({
            where: {
              clientId: client.id,
              archived: false,
            },
            include: {
              client: true,
            },
          });
          
          // Check if any existing event has the same normalized date
          const existingEvent = existingEvents.find(evt => {
            if (!evt.eventDate) return false;
            const existingNormalized = normalizeDate(evt.eventDate);
            return existingNormalized === normalizedDate;
          });
          
          if (existingEvent) {
            // Update existing event with CSV data
            // Use CSV values if provided, otherwise keep existing values
            const updateData: any = {};
            
            if (mapped.eventDate !== null && mapped.eventDate !== undefined) {
              updateData.eventDate = mapped.eventDate;
            }
            if (mapped.eventType !== null && mapped.eventType !== undefined) {
              updateData.eventType = mapped.eventType;
            }
            if (mapped.eventLocation !== null && mapped.eventLocation !== undefined) {
              updateData.eventLocation = mapped.eventLocation;
            }
            if (mapped.eventStartTime !== null && mapped.eventStartTime !== undefined) {
              updateData.eventStartTime = mapped.eventStartTime;
            }
            if (mapped.eventDuration !== null && mapped.eventDuration !== undefined) {
              updateData.eventDuration = mapped.eventDuration;
            }
            if (mapped.eventPackage !== null && mapped.eventPackage !== undefined) {
              updateData.eventPackage = mapped.eventPackage;
            }
            if (mapped.packagePrice !== null && mapped.packagePrice !== undefined) {
              updateData.packagePrice = mapped.packagePrice;
            }
            if (mapped.notes !== null && mapped.notes !== undefined) {
              updateData.notes = mapped.notes;
            }
            if (mapped.eventName !== null && mapped.eventName !== undefined) {
              updateData.eventName = mapped.eventName;
            }
            if (mapped.eventPhone !== null && mapped.eventPhone !== undefined) {
              updateData.eventPhone = mapped.eventPhone;
            }
            
            event = await prisma.event.update({
              where: { id: existingEvent.id },
              data: updateData,
            });
            
            isUpdate = true;
            
            // Track in duplicates for reporting
            duplicates.push({
              row: rowNumber,
              csvData: row,
              existingEvent: {
                id: existingEvent.id,
                eventDate: existingEvent.eventDate?.toISOString(),
                eventType: existingEvent.eventType,
                eventLocation: existingEvent.eventLocation,
                eventStartTime: existingEvent.eventStartTime,
                eventDuration: existingEvent.eventDuration,
                eventPackage: existingEvent.eventPackage,
                packagePrice: existingEvent.packagePrice?.toString(),
                notes: existingEvent.notes,
                eventName: (existingEvent as any).eventName || null,
                client: {
                  id: existingEvent.client.id,
                  email: existingEvent.client.email,
                  firstName: existingEvent.client.firstName,
                  lastName: existingEvent.client.lastName,
                },
              },
              matchReason: 'Same client email and event date - updated with CSV data',
            });
          }
        }
        
        // Create new event if it doesn't exist
        if (!event) {
          const createData: any = {
            clientId: client.id,
            eventDate: mapped.eventDate,
            eventType: mapped.eventType,
            eventLocation: mapped.eventLocation,
            eventStartTime: mapped.eventStartTime,
            eventDuration: mapped.eventDuration,
            eventPackage: mapped.eventPackage,
            packagePrice: mapped.packagePrice !== null ? mapped.packagePrice : null,
            notes: mapped.notes,
            archived: false,
          };
          
          // Add optional fields if they exist
          if (mapped.eventName !== null && mapped.eventName !== undefined) {
            createData.eventName = mapped.eventName;
          }
          if (mapped.eventPhone !== null && mapped.eventPhone !== undefined) {
            createData.eventPhone = mapped.eventPhone;
          }
          
          event = await prisma.event.create({
            data: createData,
          });
        }
        
        results.push({
          row: rowNumber,
          status: isUpdate ? 'updated' : 'imported',
          clientEmail: mapped.email,
          eventDate: mapped.eventDate?.toISOString(),
          csvData: row,
          reason: isUpdate ? 'Updated existing event' : undefined,
        });
        
        if (isUpdate) {
          skippedCount++; // Count updates as "skipped" in summary for now, or we could add an "updated" count
        } else {
          importedCount++;
        }
      } catch (error: any) {
        console.error(`Error processing row ${rowNumber}:`, error);
        results.push({
          row: rowNumber,
          status: 'error',
          error: error.message || 'Unknown error',
          csvData: row,
        });
        errorCount++;
      }
    }
    
    return NextResponse.json({
      success: true,
      summary: {
        total: rows.length,
        imported: importedCount,
        skipped: skippedCount,
        errors: errorCount,
      },
      details: results,
      duplicates: duplicates,
    }, { status: 200 });
    
  } catch (error: any) {
    console.error('CSV import error:', error);
    return NextResponse.json(
      {
        error: 'Failed to process CSV file',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

