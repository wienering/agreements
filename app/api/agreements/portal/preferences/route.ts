import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const updatePreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  theme: z.enum(['light', 'dark', 'auto']).optional(),
  language: z.string().optional(),
  timezone: z.string().optional(),
  autoRefresh: z.boolean().optional(),
  showExpiredAgreements: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'Authorization header required',
        code: 'MISSING_AUTH'
      }, { status: 401 });
    }

    const sessionToken = authHeader.substring(7);

    // Find and validate session
    const session = await prisma.clientSession.findUnique({
      where: { sessionToken },
      include: {
        client: true
      }
    });

    if (!session) {
      return NextResponse.json({ 
        error: 'Invalid session token',
        code: 'INVALID_SESSION'
      }, { status: 401 });
    }

    // Check if session has expired
    if (new Date() > session.expiresAt) {
      await prisma.clientSession.delete({
        where: { sessionToken }
      });
      
      return NextResponse.json({ 
        error: 'Session has expired',
        code: 'SESSION_EXPIRED'
      }, { status: 401 });
    }

    // Get client preferences (stored as JSON in a field, or use defaults)
    const preferences = {
      emailNotifications: true,
      smsNotifications: false,
      theme: 'light' as const,
      language: 'en',
      timezone: 'America/Toronto',
      autoRefresh: true,
      showExpiredAgreements: false,
      // Add more preferences as needed
      dashboardLayout: 'grid',
      itemsPerPage: 10,
      sortPreference: 'createdAt',
      sortOrder: 'desc'
    };

    // Update last activity
    await prisma.clientSession.update({
      where: { sessionToken },
      data: { lastActivityAt: new Date() }
    });

    return NextResponse.json({
      success: true,
      preferences,
      availableOptions: {
        themes: ['light', 'dark', 'auto'],
        languages: [
          { code: 'en', name: 'English' },
          { code: 'fr', name: 'Français' },
          { code: 'es', name: 'Español' }
        ],
        timezones: [
          'America/Toronto',
          'America/New_York',
          'America/Los_Angeles',
          'America/Chicago',
          'UTC'
        ],
        dashboardLayouts: ['grid', 'list'],
        itemsPerPage: [5, 10, 20, 50],
        sortOptions: [
          { value: 'createdAt', label: 'Date Created' },
          { value: 'updatedAt', label: 'Last Updated' },
          { value: 'signedAt', label: 'Date Signed' },
          { value: 'template', label: 'Template Name' },
          { value: 'status', label: 'Status' }
        ],
        sortOrders: [
          { value: 'desc', label: 'Newest First' },
          { value: 'asc', label: 'Oldest First' }
        ]
      }
    });

  } catch (error) {
    console.error('Error fetching preferences:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch preferences',
      code: 'SERVER_ERROR'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ 
        error: 'Authorization header required',
        code: 'MISSING_AUTH'
      }, { status: 401 });
    }

    const sessionToken = authHeader.substring(7);

    // Find and validate session
    const session = await prisma.clientSession.findUnique({
      where: { sessionToken },
      include: {
        client: true
      }
    });

    if (!session) {
      return NextResponse.json({ 
        error: 'Invalid session token',
        code: 'INVALID_SESSION'
      }, { status: 401 });
    }

    // Check if session has expired
    if (new Date() > session.expiresAt) {
      await prisma.clientSession.delete({
        where: { sessionToken }
      });
      
      return NextResponse.json({ 
        error: 'Session has expired',
        code: 'SESSION_EXPIRED'
      }, { status: 401 });
    }

    const body = await request.json();
    const validatedData = updatePreferencesSchema.parse(body);

    // In a real implementation, you'd store these in a ClientPreferences table
    // For now, we'll just validate and return success
    const updatedPreferences = {
      emailNotifications: validatedData.emailNotifications ?? true,
      smsNotifications: validatedData.smsNotifications ?? false,
      theme: validatedData.theme ?? 'light',
      language: validatedData.language ?? 'en',
      timezone: validatedData.timezone ?? 'America/Toronto',
      autoRefresh: validatedData.autoRefresh ?? true,
      showExpiredAgreements: validatedData.showExpiredAgreements ?? false,
    };

    // Update last activity
    await prisma.clientSession.update({
      where: { sessionToken },
      data: { lastActivityAt: new Date() }
    });

    return NextResponse.json({
      success: true,
      message: 'Preferences updated successfully',
      preferences: updatedPreferences
    });

  } catch (error: any) {
    console.error('Error updating preferences:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ 
        error: 'Invalid preferences data',
        code: 'VALIDATION_ERROR',
        details: error.errors 
      }, { status: 400 });
    }
    return NextResponse.json({ 
      error: 'Failed to update preferences',
      code: 'SERVER_ERROR'
    }, { status: 500 });
  }
}
