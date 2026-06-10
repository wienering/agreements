import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { devLog } from '@/lib/logger';

// Get backdrop-selection-tool URL from environment variable or use default
const BACKDROP_TOOL_URL = process.env.BACKDROP_SELECTION_TOOL_URL || process.env.NEXT_PUBLIC_BACKDROP_SELECTION_TOOL_URL || 'https://backdrops.photoboothguys.ca';

export async function GET(request: NextRequest) {
  try {

    await requireAdmin(request);
    const { searchParams } = new URL(request.url);
    const attendantId = searchParams.get('attendantId');

    if (!attendantId) {
      return NextResponse.json(
        { error: 'attendantId is required' },
        { status: 400 }
      );
    }

    // URL encode the attendantId to handle special characters like colons
    const encodedAttendantId = encodeURIComponent(attendantId);
    
    // Fetch backdrops from backdrop-selection-tool API
    const backdropToolApiUrl = `${BACKDROP_TOOL_URL}/api/backdrops?attendantId=${encodedAttendantId}`;
    
    devLog(`Fetching backdrop options from: ${backdropToolApiUrl}`);
    devLog(`Backdrop tool URL: ${BACKDROP_TOOL_URL}`);
    
    // Create abort controller for timeout (compatible with older Node versions)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    let response;
    try {
      response = await fetch(backdropToolApiUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw fetchError;
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backdrop tool API error: ${response.status} ${response.statusText}`);
      console.error(`Error response: ${errorText}`);
      return NextResponse.json(
        { 
          error: 'Failed to fetch backdrop options from backdrop tool',
          status: response.status,
          details: errorText
        },
        { status: response.status }
      );
    }

    const backdrops = await response.json();

    // Handle case where backdrops is not an array
    if (!Array.isArray(backdrops)) {
      console.error('Invalid response format from backdrop tool:', typeof backdrops);
      return NextResponse.json(
        { 
          error: 'Invalid response format from backdrop tool',
          received: typeof backdrops
        },
        { status: 500 }
      );
    }

    // Filter to only public backdrops and return simplified format
    const publicBackdrops = backdrops
      .filter((backdrop: any) => backdrop.publicStatus === true)
      .map((backdrop: any) => ({
        id: backdrop.id,
        name: backdrop.name,
        description: backdrop.description,
        thumbnailUrl: backdrop.thumbnailUrl,
      }));

    devLog(`Found ${publicBackdrops.length} public backdrops for attendant ${attendantId}`);

    return NextResponse.json({
      success: true,
      backdrops: publicBackdrops,
    });

  } catch (error: any) {
    const authResponse = adminAuthResponse(error);
    if (authResponse) return authResponse;
    console.error('Error fetching backdrop options:', error);
    
    // Handle specific error types
    if (error.name === 'AbortError' || error.name === 'TimeoutError' || error.message === 'Request timeout') {
      return NextResponse.json(
        { 
          error: 'Request timeout - backdrop tool did not respond in time',
          message: 'The backdrop selection tool may be unavailable or slow to respond',
          backdropToolUrl: BACKDROP_TOOL_URL
        },
        { status: 504 }
      );
    }
    
    if (error.code === 'ECONNREFUSED' || error.message?.includes('fetch failed')) {
      return NextResponse.json(
        { 
          error: 'Cannot connect to backdrop selection tool',
          message: `Unable to reach ${BACKDROP_TOOL_URL}. Please check if the backdrop tool is running and the URL is correct.`
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      {
        error: 'Failed to fetch backdrop options',
        message: 'An unexpected error occurred while fetching backdrop options',
      },
      { status: 500 }
    );
  }
}

