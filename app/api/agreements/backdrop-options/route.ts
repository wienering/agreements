import { NextRequest, NextResponse } from 'next/server';

// Get backdrop-selection-tool URL from environment variable or use default
const BACKDROP_TOOL_URL = process.env.BACKDROP_SELECTION_TOOL_URL || process.env.NEXT_PUBLIC_BACKDROP_SELECTION_TOOL_URL || 'http://localhost:3001';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const attendantId = searchParams.get('attendantId');

    if (!attendantId) {
      return NextResponse.json(
        { error: 'attendantId is required' },
        { status: 400 }
      );
    }

    // Fetch backdrops from backdrop-selection-tool API
    const backdropToolApiUrl = `${BACKDROP_TOOL_URL}/api/backdrops?attendantId=${attendantId}`;
    
    const response = await fetch(backdropToolApiUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Backdrop tool API error: ${response.status} ${response.statusText}`);
      return NextResponse.json(
        { error: 'Failed to fetch backdrop options from backdrop tool' },
        { status: response.status }
      );
    }

    const backdrops = await response.json();

    // Filter to only public backdrops and return simplified format
    const publicBackdrops = backdrops
      .filter((backdrop: any) => backdrop.publicStatus === true)
      .map((backdrop: any) => ({
        id: backdrop.id,
        name: backdrop.name,
        description: backdrop.description,
        thumbnailUrl: backdrop.thumbnailUrl,
      }));

    return NextResponse.json({
      success: true,
      backdrops: publicBackdrops,
    });

  } catch (error: any) {
    console.error('Error fetching backdrop options:', error);
    return NextResponse.json(
      { 
        error: 'Failed to fetch backdrop options',
        message: error.message 
      },
      { status: 500 }
    );
  }
}

