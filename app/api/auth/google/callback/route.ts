import { NextRequest, NextResponse } from 'next/server';

/**
 * OAuth callback endpoint for Google Drive
 * This is used during the initial setup to get the refresh token
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.json({ error }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: 'No authorization code provided' }, { status: 400 });
  }

  // Return the code to the user (they'll need to exchange it for tokens manually)
  return NextResponse.json({
    message: 'Authorization successful!',
    code: code,
    instructions: 'Use this code with the generate-refresh-token script to get your refresh token.',
  });
}

