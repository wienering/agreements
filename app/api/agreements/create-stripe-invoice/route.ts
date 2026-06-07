import { NextRequest, NextResponse } from 'next/server';
import { adminAuthResponse, requireAdmin } from '@/lib/requireAdmin';
import { devLog } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import Stripe from 'stripe';

const createInvoiceSchema = z.object({
  agreementId: z.string().min(1, 'Agreement ID is required'),
  invoiceType: z.enum(['default', 'total-only', 'total-minus-deposit', 'custom-amount']).optional().default('default'),
  customAmount: z.number().positive().optional(),
  disableOnlinePayment: z.boolean().optional().default(false),
});

/**
 * Calculate invoice due dates based on event date
 * Rules:
 * - If invoiceType is 'total-only':
 *   - Single invoice for full amount, due 7 days before event date
 *   - If event is less than 7 days away, due today
 * - If invoiceType is 'total-minus-deposit':
 *   - Single invoice for total amount minus $100, due 7 days before event date
 *   - If event is less than 7 days away, due today
 * - If invoiceType is 'custom-amount':
 *   - Single invoice for custom amount, due 7 days before event date
 *   - If event is less than 7 days away, due today
 * - If invoiceType is 'default':
 *   - If event date is > 7 days in the future:
 *     - Deposit: $100 due today
 *     - Remaining amount: due 7 days before event date
 *   - If event date is ≤ 7 days in the future:
 *     - Entire amount: due today
 */
