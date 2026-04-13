import { NextRequest, NextResponse } from 'next/server';
import jsPDF from 'jspdf';

type NormalizedPackage =
  | { kind: 'standard'; hours: number; price: number }
  | { kind: 'custom'; title: string; description: string; price: number };

function normalizePackage(raw: unknown): NormalizedPackage | null {
  if (!raw || typeof raw !== 'object') return null;
  const p = raw as Record<string, unknown>;
  const price = typeof p.price === 'number' ? p.price : parseFloat(String(p.price));
  if (Number.isNaN(price)) return null;

  if (p.kind === 'custom') {
    const title = typeof p.title === 'string' ? p.title.trim() : '';
    if (!title) return null;
    const description = typeof p.description === 'string' ? p.description : '';
    return { kind: 'custom', title, description: description.trim(), price };
  }

  const hours = typeof p.hours === 'number' ? p.hours : parseInt(String(p.hours), 10);
  if (!Number.isFinite(hours) || hours <= 0) return null;
  return { kind: 'standard', hours, price };
}

export async function POST(request: NextRequest) {
  try {
    const quoteData = await request.json();

    const packageInfo: NormalizedPackage | null = normalizePackage(quoteData.package);

    // Validate required fields
    if (!quoteData.contactInfo || !packageInfo || quoteData.total === undefined || quoteData.total === null) {
      return NextResponse.json(
        { error: 'Missing required quote data' },
        { status: 400 }
      );
    }

    const { contactInfo, addons, discount, subtotal, total } = quoteData;

    // Create PDF using jsPDF
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const margin = 15;
    const maxWidth = pageWidth - (margin * 2);
    let yPosition = 15;

    // Color scheme
    const darkGray = [51, 51, 51]; // #333333
    const blue = [59, 130, 246]; // #3B82F6 - vibrant blue
    const lightGray = [156, 163, 175]; // #9CA3AF
    const white = [255, 255, 255];

    // Helper function to draw rounded rectangle (rounded left corners only)
    // Creates smooth rounded corners on the left side using overlapping shapes
    const drawRoundedRectLeft = (x: number, y: number, w: number, h: number, r: number) => {
      doc.setFillColor(darkGray[0], darkGray[1], darkGray[2]);
      // Draw main rectangle (starting from rounded corner position)
      doc.rect(x + r, y, w - r, h, 'F');
      // Draw left side rectangle (vertical bar)
      doc.rect(x, y + r, r, h - (2 * r), 'F');
      // Draw top-left rounded corner (quarter circle)
      doc.circle(x + r, y + r, r, 'F');
      // Draw bottom-left rounded corner (quarter circle)
      doc.circle(x + r, y + h - r, r, 'F');
    };

    // Helper function to draw rounded rectangle with blue fill (rounded left corners only)
    const drawRoundedRectBlue = (x: number, y: number, w: number, h: number, r: number) => {
      doc.setFillColor(blue[0], blue[1], blue[2]);
      // Draw main rectangle (starting from rounded corner position)
      doc.rect(x + r, y, w - r, h, 'F');
      // Draw left side rectangle (vertical bar)
      doc.rect(x, y + r, r, h - (2 * r), 'F');
      // Draw top-left rounded corner (quarter circle)
      doc.circle(x + r, y + r, r, 'F');
      // Draw bottom-left rounded corner (quarter circle)
      doc.circle(x + r, y + h - r, r, 'F');
    };

    // Dark gray header bar at top (taller to fit contact info)
    doc.setFillColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.rect(0, 0, pageWidth, 50, 'F');

    // Company branding on left (in header) with contact info
    doc.setTextColor(blue[0], blue[1], blue[2]);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('Photobooth Guys', margin, 20);

    doc.setTextColor(lightGray[0], lightGray[1], lightGray[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Professional Photo Booth Rental Toronto', margin, 28);
    
    // Contact info below company name
    doc.setTextColor(white[0], white[1], white[2]);
    doc.setFontSize(9);
    doc.text('647-378-5332', margin, 35);
    doc.text('info@photoboothguys.ca', margin, 39);
    doc.text('www.photoboothguys.ca', margin, 43);

    const contactInfoX = pageWidth - margin;

    // Blue "Quote" banner on right (with rounded left corners)
    const bannerWidth = 35;
    const bannerHeight = 15;
    const bannerX = pageWidth - margin - bannerWidth;
    const bannerY = 12;
    const borderRadius = 3;
    
    // Draw rounded rectangle for banner (rounded left corners)
    drawRoundedRectBlue(bannerX, bannerY, bannerWidth, bannerHeight, borderRadius);
    
    doc.setTextColor(white[0], white[1], white[2]);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Quote', bannerX + bannerWidth / 2, bannerY + bannerHeight / 2 + 3, { align: 'center' });

    yPosition = 60;

    // Quote date in top right (where invoice details would be)
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Quote Date:', contactInfoX, yPosition, { align: 'right' });
    
    doc.setFont('helvetica', 'normal');
    const quoteDate = new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
    doc.text(quoteDate, contactInfoX, yPosition + 5, { align: 'right' });

    yPosition += 20;

    // "Quote To:" section
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.text('Quote To:', margin, yPosition);

    yPosition += 8;

    // Client name (bold, larger) - Title Case
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    const clientName = contactInfo.name || '';
    const titleCaseName = clientName.toLowerCase().replace(/\b\w/g, (l: string) => l.toUpperCase());
    doc.text(titleCaseName, margin, yPosition);

    yPosition += 8;

    // Client contact details
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    if (contactInfo.phone) {
      doc.text(`Phone : ${contactInfo.phone}`, margin, yPosition);
      yPosition += 5;
    }
    if (contactInfo.email) {
      doc.text(`Email : ${contactInfo.email}`, margin, yPosition);
      yPosition += 5;
    }
    if (contactInfo.eventDate) {
      doc.text(`Event Date : ${contactInfo.eventDate}`, margin, yPosition);
      yPosition += 5;
    }

    yPosition += 15;

    // Table header with rounded left corners
    const tableHeaderHeight = 10;
    const descColWidth = 100;
    const priceColWidth = 35;
    const qtyColWidth = 25;
    const totalColWidth = 35;

    // Item Description header (dark gray with rounded left corners)
    drawRoundedRectLeft(margin, yPosition, descColWidth, tableHeaderHeight, borderRadius);
    doc.setTextColor(white[0], white[1], white[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Item Description', margin + 5, yPosition + 7);

    // Unit Price header (blue)
    doc.setFillColor(blue[0], blue[1], blue[2]);
    doc.rect(margin + descColWidth, yPosition, priceColWidth, tableHeaderHeight, 'F');
    doc.text('Unit Price', margin + descColWidth + priceColWidth / 2, yPosition + 7, { align: 'center' });

    // Quantity header (blue) - ensure it has blue background
    doc.setFillColor(blue[0], blue[1], blue[2]);
    doc.rect(margin + descColWidth + priceColWidth, yPosition, qtyColWidth, tableHeaderHeight, 'F');
    doc.setTextColor(white[0], white[1], white[2]);
    doc.text('Qty', margin + descColWidth + priceColWidth + qtyColWidth / 2, yPosition + 7, { align: 'center' });

    // Total/Price header (blue) - ensure it has blue background
    doc.setFillColor(blue[0], blue[1], blue[2]);
    doc.rect(margin + descColWidth + priceColWidth + qtyColWidth, yPosition, totalColWidth, tableHeaderHeight, 'F');
    doc.text('Price', margin + descColWidth + priceColWidth + qtyColWidth + totalColWidth / 2, yPosition + 7, { align: 'center' });

    yPosition += tableHeaderHeight + 2;

    // Table rows
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.2);

    // Base package row (variable height for custom description)
    const descMaxW = descColWidth - 10;
    const lineGap = 4.5;
    const rowHeight = 8;
    let baseRowHeight = rowHeight;

    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    let priceY = yPosition + 5;

    if (packageInfo.kind === 'standard') {
      doc.text(`${packageInfo.hours} Hour Photo Booth Package`, margin + 5, yPosition + 5);
    } else {
      let lineY = yPosition + 5;
      let lineCount = 0;
      doc.setFont('helvetica', 'bold');
      const titleLines = doc.splitTextToSize(packageInfo.title, descMaxW);
      titleLines.forEach((line: string) => {
        doc.text(line, margin + 5, lineY);
        lineY += lineGap;
        lineCount += 1;
      });
      doc.setFont('helvetica', 'normal');
      if (packageInfo.description?.trim()) {
        doc.setFontSize(8);
        const bodyLines = doc.splitTextToSize(packageInfo.description.trim(), descMaxW);
        bodyLines.forEach((line: string) => {
          doc.text(line, margin + 5, lineY);
          lineY += lineGap - 0.5;
          lineCount += 1;
        });
        doc.setFontSize(9);
      }
      baseRowHeight = Math.max(rowHeight, 4 + lineCount * lineGap);
      priceY = yPosition + Math.min(5, baseRowHeight / 2);
    }

    doc.text(`$${packageInfo.price.toFixed(2)}`, margin + descColWidth + priceColWidth / 2, priceY, { align: 'center' });
    doc.text('1', margin + descColWidth + priceColWidth + qtyColWidth / 2, priceY, { align: 'center' });
    doc.text(`$${packageInfo.price.toFixed(2)}`, margin + descColWidth + priceColWidth + qtyColWidth + totalColWidth / 2, priceY, { align: 'center' });
    
    doc.line(margin, yPosition + baseRowHeight, margin + descColWidth + priceColWidth + qtyColWidth + totalColWidth, yPosition + baseRowHeight);
    yPosition += baseRowHeight + 2;

    // Add-ons rows
    if (addons?.unlimitedPrints && packageInfo.kind === 'standard') {
      const isShortPackage = packageInfo.hours <= 3;
      const ratePerHour = isShortPackage ? 60 : 50;
      const unlimitedPrintsPrice = ratePerHour * packageInfo.hours;
      
      // Draw text (all on white background)
      doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
      doc.text('Unlimited Prints', margin + 5, yPosition + 5);
      doc.text(`$${unlimitedPrintsPrice.toFixed(2)}`, margin + descColWidth + priceColWidth / 2, yPosition + 5, { align: 'center' });
      doc.text('1', margin + descColWidth + priceColWidth + qtyColWidth / 2, yPosition + 5, { align: 'center' });
      doc.text(`$${unlimitedPrintsPrice.toFixed(2)}`, margin + descColWidth + priceColWidth + qtyColWidth + totalColWidth / 2, yPosition + 5, { align: 'center' });
      
      doc.line(margin, yPosition + rowHeight, margin + descColWidth + priceColWidth + qtyColWidth + totalColWidth, yPosition + rowHeight);
      yPosition += rowHeight + 2;
    }

    if (addons?.glamBooth) {
      // Draw text (all on white background)
      doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
      doc.text('Glam Booth', margin + 5, yPosition + 5);
      doc.text('$75.00', margin + descColWidth + priceColWidth / 2, yPosition + 5, { align: 'center' });
      doc.text('1', margin + descColWidth + priceColWidth + qtyColWidth / 2, yPosition + 5, { align: 'center' });
      doc.text('$75.00', margin + descColWidth + priceColWidth + qtyColWidth + totalColWidth / 2, yPosition + 5, { align: 'center' });
      
      doc.line(margin, yPosition + rowHeight, margin + descColWidth + priceColWidth + qtyColWidth + totalColWidth, yPosition + rowHeight);
      yPosition += rowHeight + 2;
    }

    if (addons?.waitingTime && addons.waitingHours > 0) {
      const waitingTimePrice = 50 * addons.waitingHours;
      const hoursText = addons.waitingHours === 1 ? 'hour' : 'hours';
      
      // Draw text (all on white background)
      doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
      doc.text(`Waiting Time (${addons.waitingHours} ${hoursText})`, margin + 5, yPosition + 5);
      doc.text(`$${waitingTimePrice.toFixed(2)}`, margin + descColWidth + priceColWidth / 2, yPosition + 5, { align: 'center' });
      doc.text('1', margin + descColWidth + priceColWidth + qtyColWidth / 2, yPosition + 5, { align: 'center' });
      doc.text(`$${waitingTimePrice.toFixed(2)}`, margin + descColWidth + priceColWidth + qtyColWidth + totalColWidth / 2, yPosition + 5, { align: 'center' });
      
      doc.line(margin, yPosition + rowHeight, margin + descColWidth + priceColWidth + qtyColWidth + totalColWidth, yPosition + rowHeight);
      yPosition += rowHeight + 2;
    }

    // Discount row (if applicable)
    if (discount && discount.amount > 0) {
      // Show subtotal first
      yPosition += 5;
      doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
      doc.setFont('helvetica', 'bold');
      doc.text('Subtotal', margin + 5, yPosition + 5);
      doc.text(`$${subtotal.toFixed(2)}`, margin + descColWidth + priceColWidth + qtyColWidth + totalColWidth / 2, yPosition + 5, { align: 'center' });
      yPosition += rowHeight + 2;

      // Discount row in red
      const red = [220, 38, 38]; // #dc2626
      doc.setTextColor(red[0], red[1], red[2]);
      doc.setFont('helvetica', 'normal');
      const discountLabel = discount.note ? `Discount (${discount.note})` : 'Discount';
      doc.text(discountLabel, margin + 5, yPosition + 5);
      doc.text(`-$${discount.amount.toFixed(2)}`, margin + descColWidth + priceColWidth + qtyColWidth + totalColWidth / 2, yPosition + 5, { align: 'center' });
      
      doc.line(margin, yPosition + rowHeight, margin + descColWidth + priceColWidth + qtyColWidth + totalColWidth, yPosition + rowHeight);
      yPosition += rowHeight + 2;
    }

    yPosition += 10;

    // Total in blue banner (with rounded left corners)
    const totalBannerHeight = 15;
    const totalBannerWidth = descColWidth + priceColWidth + qtyColWidth + totalColWidth;
    drawRoundedRectBlue(margin, yPosition, totalBannerWidth, totalBannerHeight, borderRadius);
    
    doc.setTextColor(white[0], white[1], white[2]);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Total', margin + 10, yPosition + totalBannerHeight / 2 + 4);
    doc.text(`$${total.toFixed(2)}`, margin + totalBannerWidth - 10, yPosition + totalBannerHeight / 2 + 4, { align: 'right' });

    yPosition += totalBannerHeight + 20;

    // Bottom section - left side
    const bottomY = yPosition;
    
    // "Thank you" memo in dark gray banner (wider, rounded corners, Title Case)
    const memoWidth = 140; // Wider to fit on one line
    const memoHeight = 12;
    drawRoundedRectLeft(margin, bottomY, memoWidth, memoHeight, borderRadius);
    
    doc.setTextColor(white[0], white[1], white[2]);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    // Title Case the text
    const thankYouText = 'Thank You For Considering Photobooth Guys For Your Event.';
    doc.text(thankYouText, margin + memoWidth / 2, bottomY + memoHeight / 2 + 3, { align: 'center' });

    // Terms & Conditions below memo
    yPosition = bottomY + memoHeight + 10;
    doc.setTextColor(darkGray[0], darkGray[1], darkGray[2]);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Terms & Conditions:', margin, yPosition);
    
    yPosition += 6;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const terms = [
      'A $100 retainer fee is required to secure your booking.',
      'Balance due 7 days before event.',
      'Quote valid for 30 days from date of issue.',
      'Attendant will arrive 1 hour before the start time for set up.'
    ];
    
    terms.forEach((term) => {
      doc.text(term, margin, yPosition, { maxWidth: memoWidth });
      yPosition += 5;
    });

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

    // Return PDF
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="quote-${contactInfo.name?.replace(/\s+/g, '-') || 'quote'}-${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
