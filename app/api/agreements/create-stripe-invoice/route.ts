import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { z } from 'zod';
import { formatZodDetails } from '@/lib/handleApiError';
import Stripe from 'stripe';
import { createEventInvoice, createInvoiceSchema } from '@/lib/stripe/eventInvoice';

export async function POST(request: NextRequest) {
  try {

    await requireAdmin(request);
    // Check if Stripe API key is configured
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey) {
      return NextResponse.json(
        { error: 'Stripe API key is not configured. Please set STRIPE_SECRET_KEY environment variable.' },
        { status: 500 }
      );
    }

    // Initialize Stripe (using default API version for compatibility)
    const stripe = new Stripe(stripeSecretKey);

    const body = await request.json();
    const validatedData = createInvoiceSchema.parse(body);

    const result = await createEventInvoice(stripe, validatedData);
    return NextResponse.json(result.body, { status: result.httpStatus });


  } catch (error: any) {
    const authResponse = adminAuthResponse(error);
    if (authResponse) return authResponse;
    console.error('Error creating Stripe invoice:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: formatZodDetails(error),
        },
        { status: 400 }
      );
    }

    // Handle Stripe-specific errors
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        {
          error: 'Stripe API error',
          message: 'The Stripe request was invalid. Check the agreement and billing details.',
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to create invoice',
        message: 'Unable to create the invoice. Please try again or contact support.',
      },
      { status: 500 }
    );
  }
}