function calculateInvoiceDetails(
  eventDate: Date | null, 
  totalAmount: number, 
  invoiceType: 'default' | 'total-only' | 'total-minus-deposit' | 'custom-amount' = 'default',
  customAmount?: number
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Handle "Total Amount Only" invoice type
  if (invoiceType === 'total-only') {
    if (!eventDate) {
      // No event date - due today
      return {
        depositAmount: 0,
        remainingAmount: totalAmount,
        depositDueDate: today,
        remainingDueDate: today,
        needsTwoInvoices: false,
      };
    }

    // Calculate 7 days before event date
    const event = new Date(eventDate);
    event.setHours(0, 0, 0, 0);
    const remainingDueDate = new Date(event);
    remainingDueDate.setDate(remainingDueDate.getDate() - 7);

    // If due date is in the past or less than 7 days away, use today
    const finalDueDate = remainingDueDate < today ? today : remainingDueDate;

    return {
      depositAmount: 0,
      remainingAmount: totalAmount,
      depositDueDate: finalDueDate,
      remainingDueDate: finalDueDate,
      needsTwoInvoices: false,
    };
  }

  // Handle "Total Amount Minus $100 Deposit" invoice type
  if (invoiceType === 'total-minus-deposit') {
    const invoiceAmount = Math.max(0, totalAmount - 100); // Deduct $100, but don't go below 0
    
    if (!eventDate) {
      // No event date - due today
      return {
        depositAmount: 0,
        remainingAmount: invoiceAmount,
        depositDueDate: today,
        remainingDueDate: today,
        needsTwoInvoices: false,
      };
    }

    // Calculate 7 days before event date
    const event = new Date(eventDate);
    event.setHours(0, 0, 0, 0);
    const remainingDueDate = new Date(event);
    remainingDueDate.setDate(remainingDueDate.getDate() - 7);

    // If due date is in the past or less than 7 days away, use today
    const finalDueDate = remainingDueDate < today ? today : remainingDueDate;

    return {
      depositAmount: 0,
      remainingAmount: invoiceAmount,
      depositDueDate: finalDueDate,
      remainingDueDate: finalDueDate,
      needsTwoInvoices: false,
    };
  }

  // Handle "Custom Amount" invoice type
  if (invoiceType === 'custom-amount') {
    if (customAmount === undefined || customAmount <= 0) {
      throw new Error('Custom amount is required and must be greater than 0');
    }
    
    if (!eventDate) {
      // No event date - due today
      return {
        depositAmount: 0,
        remainingAmount: customAmount,
        depositDueDate: today,
        remainingDueDate: today,
        needsTwoInvoices: false,
      };
    }

    // Calculate 7 days before event date
    const event = new Date(eventDate);
    event.setHours(0, 0, 0, 0);
    const remainingDueDate = new Date(event);
    remainingDueDate.setDate(remainingDueDate.getDate() - 7);

    // If due date is in the past or less than 7 days away, use today
    const finalDueDate = remainingDueDate < today ? today : remainingDueDate;

    return {
      depositAmount: 0,
      remainingAmount: customAmount,
      depositDueDate: finalDueDate,
      remainingDueDate: finalDueDate,
      needsTwoInvoices: false,
    };
  }

  // Default invoice type logic (existing behavior)
  if (!eventDate) {
    // No event date - due today
    return {
      depositAmount: 0,
      remainingAmount: totalAmount,
      depositDueDate: today,
      remainingDueDate: today,
      needsTwoInvoices: false,
    };
  }

  const event = new Date(eventDate);
  event.setHours(0, 0, 0, 0);
  
  const daysUntilEvent = Math.floor((event.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (daysUntilEvent > 7) {
    // Event is more than 7 days away
    // Deposit is $100, but don't exceed the total amount
    const depositAmount = Math.min(100, totalAmount);
    const remainingAmount = totalAmount - depositAmount;
    
    // Calculate 7 days before event date
    const remainingDueDate = new Date(event);
    remainingDueDate.setDate(remainingDueDate.getDate() - 7);
    
    return {
      depositAmount,
      remainingAmount: remainingAmount > 0 ? remainingAmount : 0,
      depositDueDate: today,
      remainingDueDate,
      needsTwoInvoices: remainingAmount > 0, // Only create two invoices if there's a remaining amount
    };
  } else {
    // Event is 7 days or less away - everything due today
    return {
      depositAmount: 0,
      remainingAmount: totalAmount,
      depositDueDate: today,
      remainingDueDate: today,
      needsTwoInvoices: false,
    };
  }
}

export async function POST(request: NextRequest) {
  try {

    await requireAdmin();
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

    // Fetch agreement with client, template, and event information
    const agreement = await prisma.agreement.findUnique({
      where: { id: validatedData.agreementId },
      include: {
        client: true,
        template: true,
        event: true,
      },
    });

    if (!agreement) {
      return NextResponse.json(
        { error: 'Agreement not found' },
        { status: 404 }
      );
    }

    // Validate required fields
    if (!agreement.client.email) {
      return NextResponse.json(
        { error: 'Client email is required to create invoice' },
        { status: 400 }
      );
    }

    // Use event packagePrice if available, otherwise fall back to client packagePrice
    const packagePrice = agreement.event?.packagePrice ?? agreement.client.packagePrice;
    const totalAmount = packagePrice ? Number(packagePrice) : 0;

    if (totalAmount <= 0) {
      return NextResponse.json(
        { error: 'Package price must be greater than 0' },
        { status: 400 }
      );
    }

    // Validate custom amount if invoice type is custom-amount
    if (validatedData.invoiceType === 'custom-amount') {
      if (!validatedData.customAmount || validatedData.customAmount <= 0) {
        return NextResponse.json(
          { error: 'Custom amount is required and must be greater than 0' },
          { status: 400 }
        );
      }
    }

    // Use event eventDate if available, otherwise fall back to client eventDate
    const eventDate = agreement.event?.eventDate ?? agreement.client.eventDate;

    // Calculate invoice details
    const invoiceDetails = calculateInvoiceDetails(
      eventDate ? new Date(eventDate) : null,
      totalAmount,
      validatedData.invoiceType,
      validatedData.customAmount
    );

    const clientName = `${agreement.client.firstName || ''} ${agreement.client.lastName || ''}`.trim() || agreement.client.email;

    // Build package description for invoice items
    // Use event eventPackage if available, otherwise fall back to client eventPackage
    const eventPackage = agreement.event?.eventPackage ?? agreement.client.eventPackage ?? '';
    const baseDescription = eventPackage 
      ? `Photo Booth Rental ${eventPackage}` 
      : 'Photo Booth Rental';
    
    // Prepare event date for supply date (period) if available
    // Use the eventDate we already extracted above (from event or client)
    const periodDates = eventDate ? {
      start: Math.floor(new Date(eventDate).getTime() / 1000),
      end: Math.floor(new Date(eventDate).getTime() / 1000), // Same day for service date
    } : undefined;

    // Format event date for display on invoice
    const formattedEventDate = eventDate 
      ? new Date(eventDate).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })
      : null;

    // Thank you memo
    const thankYouMemo = 'Thanks for choosing Photobooth Guys for your event! We appreciate your business.';

    // Find or create Stripe customer
    let customerId: string;
    
    // Try to find existing customer by email
    const existingCustomers = await stripe.customers.list({
      email: agreement.client.email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customerId = existingCustomers.data[0].id;
    } else {
      // Create new customer
      const customer = await stripe.customers.create({
        email: agreement.client.email,
        name: clientName,
        metadata: {
          agreementId: agreement.id,
          clientId: agreement.client.id,
        },
      });
      customerId = customer.id;
    }

    const invoiceResults: Array<{
      type: 'deposit' | 'full' | 'remaining';
      invoiceId: string;
      amount: number;
      dueDate: Date;
      invoiceUrl: string;
    }> = [];

    // Create deposit invoice if needed
    if (invoiceDetails.needsTwoInvoices && invoiceDetails.depositAmount > 0) {
      const today = new Date();
      today.setHours(23, 59, 59, 999); // End of today
      
      const depositInvoice = await stripe.invoices.create({
        customer: customerId,
        collection_method: 'send_invoice',
        due_date: Math.floor(today.getTime() / 1000), // Unix timestamp
        description: `Deposit for ${clientName}${formattedEventDate ? `\nEvent Date: ${formattedEventDate}` : ''}`,
        footer: thankYouMemo,
        payment_settings: validatedData.disableOnlinePayment ? {
          payment_method_types: [], // Disable all payment methods
        } : undefined,
        metadata: {
          agreementId: agreement.id,
          invoiceType: 'deposit',
        },
      });

      // Add line item for deposit
      await stripe.invoiceItems.create({
        customer: customerId,
        invoice: depositInvoice.id,
        amount: Math.round(invoiceDetails.depositAmount * 100), // Convert to cents
        description: `${baseDescription} Deposit`,
        period: periodDates,
      });

      // Finalize the invoice
      const finalizedInvoice = await stripe.invoices.finalizeInvoice(depositInvoice.id);
      
      // Send the invoice
      await stripe.invoices.sendInvoice(finalizedInvoice.id);

      invoiceResults.push({
        type: 'deposit',
        invoiceId: finalizedInvoice.id,
        amount: invoiceDetails.depositAmount,
        dueDate: invoiceDetails.depositDueDate,
        invoiceUrl: finalizedInvoice.hosted_invoice_url || finalizedInvoice.invoice_pdf || '',
      });
    }

    // Create remaining amount invoice or full invoice
    // Always use remainingAmount as it's correctly calculated for all invoice types
    const remainingOrFullAmount = invoiceDetails.remainingAmount;

    if (remainingOrFullAmount > 0) {
      // Use the calculated due date
      const remainingDueDate = new Date(invoiceDetails.remainingDueDate);
      remainingDueDate.setHours(23, 59, 59, 999); // End of due day
      const dueDateTimestamp = Math.floor(remainingDueDate.getTime() / 1000);

      const remainingInvoice = await stripe.invoices.create({
        customer: customerId,
        collection_method: 'send_invoice',
        due_date: dueDateTimestamp, // Unix timestamp
        description: invoiceDetails.needsTwoInvoices 
          ? `Remaining balance for ${clientName}${formattedEventDate ? `\nEvent Date: ${formattedEventDate}` : ''}`
          : `Invoice for ${clientName}${formattedEventDate ? `\nEvent Date: ${formattedEventDate}` : ''}`,
        footer: thankYouMemo,
        payment_settings: validatedData.disableOnlinePayment ? {
          payment_method_types: [], // Disable all payment methods
        } : undefined,
        metadata: {
          agreementId: agreement.id,
          invoiceType: invoiceDetails.needsTwoInvoices ? 'remaining' : 'full',
        },
      });

      // Add line item
      await stripe.invoiceItems.create({
        customer: customerId,
        invoice: remainingInvoice.id,
        amount: Math.round(remainingOrFullAmount * 100), // Convert to cents
        description: invoiceDetails.needsTwoInvoices 
          ? `${baseDescription} Balance`
          : baseDescription,
        period: periodDates,
      });

      // Finalize the invoice
      const finalizedInvoice = await stripe.invoices.finalizeInvoice(remainingInvoice.id);
      
      // Send the invoice
      await stripe.invoices.sendInvoice(finalizedInvoice.id);

      invoiceResults.push({
        type: invoiceDetails.needsTwoInvoices ? 'remaining' : 'full',
        invoiceId: finalizedInvoice.id,
        amount: remainingOrFullAmount,
        dueDate: remainingDueDate,
        invoiceUrl: finalizedInvoice.hosted_invoice_url || finalizedInvoice.invoice_pdf || '',
      });
    }

    // Update agreement with invoice information
    // Store the first invoice URL as the payment link (usually the deposit if exists)
    const primaryInvoiceUrl = invoiceResults[0]?.invoiceUrl || '';
    const allInvoiceUrls = invoiceResults.map(r => r.invoiceUrl).filter(Boolean).join(', ');

    await prisma.agreement.update({
      where: { id: validatedData.agreementId },
      data: {
        stripePaymentLink: primaryInvoiceUrl || agreement.stripePaymentLink,
        paymentStatus: 'Invoice issued', // Sent to client; follow-up statuses come from Stripe webhooks or manual edits
        // Store additional invoice info in a JSON format if needed
        // For now, we'll store the primary URL
      },
    });

    devLog(`Created ${invoiceResults.length} invoice(s) for agreement ${agreement.id}`);

    return NextResponse.json({
      success: true,
      customerId,
      invoices: invoiceResults,
      agreementId: agreement.id,
      message: `Successfully created ${invoiceResults.length} invoice(s)`,
    });

  } catch (error: any) {
    console.error('Error creating Stripe invoice:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: error.errors,
        },
        { status: 400 }
      );
    }

    // Handle Stripe-specific errors
    if (error.type === 'StripeInvalidRequestError') {
      return NextResponse.json(
        {
          error: 'Stripe API error',
          message: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: 'Failed to create invoice',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

