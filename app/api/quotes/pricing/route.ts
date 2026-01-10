import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Default pricing configuration
const DEFAULT_PRICING = {
  packages: {
    2: 550,
    3: 750,
    4: 950,
    5: 1150,
    6: 1350
  },
  unlimitedPrints: {
    short: 60,
    long: 50
  },
  glamBooth: 75,
  waitingTime: 50
};

// GET - Fetch current pricing
export async function GET() {
  try {
    const settings = await prisma.settings.findUnique({
      where: { key: 'pricing' }
    });

    if (settings) {
      return NextResponse.json(settings.value);
    }

    // Return default pricing if no saved settings
    return NextResponse.json(DEFAULT_PRICING);
  } catch (error) {
    console.error('Error fetching pricing:', error);
    return NextResponse.json(DEFAULT_PRICING);
  }
}

// POST - Save updated pricing
export async function POST(request: NextRequest) {
  try {
    const pricing = await request.json();

    // Validate pricing structure
    if (!pricing.packages || !pricing.unlimitedPrints || 
        pricing.glamBooth === undefined || pricing.waitingTime === undefined) {
      return NextResponse.json(
        { error: 'Invalid pricing structure' },
        { status: 400 }
      );
    }

    // Upsert the pricing settings
    const settings = await prisma.settings.upsert({
      where: { key: 'pricing' },
      update: { value: pricing },
      create: { key: 'pricing', value: pricing }
    });

    return NextResponse.json({ success: true, pricing: settings.value });
  } catch (error) {
    console.error('Error saving pricing:', error);
    return NextResponse.json(
      { error: 'Failed to save pricing' },
      { status: 500 }
    );
  }
}

