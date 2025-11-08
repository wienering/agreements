import { NextRequest, NextResponse } from 'next/server';
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
  
  // Name fields
  let firstName = getValue(['first name', 'firstname', 'fname', 'given name']) || '';
  let lastName = getValue(['last name', 'lastname', 'lname', 'surname', 'family name']) || '';
  const fullName = getValue(['full name', 'name', 'customer name', 'client name']);
  
  if ((!firstName && !lastName) && fullName) {
    const split = splitName(fullName);
    firstName = split.firstName;
    lastName = split.lastName;
  }
  
  // Phone
  const phone = getValue(['phone', 'phone number', 'telephone', 'mobile', 'cell']) || null;
  
  // Date/Time
  const dateStr = getValue(['event date', 'booking date', 'appointment date', 'date', 'eventdate', 'bookingdate']);
  const timeStr = getValue(['event time', 'booking time', 'appointment time', 'time', 'start time', 'eventtime']);
  const eventDate = dateStr ? parseDate(dateStr) : null;
  
  // Event details
  const eventType = getValue(['event type', 'service', 'service name', 'service type', 'eventtype']) || null;
  const eventLocation = getValue(['location', 'event location', 'venue', 'address', 'eventlocation']) || null;
  const eventDuration = getValue(['duration', 'event duration', 'length', 'eventduration']) || null;
  const eventPackage = getValue(['package', 'event package', 'package name', 'eventpackage']) || null;
  const eventName = getValue(['event name', 'eventname', 'name of event']) || null;
  const eventPhone = getValue(['event phone', 'eventphone', 'contact phone']) || null;
  
  // Price
  const priceStr = getValue(['price', 'package price', 'cost', 'amount', 'total', 'packageprice']);
  const packagePrice = parsePrice(priceStr || undefined);
  
  // Notes
  const notes = getValue(['notes', 'note', 'comments', 'remarks', 'additional info']) || null;
  
  return {
    email: email.toLowerCase().trim(),
    firstName: firstName.trim() || 'Customer',
    lastName: lastName.trim() || '',
    phone,
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
      status: 'imported' | 'skipped' | 'error';
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
        
        // Upsert client
        const client = await prisma.client.upsert({
          where: { email: mapped.email },
          update: {
            firstName: mapped.firstName || undefined,
            lastName: mapped.lastName || undefined,
            phone: mapped.phone || undefined,
          },
          create: {
            email: mapped.email,
            firstName: mapped.firstName,
            lastName: mapped.lastName,
            phone: mapped.phone,
          },
        });
        
        // Check for duplicate event (same client + same event date)
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
          const duplicateEvent = existingEvents.find(event => {
            if (!event.eventDate) return false;
            const existingNormalized = normalizeDate(event.eventDate);
            return existingNormalized === normalizedDate;
          });
          
          if (duplicateEvent) {
            results.push({
              row: rowNumber,
              status: 'skipped',
              reason: 'Duplicate event (same client and event date)',
              clientEmail: mapped.email,
              eventDate: mapped.eventDate.toISOString(),
              csvData: row,
              existingEvent: {
                id: duplicateEvent.id,
                eventDate: duplicateEvent.eventDate?.toISOString(),
                eventType: duplicateEvent.eventType,
                eventLocation: duplicateEvent.eventLocation,
                eventStartTime: duplicateEvent.eventStartTime,
                eventDuration: duplicateEvent.eventDuration,
                eventPackage: duplicateEvent.eventPackage,
                packagePrice: duplicateEvent.packagePrice?.toString(),
                notes: duplicateEvent.notes,
                eventName: duplicateEvent.eventName,
                client: {
                  id: duplicateEvent.client.id,
                  email: duplicateEvent.client.email,
                  firstName: duplicateEvent.client.firstName,
                  lastName: duplicateEvent.client.lastName,
                },
              },
            });
            
            duplicates.push({
              row: rowNumber,
              csvData: row,
              existingEvent: {
                id: duplicateEvent.id,
                eventDate: duplicateEvent.eventDate?.toISOString(),
                eventType: duplicateEvent.eventType,
                eventLocation: duplicateEvent.eventLocation,
                eventStartTime: duplicateEvent.eventStartTime,
                eventDuration: duplicateEvent.eventDuration,
                eventPackage: duplicateEvent.eventPackage,
                packagePrice: duplicateEvent.packagePrice?.toString(),
                notes: duplicateEvent.notes,
                eventName: duplicateEvent.eventName,
                client: {
                  id: duplicateEvent.client.id,
                  email: duplicateEvent.client.email,
                  firstName: duplicateEvent.client.firstName,
                  lastName: duplicateEvent.client.lastName,
                },
              },
              matchReason: 'Same client email and event date',
            });
            
            skippedCount++;
            continue;
          }
        }
        
        // Create event
        const event = await prisma.event.create({
          data: {
            clientId: client.id,
            eventDate: mapped.eventDate,
            eventType: mapped.eventType,
            eventLocation: mapped.eventLocation,
            eventStartTime: mapped.eventStartTime,
            eventDuration: mapped.eventDuration,
            eventPackage: mapped.eventPackage,
            packagePrice: mapped.packagePrice !== null ? mapped.packagePrice : null,
            notes: mapped.notes,
            eventName: mapped.eventName,
            eventPhone: mapped.eventPhone,
            archived: false,
          },
        });
        
        results.push({
          row: rowNumber,
          status: 'imported',
          clientEmail: mapped.email,
          eventDate: mapped.eventDate?.toISOString(),
          csvData: row,
        });
        
        importedCount++;
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

