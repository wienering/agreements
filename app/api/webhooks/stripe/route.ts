import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!stripeSecretKey) {
    console.error('Stripe secret key not configured');
    return NextResponse.json(
      { error: 'Stripe secret key not configured' },
      { status: 500 }
    );
  }

  if (!webhookSecret) {
    console.error('Stripe webhook secret not configured');
    return NextResponse.json(
      { error: 'Stripe webhook secret not configured' },
      { status: 500 }
    );
  }

  const stripe = new Stripe(stripeSecretKey);

  // Get raw body for signature verification
  let body: string;
  try {
    body = await request.text();
  } catch (error) {
    console.error('Error reading request body:', error);
    return NextResponse.json(
      { error: 'Error reading request body' },
      { status: 400 }
    );
  }

  // Get the signature from headers
  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    console.error('Missing stripe-signature header');
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    // Verify webhook signature
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${err.message}` },
      { status: 400 }
    );
  }

  // Log the event type for debugging
  console.log(`Received Stripe webhook event: ${event.type}`);

  try {
    // Handle invoice payment events
    if (event.type === 'invoice.paid' || event.type === 'invoice.payment_succeeded') {
      const invoice = event.data.object as Stripe.Invoice;

      // Extract agreementId from invoice metadata
      const agreementId = invoice.metadata?.agreementId;
      const invoiceType = invoice.metadata?.invoiceType as 'deposit' | 'remaining' | 'full' | undefined;

      if (!agreementId) {
        console.warn('Invoice paid but no agreementId in metadata:', invoice.id);
        // Return success to prevent Stripe from retrying
        return NextResponse.json({ received: true, message: 'No agreementId in metadata' });
      }

      console.log(`Processing payment for agreement ${agreementId}, invoice type: ${invoiceType}`);

      // Find the agreement
      const agreement = await prisma.agreement.findUnique({
        where: { id: agreementId },
        include: {
          client: true,
        },
      });

      if (!agreement) {
        console.error(`Agreement not found: ${agreementId}`);
        // Return success to prevent Stripe from retrying
        return NextResponse.json({ received: true, message: 'Agreement not found' });
      }

      // Get receipt URL from invoice
      const receiptUrl = invoice.hosted_invoice_url || invoice.invoice_pdf || null;

      // Determine new payment status based on invoice type and current status
      let newPaymentStatus: string;
      const currentPaymentStatus = agreement.paymentStatus || 'Not Paid';

      if (invoiceType === 'deposit') {
        // Deposit invoice paid
        newPaymentStatus = 'Deposit Paid';
      } else if (invoiceType === 'remaining') {
        // Remaining balance invoice paid
        // Check if deposit was already paid
        if (currentPaymentStatus === 'Deposit Paid') {
          newPaymentStatus = 'Fully Paid';
        } else {
          newPaymentStatus = 'Balance Paid';
        }
      } else if (invoiceType === 'full') {
        // Full invoice paid (single invoice for entire amount)
        newPaymentStatus = 'Fully Paid';
      } else {
        // Unknown invoice type, default to "Paid"
        console.warn(`Unknown invoice type: ${invoiceType}, defaulting to "Paid"`);
        newPaymentStatus = 'Paid';
      }

      // Prepare update data
      const updateData: any = {
        paymentStatus: newPaymentStatus,
      };

      // Update receipt link if available
      if (receiptUrl) {
        updateData.stripeReceiptLink = receiptUrl;
      }

      // Update the agreement
      await prisma.agreement.update({
        where: { id: agreementId },
        data: updateData,
      });

      console.log(`Updated agreement ${agreementId}: paymentStatus = ${newPaymentStatus}`);

      return NextResponse.json({
        received: true,
        agreementId,
        paymentStatus: newPaymentStatus,
        invoiceType,
      });
    }

    // Handle other event types (log but don't process)
    console.log(`Unhandled event type: ${event.type}`);
    return NextResponse.json({ received: true, message: `Unhandled event type: ${event.type}` });

  } catch (error: any) {
    console.error('Error processing webhook event:', error);
    return NextResponse.json(
      {
        error: 'Error processing webhook event',
        message: error.message,
      },
      { status: 500 }
    );
  }
}

// Handle GET requests (for webhook endpoint verification/testing)
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Stripe webhook endpoint is active',
    endpoint: '/api/webhooks/stripe',
    method: 'POST',
    events: ['invoice.paid', 'invoice.payment_succeeded'],
  });
}

